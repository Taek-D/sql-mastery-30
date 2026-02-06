## Day 13: 상품별 누적 매출

### 난이도
⭐⭐ 중급

### 비즈니스 맥락
에이블리의 PM이 "이번 달 상품별 누적 매출 그래프"를 요청했습니다.
일자별 매출을 누적해서 "언제 목표 금액에 도달하는가" 예측하려 합니다.

### 테이블 스키마
- **orders**: order_id, product_id, order_date, total_amount
- **order_items**: order_item_id, order_id, product_id, quantity, item_price

### 질문
2025년 1월 각 상품의 일자별 누적 매출을 계산하세요.

### 정답 쿼리
```sql
WITH daily_sales AS (
    SELECT 
        oi.product_id,
        DATE(o.order_date) AS sale_date,
        SUM(oi.quantity * oi.item_price) AS daily_revenue
    FROM orders o
    JOIN order_items oi ON o.order_id = oi.order_id
    WHERE o.order_date >= '2025-01-01'
      AND o.order_date < '2025-02-01'
      AND o.status = 'completed'
    GROUP BY oi.product_id, DATE(o.order_date)
)
SELECT 
    product_id,
    sale_date,
    daily_revenue,
    SUM(daily_revenue) OVER (
        PARTITION BY product_id 
        ORDER BY sale_date
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) AS cumulative_revenue
FROM daily_sales
ORDER BY product_id, sale_date;
```

### 해설

**핵심 개념**
- Window Function: `SUM() OVER ()`
- `PARTITION BY`: 상품별로 분리
- `ORDER BY`: 날짜 순 정렬
- `ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW`: 누적 범위

**Q1**: ROWS BETWEEN 생략 가능?
```sql
-- 동일한 결과
SUM(daily_revenue) OVER (
    PARTITION BY product_id 
    ORDER BY sale_date
)
```
