## Day 15: 카테고리별 매출 Top 3 상품

### 난이도
⭐⭐ 중급

### 비즈니스 맥락
당근마켓의 카테고리별 "베스트셀러 3개"를 찾습니다.
각 카테고리에서 가장 잘 팔리는 상품을 프로모션에 활용합니다.

### 테이블 스키마
- **products**: product_id, product_name, category
- **order_items**: order_item_id, product_id, quantity, item_price

### 질문
각 카테고리별 매출 상위 3개 상품과 매출액을 출력하세요.

### 정답 쿼리
```sql
WITH product_sales AS (
    SELECT 
        p.category,
        p.product_id,
        p.product_name,
        SUM(oi.quantity * oi.item_price) AS total_revenue,
        ROW_NUMBER() OVER (
            PARTITION BY p.category 
            ORDER BY SUM(oi.quantity * oi.item_price) DESC
        ) AS rank_in_category
    FROM products p
    JOIN order_items oi ON p.product_id = oi.product_id
    GROUP BY p.category, p.product_id, p.product_name
)
SELECT 
    category,
    product_id,
    product_name,
    total_revenue,
    rank_in_category
FROM product_sales
WHERE rank_in_category <= 3
ORDER BY category, rank_in_category;
```

### 해설

**핵심 개념**
- `ROW_NUMBER()`: 중복 없이 순위
- `RANK()`: 동점 시 같은 순위
- `DENSE_RANK()`: 동점 후 순위 건너뛰지 않음

**Q1**: RANK() 사용 시 차이?
```sql
-- ROW_NUMBER: 1, 2, 3, 4, 5
-- RANK:       1, 2, 2, 4, 5 (동점 시 같은 순위, 다음 순위 건너뜀)
-- DENSE_RANK: 1, 2, 2, 3, 4 (동점 후 순위 건너뛰지 않음)
```
