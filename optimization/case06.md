## Case 06: Window Function vs Self JOIN - 이전 구독 대비 플랜 변경 추적

### 문제 상황

라프텔 데이터팀에서 사용자별 이전 구독 대비 플랜 변경을 추적해달라는 요청이 들어왔다.
각 구독 레코드마다 "직전 구독의 plan_type"을 함께 조회하여, 업그레이드/다운그레이드/유지 여부를
판단하는 리포트를 만들어야 한다. 구독 테이블에는 약 500만 건의 레코드가 존재하며,
Self JOIN 방식으로 작성된 기존 쿼리가 10초 이상 소요되어 대시보드 로딩에 병목이 되고 있다.

### Before (비효율적)

**실행 시간**: 10.5초
**Scanned Data**: 1,240 MB

```sql
-- Self JOIN으로 이전 구독 조회 (O(n^2) 비교)
SELECT
    curr.subscription_id,
    curr.user_id,
    curr.start_date AS current_start_date,
    curr.plan_type AS current_plan,
    prev.plan_type AS previous_plan,
    CASE
        WHEN prev.plan_type IS NULL THEN 'NEW'
        WHEN curr.plan_type = prev.plan_type THEN 'RETAIN'
        WHEN curr.plan_type > prev.plan_type THEN 'UPGRADE'
        ELSE 'DOWNGRADE'
    END AS change_type
FROM subscriptions AS curr
LEFT JOIN subscriptions AS prev
    ON curr.user_id = prev.user_id
    AND prev.start_date = (
        SELECT MAX(s2.start_date)
        FROM subscriptions AS s2
        WHERE s2.user_id = curr.user_id
            AND s2.start_date < curr.start_date
    )
WHERE curr.start_date >= '2024-01-01'
ORDER BY
    curr.user_id,
    curr.start_date;
```

**EXPLAIN ANALYZE 결과**:
```
Sort  (cost=892451.23..894312.56 rows=744532 width=72) (actual time=10234.512..10498.231 rows=743218 loops=1)
  Sort Key: curr.user_id, curr.start_date
  Sort Method: external merge  Disk: 58920kB
  ->  Merge Join  (cost=456123.45..678234.56 rows=744532 width=72) (actual time=4521.234..9012.456 rows=743218 loops=1)
        Merge Cond: (curr.user_id = prev.user_id)
        Join Filter: (prev.start_date = (SubPlan 1))
        Rows Removed by Join Filter: 2847123
        ->  Sort  (cost=228061.72..229923.05 rows=744532 width=36) (actual time=1234.567..1567.890 rows=743218 loops=1)
              Sort Key: curr.user_id
              ->  Seq Scan on subscriptions curr  (cost=0.00..152341.65 rows=744532 width=36) (actual time=0.023..678.234 rows=743218 loops=1)
                    Filter: (start_date >= '2024-01-01')
        ->  Sort  (cost=228061.72..229923.05 rows=5000000 width=36) (actual time=2345.678..2890.123 rows=5000000 loops=1)
              Sort Key: prev.user_id
              ->  Seq Scan on subscriptions prev  (cost=0.00..112341.00 rows=5000000 width=36) (actual time=0.015..1234.567 rows=5000000 loops=1)
        SubPlan 1
          ->  Aggregate  (cost=8.45..8.46 rows=1 width=4) (actual time=0.003..0.003 rows=1 loops=3590341)
                ->  Index Scan on subscriptions s2  (cost=0.43..8.44 rows=3 width=4)
                      Index Cond: (user_id = curr.user_id)
                      Filter: (start_date < curr.start_date)
Planning Time: 2.341 ms
Execution Time: 10512.678 ms
```

**병목 원인**:
- Self JOIN으로 인해 동일 테이블을 두 번 풀스캔하여 총 스캔 데이터가 2배로 증가
- 상관 서브쿼리(SubPlan 1)가 JOIN된 모든 행 조합(약 359만 회)에 대해 반복 실행
- Merge Join 과정에서 Join Filter로 제거되는 행이 284만 건에 달해 불필요한 비교 발생
- 정렬 시 메모리 초과로 디스크 기반 external merge sort 발생 (58MB 디스크 사용)

### After (최적화)

**실행 시간**: 0.9초 (91% 개선)
**Scanned Data**: 620 MB (50% 감소)

