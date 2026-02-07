## Day 12: 코호트별 D7/D30 리텐션율

### 난이도
⭐⭐ 중급

### 비즈니스 맥락
토스의 그로스팀에서 "가입 코호트별 리텐션율"을 계산합니다.
특정 월에 가입한 사용자 중 7일 후, 30일 후에도 활동 중인 비율을 측정합니다.

### 테이블 스키마
- **sub_users**: user_id, signup_date
- **events**: event_id, user_id, event_date

### 질문
2025년 1월에 가입한 사용자의 D7 리텐션율(7일 후), D30 리텐션율(30일 후)을 계산하세요.

### 정답 쿼리
```sql
WITH jan_cohort AS (
    SELECT user_id, signup_date
    FROM sub_users
    WHERE signup_date >= '2025-01-01'
      AND signup_date < '2025-02-01'
),
d7_active AS (
    SELECT DISTINCT jc.user_id
    FROM jan_cohort jc
    JOIN events e ON jc.user_id = e.user_id
    WHERE e.event_date >= jc.signup_date + INTERVAL '7 days'
      AND e.event_date < jc.signup_date + INTERVAL '8 days'
),
d30_active AS (
    SELECT DISTINCT jc.user_id
    FROM jan_cohort jc
    JOIN events e ON jc.user_id = e.user_id
    WHERE e.event_date >= jc.signup_date + INTERVAL '30 days'
      AND e.event_date < jc.signup_date + INTERVAL '31 days'
)
SELECT 
    COUNT(DISTINCT jc.user_id) AS total_users,
    COUNT(DISTINCT d7.user_id) AS d7_retained,
    COUNT(DISTINCT d30.user_id) AS d30_retained,
    ROUND(100.0 * COUNT(DISTINCT d7.user_id) / COUNT(DISTINCT jc.user_id), 2) AS d7_retention_pct,
    ROUND(100.0 * COUNT(DISTINCT d30.user_id) / COUNT(DISTINCT jc.user_id), 2) AS d30_retention_pct
FROM jan_cohort jc
LEFT JOIN d7_active d7 ON jc.user_id = d7.user_id
LEFT JOIN d30_active d30 ON jc.user_id = d30.user_id;
```

### 해설

**핵심 개념**
- 코호트 분석: 같은 시기 가입자 그룹
- Self JOIN: 가입일 기준 N일 후 계산
- 리텐션 = (N일 후 활동자 / 전체) * 100
