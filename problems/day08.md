## Day 8: 사용자별 총 구매 금액 Top 10

### 난이도
⭐ 기초

### 비즈니스 맥락
올리브영의 마케팅팀에서 "최고 고객(Top Spenders)"을 식별합니다.
총 구매 금액 상위 10명에게 VIP 혜택을 제공할 예정입니다.

### 테이블 스키마
- **orders**: order_id, user_id, total_amount, status

### 질문
2025년 전체 기간 동안 사용자별 총 구매 금액을 계산하고, 상위 10명을 찾으세요.

### 정답 쿼리
```sql
SELECT 
    user_id,
    SUM(total_amount) AS total_spent
FROM orders
WHERE order_date >= '2025-01-01'
  AND order_date < '2026-01-01'
  AND status = 'completed'
GROUP BY user_id
ORDER BY total_spent DESC
LIMIT 10;
```

### 해설

**핵심 개념**
- SUM 집계
- ORDER BY DESC + LIMIT

**Q1**: 사용자 이름도 함께 표시?
```sql
SELECT 
    u.user_id,
    u.username,
    SUM(o.total_amount) AS total_spent
FROM orders o
JOIN users u ON o.user_id = u.user_id
WHERE o.order_date >= '2025-01-01'
  AND o.order_date < '2026-01-01'
  AND o.status = 'completed'
GROUP BY u.user_id, u.username
ORDER BY total_spent DESC
LIMIT 10;
```
