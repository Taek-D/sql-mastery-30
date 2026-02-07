## Day 19: 월별 구독자 순증 계산

### 난이도
⭐⭐ 중급

### 비즈니스 맥락
넷플릭스의 그로스팀에서 "월별 구독자 순증"을 계산합니다.
신규 가입자 - 이탈자 = 순증을 추적하여 성장 추이를 파악합니다.

### 테이블 스키마
- **subscriptions**: subscription_id, user_id, start_date, end_date, status
  - status: 'active', 'cancelled', 'expired'

> [!NOTE]
> **PostgreSQL 전용**
> 이 문제는 SQLite에서 지원하지 않는 문법(`FULL OUTER JOIN`)을 사용합니다.
> 웹 에디터 대신 [SQL Playground](https://www.db-fiddle.com/) 사용을 권장합니다.

### 질문
2025년 각 월의 신규 가입자, 해지자, 순증을 계산하세요.

### 정답 쿼리
```sql
WITH monthly_new AS (
    SELECT 
        DATE_TRUNC('month', start_date) AS month,
        COUNT(*) AS new_subscriptions
    FROM subscriptions
    WHERE start_date >= '2025-01-01'
      AND start_date < '2026-01-01'
    GROUP BY DATE_TRUNC('month', start_date)
),
monthly_churn AS (
    SELECT 
        DATE_TRUNC('month', end_date) AS month,
        COUNT(*) AS churned_subscriptions
    FROM subscriptions
    WHERE end_date >= '2025-01-01'
      AND end_date < '2026-01-01'
      AND status IN ('cancelled', 'expired')
    GROUP BY DATE_TRUNC('month', end_date)
)
SELECT 
    COALESCE(mn.month, mc.month) AS month,
    COALESCE(mn.new_subscriptions, 0) AS new_subs,
    COALESCE(mc.churned_subscriptions, 0) AS churned_subs,
    COALESCE(mn.new_subscriptions, 0) - COALESCE(mc.churned_subscriptions, 0) AS net_growth
FROM monthly_new mn
FULL OUTER JOIN monthly_churn mc ON mn.month = mc.month
ORDER BY month;
```

### 해설

**핵심 개념**
- `FULL OUTER JOIN`: 신규/해지 모두 포함
- `COALESCE()`: NULL을 0으로 변환
- 순증 = 신규 - 해지

**Q1**: 월말 누적 구독자 수는?
```sql
WITH monthly_growth AS (
    -- 위 쿼리 결과
),
cumulative AS (
    SELECT 
        month,
        net_growth,
        SUM(net_growth) OVER (ORDER BY month) AS cumulative_subscribers
    FROM monthly_growth
)
SELECT * FROM cumulative;
```
