## Case 08: EXISTS vs IN - 주문 이력 있는 사용자 조회 최적화

### 문제 상황

토스 데이터팀에서 주문 이력이 있는 사용자만 추출하여 푸시 알림 대상 리스트를 만들어야 한다는 요청이 들어왔다.
사용자 테이블은 약 1,000만 건, 주문 테이블은 약 5,000만 건 규모이다.
기존 쿼리는 WHERE user_id IN (SELECT ...) 방식을 사용하고 있었는데, IN절의 서브쿼리가
주문 테이블에서 고유 user_id 전체를 메모리에 로드한 뒤 Hash 비교를 수행하여 메모리 사용량이 과도하고
실행 시간이 7초 이상 소요되고 있었다.

### Before (비효율적)

**실행 시간**: 7.3초
**Scanned Data**: 2,450 MB

```sql
-- IN 서브쿼리: 주문 테이블의 모든 user_id를 메모리에 로드
SELECT
    u.user_id,
    u.signup_date,
    u.region,
    u.user_segment
FROM users AS u
WHERE u.region = 'KR'
    AND u.user_id IN (
        SELECT o.user_id
        FROM orders AS o
        WHERE o.order_date >= '2024-01-01'
            AND o.status = 'completed'
    );
```

**EXPLAIN ANALYZE 결과**:
```
Hash Join  (cost=456789.01..678901.23 rows=345678 width=44) (actual time=5678.901..7234.567 rows=342156 loops=1)
  Hash Cond: (u.user_id = o.user_id)
  ->  Seq Scan on users u  (cost=0.00..189012.34 rows=4500000 width=44) (actual time=0.023..890.123 rows=4500000 loops=1)
        Filter: (region = 'KR')
        Rows Removed by Filter: 5500000
  ->  Hash  (cost=423456.78..423456.78 rows=2678901 width=4) (actual time=4567.890..4567.890 rows=2678901 loops=1)
        Buckets: 4194304  Batches: 2  Memory Usage: 137892kB
        ->  HashAggregate  (cost=389012.34..423456.78 rows=2678901 width=4) (actual time=3456.789..4234.567 rows=2678901 loops=1)
              Group Key: o.user_id
              Peak Memory Usage: 134567kB
              ->  Seq Scan on orders o  (cost=0.00..345678.90 rows=17345678 width=4) (actual time=0.019..2345.678 rows=17345678 loops=1)
                    Filter: (order_date >= '2024-01-01' AND status = 'completed')
                    Rows Removed by Filter: 32654322
Planning Time: 2.345 ms
Execution Time: 7312.456 ms
```

**병목 원인**:
- IN 서브쿼리가 주문 테이블에서 조건에 맞는 전체 user_id(약 1,734만 건)를 스캔 후 HashAggregate로 중복 제거
- 중복 제거된 약 268만 건의 user_id를 Hash 테이블로 구성하는데 134MB 메모리 사용
- Hash 테이블이 work_mem을 초과하여 Batches: 2로 디스크 스필 발생
- 주문 테이블 전체 스캔(5,000만 건 중 조건 필터)과 사용자 테이블 전체 스캔이 순차적으로 진행

### After (최적화)

**실행 시간**: 1.5초 (79% 개선)
**Scanned Data**: 1,230 MB (50% 감소)

```sql
-- EXISTS: 존재 여부만 확인하고 즉시 중단 (Semi Join)
SELECT
    u.user_id,
    u.signup_date,
    u.region,
    u.user_segment
FROM users AS u
WHERE u.region = 'KR'
    AND EXISTS (
        SELECT 1
        FROM orders AS o
        WHERE o.user_id = u.user_id
            AND o.order_date >= '2024-01-01'
            AND o.status = 'completed'
    );
```

**EXPLAIN ANALYZE 결과**:
```
Nested Loop Semi Join  (cost=0.87..234567.89 rows=345678 width=44) (actual time=0.045..1478.234 rows=342156 loops=1)
  ->  Seq Scan on users u  (cost=0.00..189012.34 rows=4500000 width=44) (actual time=0.021..456.789 rows=4500000 loops=1)
        Filter: (region = 'KR')
        Rows Removed by Filter: 5500000
  ->  Index Scan using idx_orders_user_date on orders o  (cost=0.87..2.34 rows=3 width=4) (actual time=0.000..0.000 rows=1 loops=4500000)
        Index Cond: (user_id = u.user_id AND order_date >= '2024-01-01')
        Filter: (status = 'completed')
        Rows Removed by Filter: 0
Planning Time: 1.678 ms
Execution Time: 1489.012 ms
```

**개선 포인트**:
- Hash Join이 Nested Loop Semi Join으로 변경: 일치하는 첫 행을 찾으면 즉시 해당 사용자 확인 완료
- 주문 테이블 전체 스캔 제거: 인덱스(idx_orders_user_date)를 통해 사용자별 존재 여부만 확인
- HashAggregate 단계 완전 제거: user_id 중복 제거를 위한 메모리 134MB 절약
- Semi Join 특성상 첫 번째 매칭 행을 찾으면 inner loop를 즉시 종료하므로 평균 비교 횟수 대폭 감소

### Anti Semi Join 참고 (NOT EXISTS 패턴)

주문 이력이 **없는** 사용자를 조회할 때도 동일한 원리가 적용된다:

```sql
-- NOT IN (비효율적) - NULL 처리 문제도 있음
SELECT u.user_id
FROM users AS u
WHERE u.user_id NOT IN (
    SELECT o.user_id FROM orders AS o
);

-- NOT EXISTS (최적화) - Anti Semi Join
SELECT u.user_id
FROM users AS u
WHERE NOT EXISTS (
    SELECT 1
    FROM orders AS o
    WHERE o.user_id = u.user_id
);
```

NOT IN은 서브쿼리에 NULL이 포함되면 전체 결과가 빈 셋이 되는 치명적 버그가 있다.
NOT EXISTS는 이 문제가 없으며, Anti Semi Join으로 최적화되어 성능도 우수하다.

### 핵심 교훈

- IN은 서브쿼리 결과 전체를 메모리에 로드하여 Hash 테이블을 구성하지만, EXISTS는 존재 여부만 확인하고 즉시 중단한다
- 대용량 테이블에서 "존재 여부" 확인은 EXISTS + 적절한 인덱스 조합이 최적이다
- Semi Join은 첫 번째 매칭에서 inner scan을 중단하므로, 1:N 관계에서 특히 효과적이다
- NOT IN은 NULL 안전성 문제가 있으므로, 부정 조건에서는 반드시 NOT EXISTS를 사용하라
- EXPLAIN ANALYZE에서 Hash Join + HashAggregate 조합이 보이면 EXISTS 전환을 검토하라

### 면접에서 이렇게 설명하세요

"주문 이력이 있는 사용자를 조회하는 쿼리가 IN 서브쿼리로 작성되어 있었는데,
주문 테이블에서 약 1,700만 건을 스캔하여 268만 개의 고유 user_id를 Hash 테이블로 만들고 있었습니다.
이를 EXISTS로 변경하여 Semi Join 방식으로 전환했더니, 인덱스를 통해 사용자별로 첫 번째 매칭만 확인하고
즉시 중단하여 7.3초에서 1.5초로 79% 개선되었습니다.
EXISTS는 '있냐 없냐'만 확인하므로 전체 결과를 수집하는 IN보다 대용량 테이블에서 항상 유리합니다."
