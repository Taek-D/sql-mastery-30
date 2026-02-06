## Case 10: Materialized View 활용 - 카테고리별 일별 매출 집계 최적화

### 문제 상황

에이블리 대시보드에서 카테고리별 일별 매출 집계 데이터를 실시간으로 조회하고 있다.
대시보드는 평균 분당 20회 이상 접속되며, 매 요청마다 orders, order_items, products 테이블을
JOIN하고 GROUP BY로 집계하는 복잡한 쿼리를 실행하고 있었다.
주문 테이블 약 5,000만 건, 주문 상세 테이블 약 1억 2,000만 건, 상품 테이블 약 50만 건 규모에서
매 요청마다 3.8초가 소요되어 대시보드 사용자 경험이 매우 나빴다.
동일한 집계 결과를 분당 20회 반복 계산하는 것은 명백한 리소스 낭비였다.

### Before (비효율적)

**실행 시간**: 3.8초 (매 요청마다)
**Scanned Data**: 3,200 MB
**일일 총 연산 시간**: 3.8초 x 20회/분 x 60분 x 12시간 = 약 54,720초 (15.2시간분의 연산)

```sql
-- 매 요청마다 3개 테이블 JOIN + GROUP BY 실시간 집계
SELECT
    p.category,
    DATE(o.order_date) AS sale_date,
    COUNT(DISTINCT o.order_id) AS order_count,
    COUNT(oi.order_item_id) AS item_count,
    SUM(oi.quantity) AS total_quantity,
    SUM(oi.item_price * oi.quantity) AS total_revenue,
    AVG(o.total_amount) AS avg_order_amount,
    COUNT(DISTINCT o.user_id) AS unique_buyers
FROM orders AS o
INNER JOIN order_items AS oi
    ON o.order_id = oi.order_id
INNER JOIN products AS p
    ON oi.product_id = p.product_id
WHERE o.order_date >= CURRENT_DATE - INTERVAL '30 days'
    AND o.status = 'completed'
GROUP BY
    p.category,
    DATE(o.order_date)
ORDER BY
    sale_date DESC,
    total_revenue DESC;
```

**EXPLAIN ANALYZE 결과**:
```
Sort  (cost=567890.12..567891.23 rows=450 width=96) (actual time=3756.123..3756.234 rows=450 loops=1)
  Sort Key: (date(o.order_date)) DESC, (sum((oi.item_price * oi.quantity))) DESC
  Sort Method: quicksort  Memory: 78kB
  ->  HashAggregate  (cost=567234.56..567789.01 rows=450 width=96) (actual time=3745.678..3755.890 rows=450 loops=1)
        Group Key: p.category, date(o.order_date)
        Batches: 1  Memory Usage: 200kB
        ->  Hash Join  (cost=234567.89..489012.34 rows=12345678 width=48) (actual time=890.123..2890.456 rows=12345678 loops=1)
              Hash Cond: (oi.product_id = p.product_id)
              ->  Hash Join  (cost=123456.78..345678.90 rows=12345678 width=36) (actual time=567.890..2123.456 rows=12345678 loops=1)
                    Hash Cond: (oi.order_id = o.order_id)
                    ->  Seq Scan on order_items oi  (cost=0.00..178901.23 rows=120000000 width=24) (actual time=0.023..789.012 rows=120000000 loops=1)
                    ->  Hash  (cost=112345.67..112345.67 rows=4567890 width=20) (actual time=456.789..456.789 rows=4567890 loops=1)
                          Buckets: 8388608  Batches: 1  Memory Usage: 234567kB
                          ->  Seq Scan on orders o  (cost=0.00..112345.67 rows=4567890 width=20) (actual time=0.019..345.678 rows=4567890 loops=1)
                                Filter: (order_date >= (CURRENT_DATE - '30 days'::interval) AND status = 'completed')
                                Rows Removed by Filter: 45432110
              ->  Hash  (cost=89012.34..89012.34 rows=500000 width=20) (actual time=234.567..234.567 rows=500000 loops=1)
                    ->  Seq Scan on products p  (cost=0.00..89012.34 rows=500000 width=20) (actual time=0.012..178.901 rows=500000 loops=1)
Planning Time: 3.456 ms
Execution Time: 3812.345 ms
```

**병목 원인**:
- 3개 테이블 JOIN으로 약 1,234만 건의 중간 결과 생성 후 집계
- order_items 테이블 1.2억 건 전체 스캔 (가장 큰 비용)
- 동일한 결과를 분당 20회 반복 계산하는 리소스 낭비
- Hash Join의 메모리 사용량 234MB로 DB 서버 메모리 압박

### After (최적화)

**실행 시간**: 0.05초 (99% 개선)
**Scanned Data**: 0.02 MB
**일일 총 연산 시간**: 0.05초 x 20회/분 x 60분 x 12시간 = 720초 (12분, 기존 대비 99.8% 감소)

**Step 1: Materialized View 생성**

