## Day 9: 미구매 고객 수

### 난이도
⭐ 기초

### 비즈니스 맥락
당근마켓의 그로스팀에서 "가입 후 한 번도 거래하지 않은 사용자"를 파악합니다.
이들에게 첫 거래 유도 캠페인을 진행하려 합니다.

### 테이블 스키마
- **users**: user_id, signup_date
- **orders**: order_id, user_id, status

### 질문
2025년에 가입했지만 한 번도 구매(status='completed')하지 않은 사용자 수를 계산하세요.

### 정답 쿼리
```sql
SELECT COUNT(*) AS non_purchasers
FROM users u
LEFT JOIN orders o ON u.user_id = o.user_id AND o.status = 'completed'
WHERE u.signup_date >= '2025-01-01'
  AND u.signup_date < '2026-01-01'
  AND o.order_id IS NULL;
```

### 해설

**핵심 개념**
- LEFT JOIN + IS NULL 패턴
- "존재하지 않는" 데이터 찾기

**Q1**: NOT EXISTS 사용?
```sql
SELECT COUNT(*) AS non_purchasers
FROM users u
WHERE u.signup_date >= '2025-01-01'
  AND u.signup_date < '2026-01-01'
  AND NOT EXISTS (
      SELECT 1
      FROM orders o
      WHERE o.user_id = u.user_id
        AND o.status = 'completed'
  );
```

**Q2**: NOT IN 사용?
```sql
SELECT COUNT(*) AS non_purchasers
FROM users
WHERE signup_date >= '2025-01-01'
  AND signup_date < '2026-01-01'
  AND user_id NOT IN (
      SELECT DISTINCT user_id
      FROM orders
      WHERE status = 'completed'
  );
```
