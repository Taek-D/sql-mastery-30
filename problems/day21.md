## Day 21: RFM 세그먼트 분류

### 난이도
⭐⭐⭐ 고급

### 비즈니스 맥락
토스 커머스의 CRM팀에서 "RFM 분석"을 수행합니다.
고객을 Recency(최근성), Frequency(빈도), Monetary(금액) 기준으로 세분화하여 맞춤형 마케팅을 진행합니다.

### 테이블 스키마
- **orders**: order_id, user_id, order_date, total_amount, status

### 질문
2025년 고객을 RFM 점수로 분류하세요.
- Recency: 최근 구매일 (낮을수록 좋음, 1~5점)
- Frequency: 구매 횟수 (높을수록 좋음, 1~5점)
- Monetary: 총 구매액 (높을수록 좋음, 1~5점)

### 정답 쿼리
```sql
WITH user_metrics AS (
    SELECT 
        user_id,
        MAX(order_date) AS last_order_date,
        COUNT(*) AS purchase_frequency,
        SUM(total_amount) AS total_spent
    FROM orders
    WHERE order_date >= '2025-01-01'
      AND order_date < '2026-01-01'
      AND status = 'completed'
    GROUP BY user_id
),
rfm_scores AS (
    SELECT 
        user_id,
        last_order_date,
        purchase_frequency,
        total_spent,
        -- Recency: 최근일수록 높은 점수 (역순)
        NTILE(5) OVER (ORDER BY last_order_date DESC) AS r_score,
        -- Frequency: 많을수록 높은 점수
        NTILE(5) OVER (ORDER BY purchase_frequency) AS f_score,
        -- Monetary: 클수록 높은 점수
        NTILE(5) OVER (ORDER BY total_spent) AS m_score
    FROM user_metrics
)
SELECT 
    user_id,
    last_order_date,
    purchase_frequency,
    total_spent,
    r_score,
    f_score,
    m_score,
    CONCAT(r_score, f_score, m_score) AS rfm_segment,
    CASE 
        WHEN r_score >= 4 AND f_score >= 4 AND m_score >= 4 THEN 'Champions'
        WHEN r_score >= 3 AND f_score >= 3 THEN 'Loyal Customers'
        WHEN r_score >= 4 THEN 'Recent Customers'
        WHEN r_score <= 2 AND f_score >= 3 THEN 'At Risk'
        WHEN r_score <= 2 AND f_score <= 2 THEN 'Lost'
        ELSE 'Others'
    END AS customer_segment
FROM rfm_scores
ORDER BY r_score DESC, f_score DESC, m_score DESC;
```

### 해설

**핵심 개념**
- `NTILE(5)`: 5개 그룹으로 분할 (1~5점)
- RFM 555 = 최상위 고객
- RFM 111 = 이탈 위험 고객

**Q1**: 세그먼트별 고객 수?
```sql
SELECT 
    customer_segment,
    COUNT(*) AS customer_count,
    ROUND(AVG(total_spent), 0) AS avg_ltv
FROM (/* 위 쿼리 */) AS rfm_result
GROUP BY customer_segment
ORDER BY customer_count DESC;
```
