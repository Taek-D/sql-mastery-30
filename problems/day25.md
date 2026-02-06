## Day 25: Self JOIN으로 상품 추천 쌍 찾기

### 난이도
⭐⭐⭐ 고급

### 비즈니스 맥락
쿠팡의 추천팀에서 "함께 구매한 상품 쌍"을 찾습니다.
같은 주문에 포함된 상품 조합을 분석하여 "이 상품과 함께 구매한 상품" 추천 로직에 활용합니다.

### 테이블 스키마
- **order_items**: order_item_id, order_id, product_id
- **products**: product_id, product_name

### 질문
2025년 1월 같은 주문에 함께 포함된 상품 쌍을 빈도 높은 순으로 출력하세요.
(같은 상품끼리 쌍은 제외)

### 정답 쿼리
```sql
WITH jan_orders AS (
    SELECT DISTINCT oi.order_id, oi.product_id
    FROM order_items oi
    JOIN orders o ON oi.order_id = o.order_id
    WHERE o.order_date >= '2025-01-01'
      AND o.order_date < '2025-02-01'
      AND o.status = 'completed'
)
SELECT 
    p1.product_name AS product_a,
    p2.product_name AS product_b,
    COUNT(*) AS co_purchase_count
FROM jan_orders jo1
JOIN jan_orders jo2 
    ON jo1.order_id = jo2.order_id
    AND jo1.product_id < jo2.product_id  -- 중복 제거 (A-B, B-A)
JOIN products p1 ON jo1.product_id = p1.product_id
JOIN products p2 ON jo2.product_id = p2.product_id
GROUP BY p1.product_name, p2.product_name
HAVING COUNT(*) >= 5  -- 최소 5회 이상
ORDER BY co_purchase_count DESC
LIMIT 20;
```

### 해설

**핵심 개념**
- Self JOIN: 같은 테이블을 두 번 사용
- `product_id < product_id`: 중복 제거
  - (1, 2)와 (2, 1)을 동일하게 취급
- Market Basket Analysis 기초

**Q1**: 특정 상품과 함께 구매된 상품?
```sql
-- 상품 ID 100과 함께 구매된 상품 Top 10
SELECT 
    p2.product_name,
    COUNT(*) AS co_purchase_count
FROM jan_orders jo1
JOIN jan_orders jo2 
    ON jo1.order_id = jo2.order_id
    AND jo1.product_id = 100  -- 특정 상품
    AND jo2.product_id != 100
JOIN products p2 ON jo2.product_id = p2.product_id
GROUP BY p2.product_name
ORDER BY co_purchase_count DESC
LIMIT 10;
```

**Q2**: Lift 지표 계산?
```sql
-- Lift = P(A∩B) / (P(A) × P(B))
-- Association Rule Mining
WITH total_orders AS (
    SELECT COUNT(DISTINCT order_id) AS total FROM jan_orders
),
product_freq AS (
    SELECT 
        product_id,
        COUNT(DISTINCT order_id) AS product_orders
    FROM jan_orders
    GROUP BY product_id
),
pair_freq AS (
    -- 위 Self JOIN 쿼리
)
SELECT 
    product_a,
    product_b,
    co_purchase_count,
    ROUND(
        (co_purchase_count::NUMERIC / t.total) / 
        ((pf1.product_orders::NUMERIC / t.total) * (pf2.product_orders::NUMERIC / t.total)),
        2
    ) AS lift
FROM pair_freq
CROSS JOIN total_orders t
JOIN product_freq pf1 ON ... (생략)
```
