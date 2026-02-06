## Day 24: 사용자별 첫/마지막 활동 간격

### 난이도
⭐⭐ 중급

### 비즈니스 맥락
넷플릭스의 리텐션팀에서 "사용자별 활동 기간"을 분석합니다.
첫 활동부터 마지막 활동까지의 기간으로 사용자의 생애주기를 파악합니다.

### 테이블 스키마
- **events**: event_id, user_id, event_date, event_type

### 질문
각 사용자의 첫 활동일, 마지막 활동일, 활동 기간(일)을 계산하세요.
(최소 2회 이상 활동한 사용자만 포함)

### 정답 쿼리
```sql
WITH user_activity AS (
    SELECT 
        user_id,
        MIN(event_date) AS first_activity,
        MAX(event_date) AS last_activity,
        COUNT(*) AS total_events
    FROM events
    GROUP BY user_id
    HAVING COUNT(DISTINCT DATE(event_date)) >= 2  -- 최소 2일 활동
)
SELECT 
    user_id,
    first_activity,
    last_activity,
    last_activity - first_activity AS active_days,
    total_events,
    ROUND(total_events::NUMERIC / NULLIF(last_activity - first_activity, 0), 2) AS events_per_day
FROM user_activity
ORDER BY active_days DESC;
```

### 해설

**핵심 개념**
- `MIN()/MAX()`: 첫/마지막 값
- 날짜 빼기: 일 수 계산
- 활동 밀도 = 이벤트 수 / 활동 기간

**Q1**: 활동 기간별 사용자 분포?
```sql
SELECT 
    CASE 
        WHEN active_days < 7 THEN '1주 미만'
        WHEN active_days < 30 THEN '1주~1개월'
        WHEN active_days < 90 THEN '1~3개월'
        WHEN active_days < 365 THEN '3~12개월'
        ELSE '1년 이상'
    END AS activity_period,
    COUNT(*) AS user_count,
    ROUND(AVG(events_per_day), 2) AS avg_events_per_day
FROM (/* 위 쿼리 */) AS activity_stats
GROUP BY activity_period
ORDER BY MIN(active_days);
```