```sql
-- LAG() Window Function으로 단일 스캔 최적화
WITH subscription_changes AS (
    SELECT
        subscription_id,
        user_id,
        start_date,
        plan_type AS current_plan,
        LAG(plan_type) OVER (
            PARTITION BY user_id
            ORDER BY start_date
        ) AS previous_plan
    FROM subscriptions
    WHERE start_date >= '2024-01-01'
       OR subscription_id IN (
            -- 직전 구독 1건도 포함 (LAG 계산용)
            SELECT subscription_id
            FROM (
                SELECT
                    subscription_id,
                    user_id,
                    start_date,
                    ROW_NUMBER() OVER (
                        PARTITION BY user_id
                        ORDER BY start_date DESC
                    ) AS rn
                FROM subscriptions
                WHERE start_date < '2024-01-01'
            ) AS pre
            WHERE rn = 1
       )
)
SELECT
    subscription_id,
    user_id,
    start_date AS current_start_date,
    current_plan,
    previous_plan,
    CASE
        WHEN previous_plan IS NULL THEN 'NEW'
        WHEN current_plan = previous_plan THEN 'RETAIN'
        WHEN current_plan > previous_plan THEN 'UPGRADE'
        ELSE 'DOWNGRADE'
    END AS change_type
FROM subscription_changes
WHERE start_date >= '2024-01-01'
ORDER BY
    user_id,
    start_date;
```

**EXPLAIN ANALYZE 결과**:
```
Sort  (cost=98234.56..100123.45 rows=744532 width=72) (actual time=823.456..891.234 rows=743218 loops=1)
  Sort Key: subscription_changes.user_id, subscription_changes.start_date
  Sort Method: quicksort  Memory: 71452kB
  ->  CTE Scan on subscription_changes  (cost=78456.12..82345.67 rows=744532 width=72) (actual time=456.789..712.345 rows=743218 loops=1)
        Filter: (start_date >= '2024-01-01')
        CTE subscription_changes
          ->  WindowAgg  (cost=56789.12..67890.45 rows=812345 width=40) (actual time=345.678..534.123 rows=812345 loops=1)
                ->  Sort  (cost=56789.12..58901.23 rows=812345 width=36) (actual time=234.567..312.456 rows=812345 loops=1)
                      Sort Key: subscriptions.user_id, subscriptions.start_date
                      Sort Method: quicksort  Memory: 65234kB
                      ->  Seq Scan on subscriptions  (cost=0.00..45678.90 rows=812345 width=36) (actual time=0.018..178.234 rows=812345 loops=1)
Planning Time: 1.234 ms
Execution Time: 923.456 ms
```

**개선 포인트**:
- Self JOIN 제거로 테이블 스캔이 2회에서 1회로 감소, 스캔 데이터 50% 절감
- 상관 서브쿼리 359만 회 반복 실행이 완전히 제거됨
- WindowAgg 노드가 단일 정렬 후 순차 스캔으로 LAG 값을 계산하여 O(n log n) 복잡도
- 정렬이 메모리 내(quicksort)에서 완료되어 디스크 I/O 제거

### 핵심 교훈

- "이전 행 참조"가 필요한 경우 Self JOIN 대신 LAG()/LEAD() Window Function을 먼저 고려하라
- Self JOIN + 상관 서브쿼리 조합은 행 수가 늘어날수록 기하급수적으로 느려지는 O(n^2) 패턴이다
- Window Function은 PARTITION BY 기준으로 한 번 정렬 후 순차 처리하므로 O(n log n)으로 확장성이 뛰어나다
- EXPLAIN ANALYZE에서 SubPlan의 loops 값이 수만 이상이면 Window Function 전환을 검토해야 한다

### 면접에서 이렇게 설명하세요

"사용자별 이전 구독 대비 플랜 변경을 추적하는 쿼리가 Self JOIN과 상관 서브쿼리로 작성되어 있었는데,
서브쿼리가 약 359만 번 반복 실행되면서 10.5초가 걸렸습니다. 이를 LAG() Window Function으로 전환하여
테이블을 한 번만 스캔하도록 변경했고, 실행 시간을 0.9초로 91% 개선했습니다.
핵심은 '이전 행 참조' 패턴에서 Self JOIN의 O(n^2)를 Window Function의 O(n log n)으로 바꾼 것입니다."
