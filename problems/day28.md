## Day 28: Cohort Retention Table (코호트 리텐션 테이블)

### 난이도
⭐⭐⭐ 고급

### 비즈니스 맥락
넷플릭스의 그로스팀에서 "월별 가입 코호트의 리텐션 매트릭스"를 생성합니다.
각 가입 월별로 M0, M1, M2... 리텐션율을 추적하여 코호트 분석을 수행합니다.

### 테이블 스키마
- **users**: user_id, signup_date
- **events**: event_id, user_id, event_date

### 질문
2025년 각 가입 월별 코호트의 월별 리텐션율을 계산하세요.
(M0 = 가입월, M1 = 가입 후 1개월, M2 = 가입 후 2개월...)

### 정답 쿼리
```sql
WITH signup_cohorts AS (
    SELECT 
        user_id,
        DATE_TRUNC('month', signup_date) AS cohort_month
    FROM users
    WHERE signup_date >= '2025-01-01'
      AND signup_date < '2026-01-01'
),
monthly_active AS (
    SELECT DISTINCT
        DATE_TRUNC('month', event_date) AS activity_month,
        user_id
    FROM events
    WHERE event_date >= '2025-01-01'
),
cohort_activity AS (
    SELECT 
        sc.cohort_month,
        ma.activity_month,
        COUNT(DISTINCT ma.user_id) AS active_users,
        COUNT(DISTINCT sc.user_id) AS cohort_size,
        EXTRACT(MONTH FROM AGE(ma.activity_month, sc.cohort_month)) AS months_since_signup
    FROM signup_cohorts sc
    LEFT JOIN monthly_active ma 
        ON sc.user_id = ma.user_id
        AND ma.activity_month >= sc.cohort_month
    GROUP BY sc.cohort_month, ma.activity_month
)
SELECT 
    cohort_month,
    cohort_size,
    months_since_signup AS month_number,
    active_users,
    ROUND(100.0 * active_users / cohort_size, 2) AS retention_pct
FROM cohort_activity
WHERE months_since_signup IS NOT NULL
ORDER BY cohort_month, months_since_signup;
```

**피벗 테이블 형식** (PostgreSQL crosstab):
```sql
WITH cohort_retention AS (
    -- 위 쿼리 결과
)
SELECT 
    cohort_month,
    MAX(CASE WHEN month_number = 0 THEN retention_pct END) AS m0,
    MAX(CASE WHEN month_number = 1 THEN retention_pct END) AS m1,
    MAX(CASE WHEN month_number = 2 THEN retention_pct END) AS m2,
    MAX(CASE WHEN month_number = 3 THEN retention_pct END) AS m3,
    MAX(CASE WHEN month_number = 4 THEN retention_pct END) AS m4,
    MAX(CASE WHEN month_number = 5 THEN retention_pct END) AS m5
FROM cohort_retention
GROUP BY cohort_month
ORDER BY cohort_month;
```

### 해설

**핵심 개념**
- Cohort Analysis: 동일 시기 가입자 그룹 추적
- Retention Table: 리텐션 매트릭스 시각화
- `AGE()`: 날짜 간격 계산
- Pivot: 행을 열로 전환

**예시 출력**:
```
cohort_month | m0  | m1  | m2  | m3
2025-01-01   | 100 | 45  | 38  | 32
2025-02-01   | 100 | 52  | 41  | NULL
2025-03-01   | 100 | 48  | NULL| NULL
```
