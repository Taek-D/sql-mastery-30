## Case 05: GROUP BY 전 필터링 (WHERE vs HAVING)

### 문제 상황

토스 데이터팀에서 2025년 주문 데이터 중 평균 주문 금액이 10만 원 이상인 사용자를 조회해달라는 요청을 받았다. 프리미엄 사용자 세그먼트를 정의하기 위한 분석이었다. 기존 쿼리는 전체 연도의 주문 데이터를 먼저 GROUP BY로 집계한 후, HAVING 절에서 연도 필터와 금액 필터를 모두 적용하고 있었다. 2023년부터 축적된 3년치 전체 주문 데이터(약 1,570만 건)를 집계한 뒤에야 2025년 필터가 적용되는 구조여서, 불필요한 데이터까지 모두 집계하느라 6.8초가 걸리고 있었다.

### Before (비효율적)

**실행 시간**: 6.8초
**Scanned Data**: 2.4 GB

```sql
-- GROUP BY 후 HAVING에서 연도 필터링 (전체 데이터 집계 후 필터)
SELECT
    user_id,
    AVG(total_amount) AS avg_order_amount,
    COUNT(*) AS order_count
FROM
    orders
GROUP BY
    user_id
HAVING
    EXTRACT(YEAR FROM MIN(order_date)) >= 2025
    AND AVG(total_amount) >= 100000;
```

**EXPLAIN ANALYZE 결과**:

```
GroupAggregate  (cost=1456789.00..1678901.00 rows=25000 width=44)
  Group Key: user_id
  Filter: ((EXTRACT(year FROM min(order_date)) >= 2025) AND (avg(total_amount) >= 100000))
  Rows Removed by Filter: 725000
  ->  Sort  (cost=1456789.00..1495678.00 rows=15700000 width=16)
        Sort Key: user_id
        Sort Method: external merge  Disk: 245632kB
        ->  Seq Scan on orders  (cost=0.00..345678.00 rows=15700000 width=16)
  Planning Time: 1.45 ms
  Execution Time: 6823.56 ms
  -- 전체 15,700,000건을 정렬 후 GROUP BY
  -- 디스크 기반 외부 정렬 발생 (메모리 초과)
```

**병목 원인**:

- 전체 3년치 주문 데이터(1,570만 건)를 모두 읽어 GROUP BY를 수행한 후에야 연도 필터가 적용됨
- HAVING 절은 GROUP BY 이후에 실행되므로, 이미 불필요한 2023-2024년 데이터까지 집계가 완료된 후 버려짐
- 1,570만 건 전체를 user_id로 정렬해야 하는데 메모리가 부족하여 디스크 기반 외부 정렬(external merge) 발생
- HAVING에서 `EXTRACT(YEAR FROM MIN(order_date)) >= 2025`라는 부정확한 로직 사용 -- 2023년에 첫 주문을 한 사용자는 2025년 주문이 있어도 필터링됨
- WHERE로 이동 가능한 조건을 HAVING에 넣어 옵티마이저의 최적화 기회를 차단

### After (최적화)

**실행 시간**: 1.1초 (84% 개선)
**Scanned Data**: 0.82 GB (66% 감소)

```sql
-- WHERE로 먼저 2025년 데이터만 필터링 후 GROUP BY
SELECT
    user_id,
    AVG(total_amount) AS avg_order_amount,
    COUNT(*) AS order_count
FROM
    orders
WHERE
    order_date >= '2025-01-01'
    AND order_date < '2026-01-01'
GROUP BY
    user_id
HAVING
    AVG(total_amount) >= 100000;
```

**EXPLAIN ANALYZE 결과**:

```
HashAggregate  (cost=98765.00..112345.00 rows=25000 width=44)
  Group Key: user_id
  Filter: (avg(total_amount) >= 100000)
  Rows Removed by Filter: 195000
  Batches: 1  Memory Usage: 24576kB
  ->  Index Scan using idx_orders_order_date on orders  (cost=0.56..85432.00 rows=5230000 width=16)
        Index Cond: ((order_date >= '2025-01-01'::date) AND (order_date < '2026-01-01'::date))
  Planning Time: 0.23 ms
  Execution Time: 1098.34 ms
  -- 인덱스로 2025년 데이터(523만 건)만 먼저 필터링
  -- 메모리 내 HashAggregate로 집계 (디스크 정렬 없음)
```

**개선 포인트**:

- WHERE 절에서 2025년 데이터만 먼저 필터링하여 GROUP BY 대상을 1,570만 건 -> 523만 건으로 67% 축소
- order_date 인덱스를 활용한 Index Scan으로 불필요한 데이터를 읽지 않음
- 집계 대상이 줄어들면서 디스크 기반 외부 정렬이 메모리 내 HashAggregate로 전환됨
- HAVING에는 집계 함수 조건(AVG >= 100000)만 남기고, 행 단위 필터 조건은 WHERE로 이동
- 로직도 정확해짐 -- "2025년 주문 중 평균 10만 원 이상"이라는 요구사항을 정확히 반영

### WHERE vs HAVING 판단 기준

| 구분 | WHERE | HAVING |
|------|-------|--------|
| 실행 시점 | GROUP BY 이전 | GROUP BY 이후 |
| 필터 대상 | 개별 행 | 그룹 (집계 결과) |
| 인덱스 활용 | 가능 | 불가능 |
| 적합한 조건 | `order_date >= '2025-01-01'` | `AVG(total_amount) >= 100000` |
| 원칙 | 집계 함수가 아닌 조건은 WHERE로 | 집계 함수 조건만 HAVING으로 |

### 핵심 교훈

- WHERE는 GROUP BY 이전, HAVING은 GROUP BY 이후에 실행된다는 순서를 항상 기억하라
- 집계 함수를 사용하지 않는 필터 조건은 반드시 WHERE 절에 작성하라
- WHERE에서 먼저 데이터를 줄여야 GROUP BY의 정렬/해싱 비용과 메모리 사용량이 감소한다
- HAVING에 행 단위 조건을 넣으면 옵티마이저가 인덱스를 활용할 기회를 잃는다
- SQL 실행 순서(FROM -> WHERE -> GROUP BY -> HAVING -> SELECT -> ORDER BY)를 이해하면 최적화 감각이 생긴다

### 면접에서 이렇게 설명하세요

"토스 데이터팀에서 2025년 프리미엄 사용자 세그먼트를 정의하기 위해 평균 주문 금액 10만 원 이상인 사용자를 조회하는 쿼리를 최적화했습니다. 기존 쿼리는 3년치 전체 주문 1,570만 건을 GROUP BY로 집계한 후 HAVING에서 연도 필터를 적용하고 있었습니다. WHERE와 HAVING의 실행 순서 차이를 활용하여 연도 조건을 WHERE로 이동시킨 결과, GROUP BY 대상이 523만 건으로 67% 줄었고, 디스크 기반 외부 정렬이 메모리 내 HashAggregate로 전환되면서 실행 시간이 6.8초에서 1.1초로 84% 개선되었습니다. 핵심 원칙은 '집계 함수가 아닌 조건은 무조건 WHERE로'입니다."
