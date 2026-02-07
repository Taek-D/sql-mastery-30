## Day 11: 7일 Rolling MAU

### 난이도
⭐⭐ 중급

### 비즈니스 맥락
라프텔의 데이터팀에서 "7일 Rolling MAU (Monthly Active Users)"를 계산합니다.
특정 날짜 기준 최근 7일간 활동한 순 사용자 수를 추적하여 서비스 건강도를 모니터링합니다.

### 테이블 스키마
- **events**: event_id, user_id, event_date, event_type

> [!NOTE]
> **PostgreSQL 전용**
> 이 문제는 SQLite에서 지원하지 않는 문법(`FILTER`, `generate_series`)을 사용합니다.
> 웹 에디터 대신 [SQL Playground](https://www.db-fiddle.com/) 사용을 권장합니다.

### 질문
2025년 1월 8일부터 1월 31일까지 각 날짜의 7일 Rolling MAU를 계산하세요.
(각 날짜 기준 최근 7일간 활동한 고유 사용자 수)

### 정답 쿼리
```sql
SELECT 
    DATE(event_date) AS date,
    COUNT(DISTINCT user_id) FILTER (
        WHERE event_date >= DATE(event_date) - INTERVAL '6 days'
          AND event_date <= DATE(event_date)
    ) AS rolling_7day_mau
FROM events
WHERE event_date >= '2025-01-08'
  AND event_date < '2025-02-01'
GROUP BY DATE(event_date)
ORDER BY date;
```

**윈도우 함수 사용**:
```sql
WITH daily_users AS (
    SELECT DISTINCT 
        DATE(event_date) AS event_day,
        user_id
    FROM events
    WHERE event_date >= '2025-01-01' -- 1월 8일 기준 7일 포함
      AND event_date < '2025-02-01'
),
date_range AS (
    SELECT generate_series(
        DATE '2025-01-08',
        DATE '2025-01-31',
        INTERVAL '1 day'
    )::DATE AS calc_date
)
SELECT 
    dr.calc_date,
    COUNT(DISTINCT du.user_id) AS rolling_7day_mau
FROM date_range dr
LEFT JOIN daily_users du 
    ON du.event_day >= dr.calc_date - INTERVAL '6 days'
   AND du.event_day <= dr.calc_date
GROUP BY dr.calc_date
ORDER BY dr.calc_date;
```

### 해설

**핵심 개념**
- Rolling Window: 이동 시간 범위
- DISTINCT 중요: 같은 사용자가 여러 번 활동해도 1명

**Q1**: DAU/MAU 비율도 계산?
```sql
WITH daily_active AS (
    SELECT 
        DATE(event_date) AS day,
        COUNT(DISTINCT user_id) AS dau
    FROM events
    GROUP BY DATE(event_date)
),
rolling_mau AS (
    -- 위 쿼리
)
SELECT 
    rm.calc_date,
    da.dau,
    rm.rolling_7day_mau AS mau,
    ROUND(100.0 * da.dau / NULLIF(rm.rolling_7day_mau, 0), 2) AS dau_mau_ratio
FROM rolling_mau rm
LEFT JOIN daily_active da ON rm.calc_date = da.day;
```
