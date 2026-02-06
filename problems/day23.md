## Day 23: 채널별 ROAS 계산

### 난이도
⭐⭐ 중급

### 비즈니스 맥락
에이블리의 퍼포먼스 마케팅팀에서 "채널별 ROAS (Return on Ad Spend)"를 계산합니다.
광고비 대비 매출을 측정하여 효율적인 채널에 예산을 집중합니다.

### 테이블 스키마
- **marketing_spend**: channel, date, spend_amount
- **orders**: order_id, user_id, order_date, total_amount, channel

### 질문
2025년 1월 각 마케팅 채널의 총 광고비, 총 매출, ROAS를 계산하세요.
ROAS = 매출 / 광고비

### 정답 쿼리
```sql
WITH channel_spend AS (
    SELECT 
        channel,
        SUM(spend_amount) AS total_spend
    FROM marketing_spend
    WHERE date >= '2025-01-01'
      AND date < '2025-02-01'
    GROUP BY channel
),
channel_revenue AS (
    SELECT 
        channel,
        SUM(total_amount) AS total_revenue
    FROM orders
    WHERE order_date >= '2025-01-01'
      AND order_date < '2025-02-01'
      AND status = 'completed'
    GROUP BY channel
)
SELECT 
    COALESCE(cs.channel, cr.channel) AS channel,
    COALESCE(cs.total_spend, 0) AS ad_spend,
    COALESCE(cr.total_revenue, 0) AS revenue,
    CASE 
        WHEN cs.total_spend > 0 THEN 
            ROUND(cr.total_revenue / cs.total_spend, 2)
        ELSE 0
    END AS roas,
    COALESCE(cr.total_revenue, 0) - COALESCE(cs.total_spend, 0) AS profit
FROM channel_spend cs
FULL OUTER JOIN channel_revenue cr ON cs.channel = cr.channel
ORDER BY roas DESC;
```

### 해설

**핵심 개념**
- ROAS = 광고 수익률
- ROAS > 1: 수익
- ROAS < 1: 손실
- `FULL OUTER JOIN`: 광고비만 있거나 매출만 있는 경우 포함

**Q1**: CAC (고객 획득 비용)?
```sql
WITH new_customers AS (
    SELECT 
        channel,
        COUNT(DISTINCT user_id) AS new_users
    FROM orders
    WHERE order_date >= '2025-01-01'
      AND order_date < '2025-02-01'
      AND user_id IN (
          SELECT user_id FROM users WHERE signup_date >= '2025-01-01'
      )
    GROUP BY channel
)
SELECT 
    cs.channel,
    cs.total_spend,
    nc.new_users,
    ROUND(cs.total_spend / NULLIF(nc.new_users, 0), 2) AS cac
FROM channel_spend cs
LEFT JOIN new_customers nc ON cs.channel = nc.channel;
```
