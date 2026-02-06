## Day 20: 상품별 재고 회전율

### 난이도
⭐⭐ 중급

### 비즈니스 맥락
쿠팡의 물류팀에서 "상품별 재고 회전율"을 계산합니다.
판매 속도가 빠른 상품을 파악하여 재고 관리를 최적화합니다.

### 테이블 스키마
- **products**: product_id, product_name, category
- **inventory**: product_id, stock_quantity, last_updated
- **order_items**: order_item_id, product_id, quantity, order_date

### 질문
2025년 1월 각 상품의 판매량, 평균 재고, 재고 회전율을 계산하세요.
재고 회전율 = 판매량 / 평균 재고

### 정답 쿼리
```sql
WITH jan_sales AS (
    SELECT 
        product_id,
        SUM(quantity) AS total_sold
    FROM order_items
    WHERE order_date >= '2025-01-01'
      AND order_date < '2025-02-01'
    GROUP BY product_id
),
avg_inventory AS (
    SELECT 
        product_id,
        AVG(stock_quantity) AS avg_stock
    FROM inventory
    WHERE last_updated >= '2025-01-01'
      AND last_updated < '2025-02-01'
    GROUP BY product_id
)
SELECT 
    p.product_id,
    p.product_name,
    p.category,
    COALESCE(js.total_sold, 0) AS total_sold,
    COALESCE(ai.avg_stock, 0) AS avg_stock,
    CASE 
        WHEN ai.avg_stock > 0 THEN 
            ROUND(COALESCE(js.total_sold, 0)::NUMERIC / ai.avg_stock, 2)
        ELSE 0
    END AS inventory_turnover_ratio
FROM products p
LEFT JOIN jan_sales js ON p.product_id = js.product_id
LEFT JOIN avg_inventory ai ON p.product_id = ai.product_id
WHERE js.total_sold > 0 OR ai.avg_stock > 0
ORDER BY inventory_turnover_ratio DESC;
```

### 해설

**핵심 개념**
- 재고 회전율: 판매 속도 지표
- 높을수록 빠르게 판매됨
- `CASE WHEN`: 0으로 나누기 방지

**Q1**: 카테고리별 평균 회전율?
```sql
SELECT 
    category,
    AVG(inventory_turnover_ratio) AS avg_turnover,
    COUNT(*) AS product_count
FROM (/* 위 쿼리 */) AS product_stats
GROUP BY category
ORDER BY avg_turnover DESC;
```