```sql
-- Materialized View로 집계 결과를 미리 저장
CREATE MATERIALIZED VIEW mv_daily_category_sales AS
SELECT
    p.category,
    DATE(o.order_date) AS sale_date,
    COUNT(DISTINCT o.order_id) AS order_count,
    COUNT(oi.order_item_id) AS item_count,
    SUM(oi.quantity) AS total_quantity,
    SUM(oi.item_price * oi.quantity) AS total_revenue,
    AVG(o.total_amount) AS avg_order_amount,
    COUNT(DISTINCT o.user_id) AS unique_buyers
FROM orders AS o
INNER JOIN order_items AS oi
    ON o.order_id = oi.order_id
INNER JOIN products AS p
    ON oi.product_id = p.product_id
WHERE o.status = 'completed'
GROUP BY
    p.category,
    DATE(o.order_date)
WITH DATA;

-- Materialized View에 인덱스 생성 (CONCURRENTLY REFRESH용 UNIQUE INDEX 필수)
CREATE UNIQUE INDEX idx_mv_daily_category_sales_unique
    ON mv_daily_category_sales (category, sale_date);

CREATE INDEX idx_mv_daily_category_sales_date
    ON mv_daily_category_sales (sale_date DESC);
```

**Step 2: 대시보드 쿼리를 Materialized View 조회로 변경**

```sql
-- Materialized View에서 직접 조회 (단순 인덱스 스캔)
SELECT
    category,
    sale_date,
    order_count,
    item_count,
    total_quantity,
    total_revenue,
    avg_order_amount,
    unique_buyers
FROM mv_daily_category_sales
WHERE sale_date >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY
    sale_date DESC,
    total_revenue DESC;
```

**Step 3: 주기적 갱신 설정**

```sql
-- CONCURRENTLY 옵션으로 읽기 차단 없이 갱신
-- (UNIQUE INDEX가 있어야 CONCURRENTLY 사용 가능)
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_daily_category_sales;
```

```sql
-- pg_cron으로 10분마다 자동 갱신 스케줄 등록
SELECT cron.schedule(
    'refresh_daily_category_sales',
    '*/10 * * * *',
    'REFRESH MATERIALIZED VIEW CONCURRENTLY mv_daily_category_sales'
);
```

**EXPLAIN ANALYZE 결과 (Materialized View 조회)**:
```
Index Scan using idx_mv_daily_category_sales_date on mv_daily_category_sales  (cost=0.28..12.45 rows=450 width=96) (actual time=0.023..0.045 rows=450 loops=1)
  Index Cond: (sale_date >= (CURRENT_DATE - '30 days'::interval))
Planning Time: 0.234 ms
Execution Time: 0.052 ms
```

**개선 포인트**:
- 3개 테이블 JOIN + GROUP BY 연산이 Materialized View에 미리 계산되어 저장됨
- 대시보드 쿼리가 단순 인덱스 스캔으로 변환되어 3.8초에서 0.05초로 99% 개선
- CONCURRENTLY 옵션으로 갱신 중에도 기존 데이터 조회 가능 (읽기 차단 없음)
- DB 서버의 반복적 연산 부하가 10분 1회 갱신으로 집중되어 전체 리소스 사용량 99.8% 감소

### Materialized View vs 일반 View 비교

```
+---------------------------+----------------------------+----------------------------+
| 항목                       | View                       | Materialized View          |
+---------------------------+----------------------------+----------------------------+
| 데이터 저장               | X (쿼리 정의만 저장)         | O (결과 데이터 물리 저장)   |
| 조회 성능                 | 원본 쿼리와 동일              | 사전 계산 결과 즉시 반환    |
| 데이터 최신성             | 항상 최신                    | REFRESH 시점 기준           |
| 인덱스 생성 가능          | X                           | O                          |
| 디스크 사용               | 없음                        | 결과 크기만큼 사용          |
| 적합한 사용처             | 복잡한 쿼리 추상화           | 반복 집계, 대시보드         |
+---------------------------+----------------------------+----------------------------+
```

### 주의 사항

- Materialized View의 데이터는 REFRESH 시점 기준이므로 실시간 정합성이 필요한 경우 부적합
- REFRESH MATERIALIZED VIEW는 전체 재계산이므로 데이터가 매우 클 경우 갱신 시간이 김
- CONCURRENTLY 옵션 사용 시 반드시 UNIQUE INDEX가 존재해야 함
- 갱신 주기는 비즈니스 요구사항(데이터 최신성 허용 범위)에 맞게 설정해야 함

### 핵심 교훈

- 동일한 집계 결과를 반복 계산하는 패턴을 발견하면 Materialized View를 검토하라
- Materialized View는 "계산 결과의 캐시"로, 읽기 빈도가 높고 쓰기 빈도가 낮은 데이터에 최적이다
- CONCURRENTLY 옵션으로 서비스 중단 없이 갱신할 수 있지만, UNIQUE INDEX가 전제 조건이다
- 대시보드 성능 최적화에서 가장 먼저 고려해야 할 전략 중 하나이다
- 실시간성과 성능은 트레이드오프 관계이므로, 비즈니스 허용 범위 내에서 갱신 주기를 결정하라

### 면접에서 이렇게 설명하세요

"에이블리 대시보드에서 카테고리별 일별 매출을 조회할 때마다 3개 테이블을 JOIN하고 GROUP BY로 집계하여
매번 3.8초가 걸리고 있었습니다. 분당 20회 접속이므로 동일 연산을 하루 14,400회 반복하는 셈이었습니다.
Materialized View를 생성하여 집계 결과를 미리 저장하고, pg_cron으로 10분마다 REFRESH CONCURRENTLY로
갱신하도록 설정했습니다. 대시보드 쿼리는 단순 인덱스 스캔으로 바뀌어 0.05초로 99% 개선되었고,
DB 서버의 일일 총 연산 시간도 15시간에서 12분으로 99.8% 감소했습니다."
