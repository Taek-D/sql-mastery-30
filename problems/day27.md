## Day 27: 월별 신규/기존 사용자 매출 분해

### 난이도
⭐⭐⭐ 고급

### 비즈니스 맥락
토스 커머스의 데이터팀에서 "성장 회계(Growth Accounting)"를 수행합니다.
월별 매출을 신규 고객, 기존 고객(재구매), 이탈로 분해하여 성장 원인을 파악합니다.

### 테이블 스키마
- **orders**: order_id, user_id, order_date, total_amount, status

### 질문
2025년 각 월의 매출을:
- 신규 고객 매출
- 기존 고객 재구매 매출
- 이탈 고객 매출 (전월 구매했으나 당월 미구매)
로 분해하세요.

### 정답 쿼리
```sql
WITH monthly_users AS (
    SELECT 
        DATE_TRUNC('month', order_date) AS month,
        user_id,
        SUM(total_amount) AS user_revenue,
        MIN(order_date) AS first_order_date
    FROM orders
    WHERE order_date >= '2025-01-01'
      AND order_date < '2026-01-01'
      AND status = 'completed'
    GROUP BY DATE_TRUNC('month', order_date), user_id
),
user_classification AS (
    SELECT 
        mu.month,
        mu.user_id,
        mu.user_revenue,
        CASE 
            WHEN DATE_TRUNC('month', mu.first_order_date) = mu.month THEN 'new'
            ELSE 'returning'
        END AS user_type
    FROM monthly_users mu
),
previous_month_users AS (
    SELECT DISTINCT 
        DATE_TRUNC('month', order_date) + INTERVAL '1 month' AS next_month,
        user_id
    FROM orders
    WHERE status = 'completed'
),
churned_revenue AS (
    SELECT 
        pmu.next_month AS month,
        COALESCE(SUM(o_prev.total_amount), 0) AS churned_amount
    FROM previous_month_users pmu
    LEFT JOIN monthly_users mu 
        ON pmu.user_id = mu.user_id 
        AND pmu.next_month = mu.month
    LEFT JOIN orders o_prev 
        ON pmu.user_id = o_prev.user_id
        AND DATE_TRUNC('month', o_prev.order_date) = pmu.next_month - INTERVAL '1 month'
        AND o_prev.status = 'completed'
    WHERE mu.user_id IS NULL  -- 당월 구매하지 않음
    GROUP BY pmu.next_month
)
SELECT 
    uc.month,
    SUM(CASE WHEN uc.user_type = 'new' THEN uc.user_revenue ELSE 0 END) AS new_customer_revenue,
    SUM(CASE WHEN uc.user_type = 'returning' THEN uc.user_revenue ELSE 0 END) AS returning_customer_revenue,
    COALESCE(cr.churned_amount, 0) AS churned_revenue,
    SUM(uc.user_revenue) AS total_revenue
FROM user_classification uc
LEFT JOIN churned_revenue cr ON uc.month = cr.month
GROUP BY uc.month, cr.churned_amount
ORDER BY uc.month;
```

### 해설

**핵심 개념**
- Growth Accounting: 성장 분해
- 신규 = 당월 첫 구매
- 기존 = 이전 구매 이력 있음
- 이탈 = 전월 구매했으나 당월 미구매

**간소화된 버전**:
```sql
WITH monthly_revenue AS (
    SELECT 
        DATE_TRUNC('month', order_date) AS month,
        user_id,
        SUM(total_amount) AS revenue
    FROM orders
    WHERE status = 'completed'
    GROUP BY DATE_TRUNC('month', order_date), user_id
),
first_purchase AS (
    SELECT 
        user_id,
        DATE_TRUNC('month', MIN(order_date)) AS first_month
    FROM orders
    WHERE status = 'completed'
    GROUP BY user_id
)
SELECT 
    mr.month,
    SUM(CASE WHEN fp.first_month = mr.month THEN mr.revenue ELSE 0 END) AS new_revenue,
    SUM(CASE WHEN fp.first_month < mr.month THEN mr.revenue ELSE 0 END) AS returning_revenue
FROM monthly_revenue mr
JOIN first_purchase fp ON mr.user_id = fp.user_id
GROUP BY mr.month
ORDER BY mr.month;
```
