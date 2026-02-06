## Day 18: 사용자별 구매 주기 계산

### 난이도
⭐⭐ 중급

### 비즈니스 맥락
마켓컬리의 CRM팀에서 "고객별 평균 구매 주기"를 분석합니다.
재구매 시기를 예측하여 맞춤형 프로모션을 발송하려 합니다.

### 테이블 스키마
- **orders**: order_id, user_id, order_date, status

### 질문
3회 이상 구매한 사용자의 평균 구매 주기(일)를 계산하세요.

### 정답 쿼리
```sql
WITH user_orders AS (
    SELECT 
        user_id,
        order_date,
        LEAD(order_date) OVER (PARTITION BY user_id ORDER BY order_date) AS next_order_date
    FROM orders
    WHERE status = 'completed'
),
purchase_intervals AS (
    SELECT 
        user_id,
        next_order_date - order_date AS days_between_orders
    FROM user_orders
    WHERE next_order_date IS NOT NULL
),
user_stats AS (
    SELECT 
        user_id,
        COUNT(*) AS purchase_count,
        AVG(days_between_orders) AS avg_purchase_cycle
    FROM purchase_intervals
    GROUP BY user_id
    HAVING COUNT(*) >= 2  -- 3회 구매 = 2개 간격
)
SELECT 
    user_id,
    purchase_count + 1 AS total_purchases,  -- 간격 개수 + 1
    ROUND(avg_purchase_cycle, 1) AS avg_days_between_purchases
FROM user_stats
ORDER BY avg_purchase_cycle;
```

### 해설

**핵심 개념**
- `LEAD()`: 다음 행 날짜 가져오기
- 날짜 빼기: PostgreSQL은 자동으로 일 수 계산
- N회 구매 = (N-1)개의 간격

**Q1**: 구매 주기 분포는?
```sql
SELECT 
    CASE 
        WHEN avg_purchase_cycle < 7 THEN '1주 이내'
        WHEN avg_purchase_cycle < 30 THEN '1주~1개월'
        WHEN avg_purchase_cycle < 90 THEN '1~3개월'
        ELSE '3개월 이상'
    END AS cycle_range,
    COUNT(*) AS user_count
FROM user_stats
GROUP BY cycle_range
ORDER BY MIN(avg_purchase_cycle);
```
