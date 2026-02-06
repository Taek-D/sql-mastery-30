## Day 14: 사용자별 첫 구매 후 재구매까지 기간

### 난이도
⭐⭐ 중급

### 비즈니스 맥락
쿠팡의 리텐션팀에서 "첫 구매 후 재구매까지 걸리는 시간"을 분석합니다.
이 지표로 고객 충성도와 재구매 유도 시점을 파악합니다.

### 테이블 스키마
- **orders**: order_id, user_id, order_date, status

### 질문
각 사용자의 첫 구매일과 두 번째 구매일 사이의 일수를 계산하세요.
(2회 이상 구매한 사용자만 포함)

### 정답 쿼리
```sql
WITH ordered_purchases AS (
    SELECT 
        user_id,
        order_date,
        ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY order_date) AS purchase_number
    FROM orders
    WHERE status = 'completed'
),
first_two AS (
    SELECT 
        user_id,
        MAX(CASE WHEN purchase_number = 1 THEN order_date END) AS first_purchase,
        MAX(CASE WHEN purchase_number = 2 THEN order_date END) AS second_purchase
    FROM ordered_purchases
    WHERE purchase_number IN (1, 2)
    GROUP BY user_id
)
SELECT 
    user_id,
    first_purchase,
    second_purchase,
    second_purchase - first_purchase AS days_to_repurchase
FROM first_two
WHERE second_purchase IS NOT NULL
ORDER BY days_to_repurchase;
```

**LAG/LEAD 사용**:
```sql
WITH ordered_purchases AS (
    SELECT 
        user_id,
        order_date,
        LEAD(order_date) OVER (PARTITION BY user_id ORDER BY order_date) AS next_purchase
    FROM orders
    WHERE status = 'completed'
)
SELECT 
    user_id,
    order_date AS first_purchase,
    next_purchase AS second_purchase,
    next_purchase - order_date AS days_to_repurchase
FROM ordered_purchases
WHERE next_purchase IS NOT NULL
  AND order_date = (
      SELECT MIN(order_date)
      FROM orders o2
      WHERE o2.user_id = ordered_purchases.user_id
        AND o2.status = 'completed'
  )
ORDER BY days_to_repurchase;
```

### 해설

**핵심 개념**
- `ROW_NUMBER()`: 순서 매기기
- `LAG()/LEAD()`: 이전/다음 행 값 가져오기
- CASE WHEN으로 피벗
