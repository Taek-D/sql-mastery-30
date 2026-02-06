## Day 5: 이번 달 가입자 중 구매 완료한 사용자 비율

### 난이도
⭐ 기초

### 비즈니스 맥락
쿠팡의 신규 가입자 전환율을 측정합니다.
"이번 달 가입한 사용자 중 실제로 구매까지 완료한 비율"을 계산해 온보딩 효과를 평가합니다.

### 테이블 스키마
- **users**: user_id, signup_date
- **orders**: order_id, user_id, order_date, status

### 질문
2025년 1월에 가입한 사용자 중 같은 달에 최소 1회 이상 구매(status='completed')한 사용자의 비율(%)을 계산하세요.

### 힌트
<details>
<summary>힌트 보기</summary>

- LEFT JOIN으로 가입자와 주문 연결
- COUNT(DISTINCT ...)로 구매 완료 사용자 수 계산
- 비율 = (구매 사용자 / 전체 가입자) * 100

</details>

### 정답 쿼리
```sql
WITH jan_signups AS (
    SELECT user_id
    FROM users
    WHERE signup_date >= '2025-01-01' 
      AND signup_date < '2025-02-01'
),
jan_purchasers AS (
    SELECT DISTINCT u.user_id
    FROM jan_signups u
    JOIN orders o ON u.user_id = o.user_id
    WHERE o.order_date >= '2025-01-01' 
      AND o.order_date < '2025-02-01'
      AND o.status = 'completed'
)
SELECT 
    COUNT(DISTINCT js.user_id) AS total_signups,
    COUNT(DISTINCT jp.user_id) AS purchasers,
    ROUND(100.0 * COUNT(DISTINCT jp.user_id) / COUNT(DISTINCT js.user_id), 2) AS conversion_rate_pct
FROM jan_signups js
LEFT JOIN jan_purchasers jp ON js.user_id = jp.user_id;
```

### 해설

**핵심 개념**
- CTE로 복잡한 로직 분리
- LEFT JOIN으로 전체 가입자 유지
- 비율 계산 시 `100.0 *` (소수점 계산)

**Q1**: 더 간단한 방법은?
```sql
SELECT 
    COUNT(DISTINCT u.user_id) AS total_signups,
    COUNT(DISTINCT o.user_id) AS purchasers,
    ROUND(100.0 * COUNT(DISTINCT o.user_id) / COUNT(DISTINCT u.user_id), 2) AS conversion_rate_pct
FROM users u
LEFT JOIN orders o ON u.user_id = o.user_id 
    AND o.order_date >= '2025-01-01' 
    AND o.order_date < '2025-02-01'
    AND o.status = 'completed'
WHERE u.signup_date >= '2025-01-01' 
  AND u.signup_date < '2025-02-01';
```
