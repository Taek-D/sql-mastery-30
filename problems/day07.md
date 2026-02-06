## Day 7: 구독 취소율 계산

### 난이도
⭐ 기초

### 비즈니스 맥락
넷플릭스의 retention 팀에서 "이번 달 구독 취소율"을 계산합니다.
월간 이탈률을 모니터링하여 서비스 개선 우선순위를 결정합니다.

### 테이블 스키마
- **subscriptions**: subscription_id, user_id, start_date, end_date, status

### 질문
2025년 1월에 활성 상태였던 구독 중 취소(status='cancelled')된 구독의 비율(%)을 계산하세요.

### 힌트
<details>
<summary>힌트 보기</summary>

- 1월 시작 시점 활성 구독 = start_date < 2025-02-01 AND (end_date IS NULL OR end_date >= 2025-01-01)
- 1월 중 취소 = status = 'cancelled' AND end_date BETWEEN ...
- 비율 = 취소 / 활성 * 100

</details>

### 정답 쿼리
```sql
WITH active_subs AS (
    SELECT subscription_id
    FROM subscriptions
    WHERE start_date < '2025-02-01'
      AND (end_date IS NULL OR end_date >= '2025-01-01')
),
cancelled_subs AS (
    SELECT subscription_id
    FROM subscriptions
    WHERE status = 'cancelled'
      AND end_date >= '2025-01-01'
      AND end_date < '2025-02-01'
)
SELECT 
    COUNT(DISTINCT a.subscription_id) AS active_count,
    COUNT(DISTINCT c.subscription_id) AS cancelled_count,
    ROUND(100.0 * COUNT(DISTINCT c.subscription_id) / COUNT(DISTINCT a.subscription_id), 2) AS churn_rate_pct
FROM active_subs a
LEFT JOIN cancelled_subs c ON a.subscription_id = c.subscription_id;
```

### 해설

**핵심 개념**
- 활성 상태 정의 (NULL 처리)
- 기간 필터링
- 비율 계산

**Q1**: 간단하게 한 번에 계산?
```sql
SELECT 
    COUNT(*) FILTER (WHERE start_date < '2025-02-01' AND (end_date IS NULL OR end_date >= '2025-01-01')) AS active,
    COUNT(*) FILTER (WHERE status = 'cancelled' AND end_date >= '2025-01-01' AND end_date < '2025-02-01') AS cancelled,
    ROUND(100.0 * 
        COUNT(*) FILTER (WHERE status = 'cancelled' AND end_date >= '2025-01-01' AND end_date < '2025-02-01') /
        COUNT(*) FILTER (WHERE start_date < '2025-02-01' AND (end_date IS NULL OR end_date >= '2025-01-01')), 2
    ) AS churn_rate
FROM subscriptions;
```
