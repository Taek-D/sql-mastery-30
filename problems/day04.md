## Day 4: 평균 주문 금액이 10만원 이상인 사용자

### 난이도
⭐ 기초

### 비즈니스 맥락
무신사의 VIP 고객 관리팀에서 "고액 결제 고객"을 식별하려 합니다.
평균 주문 금액이 10만원 이상인 고객에게 특별 할인 쿠폰을 발송할 예정입니다.

### 테이블 스키마
- **orders**: order_id, user_id, order_date, total_amount, status

### 질문
2025년 전체 기간 동안 평균 주문 금액이 100,000원 이상인 사용자의 수를 계산하세요.
(status = 'completed'인 주문만 집계)

### 힌트
<details>
<summary>힌트 보기</summary>

- Subquery로 사용자별 평균 주문 금액 계산
- `AVG(total_amount) >= 100000` 조건 적용
- 외부 쿼리에서 사용자 수 COUNT

</details>

### 정답 쿼리
```sql
SELECT COUNT(*) AS high_value_customers
FROM (
    SELECT user_id
    FROM orders
    WHERE order_date >= '2025-01-01' 
      AND order_date < '2026-01-01'
      AND status = 'completed'
    GROUP BY user_id
    HAVING AVG(total_amount) >= 100000
) AS high_spenders;
```

### 해설

**핵심 개념**
- `AVG()` 집계 함수로 평균 계산
- `HAVING`으로 집계 결과 필터링
- Subquery 패턴 활용

**Q1**: CTE로 작성하면?
```sql
WITH high_spenders AS (
    SELECT user_id, AVG(total_amount) AS avg_order
    FROM orders
    WHERE order_date >= '2025-01-01' 
      AND order_date < '2026-01-01'
      AND status = 'completed'
    GROUP BY user_id
    HAVING AVG(total_amount) >= 100000
)
SELECT COUNT(*) AS high_value_customers
FROM high_spenders;
```
