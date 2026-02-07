---
name: sql-conventions
description: SQL Mastery 30 프로젝트의 SQL 작성 컨벤션 상세 가이드
---

# SQL 작성 컨벤션

## 포맷팅

```sql
-- CTE 사용 예시 (권장 패턴)
WITH monthly_revenue AS (
    SELECT
        DATE_TRUNC('month', order_date) AS order_month,
        user_id,
        SUM(total_amount) AS revenue
    FROM orders
    WHERE status = 'completed'
    GROUP BY
        DATE_TRUNC('month', order_date),
        user_id
)
SELECT
    order_month,
    COUNT(DISTINCT user_id) AS active_users,
    ROUND(AVG(revenue), 2) AS avg_revenue_per_user
FROM monthly_revenue
GROUP BY order_month
ORDER BY order_month;
```

### 규칙 상세

| 규칙 | 올바른 예 | 잘못된 예 |
|------|----------|----------|
| 키워드 대문자 | `SELECT`, `FROM`, `WHERE` | `select`, `from`, `where` |
| 컬럼명 소문자 snake_case | `user_id`, `order_date` | `userId`, `OrderDate` |
| 들여쓰기 4 spaces | `    WHERE status = 'completed'` | `  WHERE status = 'completed'` |
| SELECT * 금지 | `SELECT user_id, signup_date` | `SELECT *` |
| CTE 선호 | `WITH cte AS (...)` | `SELECT * FROM (SELECT ...)` |
| 비즈니스 주석 | `-- 최근 30일 활성 사용자` | (주석 없음) |

### 절 순서 (각 주요 절은 새 줄)

```sql
WITH cte AS (...)       -- 1. CTE 정의
SELECT                  -- 2. 출력 컬럼
    column1,
    column2
FROM table1             -- 3. 주 테이블
JOIN table2             -- 4. 조인
    ON table1.id = table2.id
WHERE condition         -- 5. 필터
GROUP BY column1        -- 6. 그룹화
HAVING aggregate > 0    -- 7. 그룹 필터
ORDER BY column1        -- 8. 정렬
LIMIT 10;              -- 9. 제한
```

### Window Function 패턴

```sql
SELECT
    user_id,
    order_date,
    total_amount,
    ROW_NUMBER() OVER (
        PARTITION BY user_id
        ORDER BY order_date DESC
    ) AS rn,
    SUM(total_amount) OVER (
        PARTITION BY user_id
        ORDER BY order_date
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) AS cumulative_amount
FROM orders
WHERE status = 'completed';
```

### 안티패턴

```sql
-- BAD: 중첩 서브쿼리
SELECT * FROM (
    SELECT * FROM (
        SELECT user_id FROM orders
    ) sub1
) sub2;

-- BAD: SARGable 위반
WHERE YEAR(order_date) = 2024          -- 함수로 감싼 컬럼
WHERE total_amount + 100 > 500         -- 컬럼에 연산

-- GOOD: SARGable
WHERE order_date >= '2024-01-01'
    AND order_date < '2025-01-01'
WHERE total_amount > 400
```
