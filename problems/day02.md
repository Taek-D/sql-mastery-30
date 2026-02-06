## Day 2: 상품 카테고리별 매출 Top 5

### 난이도
⭐ 기초

### 비즈니스 맥락
라프텔의 상품팀에서 "어떤 카테고리가 가장 잘 팔리는가?"를 분석하려 합니다.
카테고리별 총 매출을 계산하고, 상위 5개 카테고리를 찾아야 합니다.

### 테이블 스키마
- **products**: product_id, product_name, category, price
- **order_items**: order_item_id, order_id, product_id, quantity, item_price

### 질문
2025년 전체 기간 동안 카테고리별 총 매출을 계산하고, 매출이 높은 상위 5개 카테고리를 찾으세요.

### 힌트 (클릭하여 펼치기)
<details>
<summary>힌트 보기</summary>

- `JOIN`으로 products와 order_items 연결
- `SUM(quantity * item_price)`로 총 매출 계산
- `ORDER BY ... DESC LIMIT 5`로 상위 5개 추출

</details>

### 정답 쿼리
```sql
SELECT 
    p.category,
    SUM(oi.quantity * oi.item_price) AS total_revenue
FROM products p
JOIN order_items oi ON p.product_id = oi.product_id
JOIN orders o ON oi.order_id = o.order_id
WHERE o.order_date >= '2025-01-01' 
  AND o.order_date < '2026-01-01'
  AND o.status = 'completed'
GROUP BY p.category
ORDER BY total_revenue DESC
LIMIT 5;
```

### 해설

**왜 이 방법을 선택했는가?**
- `JOIN`: products와 order_items를 연결해 카테고리 정보 가져오기
- `orders` 테이블 조인: 주문 날짜 필터링 및 완료된 주문만 집계
- `status = 'completed'`: 취소/대기 상태 주문 제외
- `SUM(quantity * item_price)`: 총 매출 = 수량 × 가격

**핵심 SQL 개념**
- **INNER JOIN**: 두 테이블에 모두 존재하는 데이터만 가져옴
- **집계 함수 with JOIN**: 조인 후 집계 가능
- **ORDER BY + LIMIT**: 정렬 후 상위 N개 추출

### 예상 추가 질문

**Q1**: `item_price`가 아니라 `products.price`를 써도 되나요?  
**A1**: 안 됩니다. 실무에서는 할인/프로모션으로 주문 시점 가격이 다를 수 있으므로 `item_price`를 사용해야 정확합니다.

**Q2**: `WHERE` 대신 `HAVING`으로 필터링하면 더 느린가요?  
**A2**: 네. `WHERE`는 JOIN 전에 필터링하지만, `HAVING`은 GROUP BY 후에 필터링하므로 더 많은 데이터를 처리합니다.

```sql
-- 비효율적 (HAVING 사용)
SELECT 
    p.category,
    SUM(oi.quantity * oi.item_price) AS total_revenue
FROM products p
JOIN order_items oi ON p.product_id = oi.product_id
JOIN orders o ON oi.order_id = o.order_id
WHERE o.status = 'completed'
GROUP BY p.category
HAVING MAX(o.order_date) >= '2025-01-01'  -- 비효율적!
ORDER BY total_revenue DESC
LIMIT 5;
```

**Q3**: 만약 매출이 같은 카테고리가 여러 개면 어떻게 처리하나요?  
**A3**: `RANK()` 윈도우 함수를 사용해 동점 처리할 수 있습니다.

```sql
WITH ranked_categories AS (
    SELECT 
        p.category,
        SUM(oi.quantity * oi.item_price) AS total_revenue,
        RANK() OVER (ORDER BY SUM(oi.quantity * oi.item_price) DESC) AS rank
    FROM products p
    JOIN order_items oi ON p.product_id = oi.product_id
    JOIN orders o ON oi.order_id = o.order_id
    WHERE o.order_date >= '2025-01-01' 
      AND o.order_date < '2026-01-01'
      AND o.status = 'completed'
    GROUP BY p.category
)
SELECT category, total_revenue
FROM ranked_categories
WHERE rank <= 5;
```
