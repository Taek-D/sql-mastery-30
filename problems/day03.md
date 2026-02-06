## Day 3: 재구매 고객 수

### 난이도
⭐ 기초

### 비즈니스 맥락
토스 커머스팀에서 "고객 충성도"를 측정하려 합니다.
2회 이상 구매한 고객(재구매 고객)의 수를 파악해 리텐션 전략을 수립하려 합니다.

### 테이블 스키마
- **orders**: order_id, user_id, order_date, total_amount, status

### 질문
2025년 전체 기간 동안 2회 이상 주문한 고객의 수를 계산하세요.
(status = 'completed'인 주문만 집계)

### 힌트 (클릭하여 펼치기)
<details>
<summary>힌트 보기</summary>

- `GROUP BY user_id`로 고객별 주문 수 계산
- `HAVING COUNT(*) >= 2`로 2회 이상 필터링
- 외부 쿼리에서 `COUNT(*)`로 고객 수 계산

</details>

### 정답 쿼리
```sql
SELECT COUNT(*) AS repeat_customers
FROM (
    SELECT user_id
    FROM orders
    WHERE order_date >= '2025-01-01' 
      AND order_date < '2026-01-01'
      AND status = 'completed'
    GROUP BY user_id
    HAVING COUNT(*) >= 2
) AS repeat_users;
```

### 해설

**왜 이 방법을 선택했는가?**
- **Subquery 사용**: 먼저 재구매 고객 목록을 추출한 후 COUNT
- `HAVING COUNT(*) >= 2`: GROUP BY 후 조건 필터링
- `status = 'completed'`: 취소/대기 주문 제외

**핵심 SQL 개념**
- **HAVING vs WHERE**: `WHERE`는 GROUP BY 전, `HAVING`은 GROUP BY 후 필터링
- **Subquery**: 쿼리 결과를 다시 쿼리할 수 있음
- **집계 후 집계**: 내부에서 고객별 주문 수 → 외부에서 고객 수

### 예상 추가 질문

**Q1**: CTE(WITH 절)로 쓰면 더 가독성이 좋지 않나요?  
**A1**: 맞습니다. 실무에서는 CTE를 선호합니다.

```sql
WITH repeat_users AS (
    SELECT user_id
    FROM orders
    WHERE order_date >= '2025-01-01' 
      AND order_date < '2026-01-01'
      AND status = 'completed'
    GROUP BY user_id
    HAVING COUNT(*) >= 2
)
SELECT COUNT(*) AS repeat_customers
FROM repeat_users;
```

**Q2**: `DISTINCT user_id`를 세면 안 되나요?  
**A2**: 안 됩니다. `DISTINCT`는 중복 제거만 하고, "2회 이상" 조건을 체크하지 못합니다.

```sql
-- 잘못된 방법 (모든 고객 수를 셈)
SELECT COUNT(DISTINCT user_id)
FROM orders
WHERE order_date >= '2025-01-01' 
  AND status = 'completed';
```

**Q3**: 만약 "정확히 2회 구매한 고객"을 찾으려면?  
**A3**: `HAVING COUNT(*) = 2`로 변경하면 됩니다.

```sql
SELECT COUNT(*) AS exactly_two_orders
FROM (
    SELECT user_id
    FROM orders
    WHERE order_date >= '2025-01-01' 
      AND order_date < '2026-01-01'
      AND status = 'completed'
    GROUP BY user_id
    HAVING COUNT(*) = 2
) AS two_time_customers;
```

**Q4**: 재구매율(%)도 함께 계산하려면?  
**A4**: 전체 고객 수 대비 재구매 고객 비율을 계산합니다.

```sql
WITH total_customers AS (
    SELECT COUNT(DISTINCT user_id) AS total
    FROM orders
    WHERE order_date >= '2025-01-01' 
      AND order_date < '2026-01-01'
      AND status = 'completed'
),
repeat_customers AS (
    SELECT COUNT(*) AS repeat
    FROM (
        SELECT user_id
        FROM orders
        WHERE order_date >= '2025-01-01' 
          AND order_date < '2026-01-01'
          AND status = 'completed'
        GROUP BY user_id
        HAVING COUNT(*) >= 2
    ) AS repeat_users
)
SELECT 
    tc.total AS total_customers,
    rc.repeat AS repeat_customers,
    ROUND(100.0 * rc.repeat / tc.total, 2) AS repeat_rate_pct
FROM total_customers tc, repeat_customers rc;
```
