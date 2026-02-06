## Case 02: Correlated Subquery를 CTE + JOIN으로 변환

### 문제 상황

토스 데이터팀에서 사용자별 주문 횟수를 포함한 리포트를 요청했다. 기존 쿼리는 Correlated Subquery(상관 서브쿼리)를 사용하여 사용자 한 명마다 orders 테이블을 반복 스캔하고 있었다. 사용자 수가 80만 명인 상황에서, 서브쿼리가 80만 번 실행되면서 쿼리 실행 시간이 8초를 넘겼다. 데이터팀 위클리 미팅에서 "이 리포트 자동화하려면 속도부터 개선해야 한다"는 의견이 나왔다.

### Before (비효율적)

**실행 시간**: 8.7초
**Scanned Data**: 2.8 GB

```sql
-- Correlated Subquery: 사용자마다 orders 테이블을 반복 스캔
SELECT
    u.user_id,
    u.signup_date,
    u.region,
    (
        SELECT COUNT(*)
        FROM orders o
        WHERE o.user_id = u.user_id
    ) AS order_count
FROM
    users u
WHERE
    u.signup_date >= '2024-01-01';
```

**EXPLAIN ANALYZE 결과**:

```
Seq Scan on users u  (cost=0.00..2458921.00 rows=800000 width=48)
  Filter: (signup_date >= '2024-01-01'::date)
  SubPlan 1
    ->  Aggregate  (cost=3.05..3.06 rows=1 width=8)
          ->  Seq Scan on orders o  (cost=0.00..3.04 rows=6 width=0)
                Filter: (user_id = u.user_id)
  Planning Time: 1.23 ms
  Execution Time: 8732.89 ms
  -- SubPlan이 users 행 수(800,000)만큼 반복 실행됨
```

**병목 원인**:

- Correlated Subquery는 외부 쿼리의 각 행마다 내부 쿼리를 반복 실행한다 (N+1 문제)
- 사용자 80만 명 x orders 테이블 스캔 = 사실상 80만 번의 개별 COUNT 쿼리 실행
- 실행 계획에서 Nested Loop이 발생하여 시간 복잡도가 O(N x M)에 가까워짐
- orders 테이블에 user_id 인덱스가 있어도 80만 번의 인덱스 룩업 오버헤드가 누적됨

### After (최적화)

**실행 시간**: 1.2초 (86% 개선)
**Scanned Data**: 1.1 GB (61% 감소)

```sql
-- CTE로 주문 횟수를 미리 1번 집계한 후 JOIN
WITH order_counts AS (
    SELECT
        user_id,
        COUNT(*) AS order_count
    FROM
        orders
    GROUP BY
        user_id
)
SELECT
    u.user_id,
    u.signup_date,
    u.region,
    COALESCE(oc.order_count, 0) AS order_count
FROM
    users u
    LEFT JOIN order_counts oc
        ON u.user_id = oc.user_id
WHERE
    u.signup_date >= '2024-01-01';
```

**EXPLAIN ANALYZE 결과**:

```
Hash Join  (cost=125432.00..198765.00 rows=800000 width=48)
  Hash Cond: (u.user_id = oc.user_id)
  ->  Seq Scan on users u  (cost=0.00..24500.00 rows=800000 width=40)
        Filter: (signup_date >= '2024-01-01'::date)
  ->  Hash  (cost=98765.00..98765.00 rows=750000 width=12)
        ->  CTE Scan on order_counts oc
              ->  HashAggregate  (cost=85432.00..92345.00 rows=750000 width=12)
                    Group Key: orders.user_id
                    ->  Seq Scan on orders  (cost=0.00..72345.00 rows=5230000 width=4)
  Planning Time: 2.15 ms
  Execution Time: 1198.34 ms
```

**개선 포인트**:

- orders 테이블을 단 1번만 스캔하여 user_id별 집계를 완료 (80만 번 -> 1번)
- Nested Loop이 Hash Join으로 변경되어 시간 복잡도가 O(N + M)으로 개선
- CTE에서 미리 집계한 결과를 해시 테이블로 만들어 O(1) 룩업 수행
- LEFT JOIN + COALESCE로 주문이 없는 사용자도 0으로 표시하여 데이터 정합성 확보
- 쿼리 구조가 명확해져 다른 팀원이 읽고 수정하기 쉬워짐

### 핵심 교훈

- Correlated Subquery는 "행 수만큼 반복 실행"된다는 점을 항상 인지해야 한다
- SELECT 절의 서브쿼리가 보이면 CTE + JOIN으로 변환할 수 있는지 먼저 검토하라
- 실행 계획에서 Nested Loop + SubPlan 조합이 보이면 성능 병목을 의심해야 한다
- CTE는 가독성과 성능을 동시에 잡을 수 있는 강력한 도구이다

### 면접에서 이렇게 설명하세요

"토스 데이터팀에서 사용자별 주문 횟수 리포트를 만들 때, 기존 쿼리가 Correlated Subquery로 작성되어 있어 사용자 80만 명마다 orders 테이블을 반복 스캔하는 N+1 문제가 있었습니다. 이를 CTE로 주문 횟수를 1번만 미리 집계한 뒤 LEFT JOIN하는 방식으로 변환했습니다. 실행 계획이 Nested Loop에서 Hash Join으로 바뀌면서 실행 시간이 8.7초에서 1.2초로 86% 개선되었습니다. 핵심은 '반복 실행을 1번 실행으로 바꾸는 것'이었고, 이 패턴은 이후 다른 리포트 쿼리 최적화에도 동일하게 적용했습니다."
