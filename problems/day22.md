## Day 22: 일별 활성 사용자 중앙값

### 난이도
⭐⭐ 중급

### 비즈니스 맥락
라프텔의 데이터팀에서 "일별 활성 사용자의 중앙값"을 계산합니다.
평균은 이상치에 민감하므로 중앙값으로 대표값을 파악합니다.

### 테이블 스키마
- **events**: event_id, user_id, event_date

### 질문
2025년 1월 각 날짜의 활성 사용자 수 중앙값을 계산하세요.

### 정답 쿼리
```sql
WITH daily_active_users AS (
    SELECT 
        DATE(event_date) AS day,
        COUNT(DISTINCT user_id) AS dau
    FROM events
    WHERE event_date >= '2025-01-01'
      AND event_date < '2025-02-01'
    GROUP BY DATE(event_date)
)
SELECT 
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY dau) AS median_dau,
    AVG(dau) AS mean_dau,
    MIN(dau) AS min_dau,
    MAX(dau) AS max_dau
FROM daily_active_users;
```

**날짜별 누적 중앙값**:
```sql
WITH daily_active_users AS (
    SELECT 
        DATE(event_date) AS day,
        COUNT(DISTINCT user_id) AS dau
    FROM events
    WHERE event_date >= '2025-01-01'
      AND event_date < '2025-02-01'
    GROUP BY DATE(event_date)
)
SELECT 
    day,
    dau,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY dau) 
        OVER (ORDER BY day ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) AS rolling_7day_median
FROM daily_active_users
ORDER BY day;
```

### 해설

**핵심 개념**
- `PERCENTILE_CONT(0.5)`: 연속형 중앙값
- `PERCENTILE_DISC(0.5)`: 이산형 중앙값 (실제 존재하는 값)
- `WITHIN GROUP`: 정렬 기준

**Q1**: 75th percentile (상위 25%)?
```sql
SELECT PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY dau) AS p75_dau
FROM daily_active_users;
```
