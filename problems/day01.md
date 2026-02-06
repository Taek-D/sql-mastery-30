## Day 1: 월별 신규 가입자 수

### 난이도
⭐ 기초

### 비즈니스 맥락
에이블리의 그로스팀에서 "최근 6개월 월별 신규 가입자 추이"를 요청했습니다. 
마케팅 캠페인 효과를 분석하고, 어느 달에 신규 유입이 많았는지 파악하려 합니다.

### 테이블 스키마
- **users**: user_id, signup_date, region, user_segment

### 질문
2025년 1월부터 6월까지 각 월별 신규 가입자 수를 계산하세요.
결과는 월별로 정렬되어야 합니다.

### 힌트 (클릭하여 펼치기)
<details>
<summary>힌트 보기</summary>

- `DATE_TRUNC()` 함수로 날짜를 월 단위로 자를 수 있습니다
- `GROUP BY`로 월별로 그룹화   
- `COUNT(*)`로 각 그룹의 사용자 수 계산

</details>

### 정답 쿼리
```sql
SELECT 
    DATE_TRUNC('month', signup_date) AS signup_month,
    COUNT(*) AS new_users
FROM users
WHERE signup_date >= '2025-01-01' 
  AND signup_date < '2025-07-01'
GROUP BY DATE_TRUNC('month', signup_date)
ORDER BY signup_month;
```

### 해설

**왜 이 방법을 선택했는가?**
- `DATE_TRUNC('month', signup_date)`: 날짜를 월의 첫날로 변환 (예: 2025-01-15 → 2025-01-01)
- `WHERE` 절로 먼저 필터링하면 GROUP BY 전에 불필요한 데이터 제거 가능
- `COUNT(*)`는 NULL이 아닌 모든 행을 세므로 안전

**핵심 SQL 개념**
- **날짜 함수**: `DATE_TRUNC()`는 날짜를 지정한 단위로 자름
- **집계 함수**: `COUNT(*)`는 행의 개수를 셈
- **GROUP BY**: 동일한 월을 가진 행끼리 묶어서 집계

### 예상 추가 질문

**Q1**: `DATE_TRUNC` 대신 `EXTRACT(YEAR FROM ...), EXTRACT(MONTH FROM ...)` 조합도 가능한가요?  
**A1**: 네, 가능합니다. 하지만 `DATE_TRUNC`가 더 간결하고, 결과가 날짜 타입이므로 시각화 도구에서 다루기 쉽습니다.

```sql
-- 대안 방법
SELECT 
    EXTRACT(YEAR FROM signup_date) AS year,
    EXTRACT(MONTH FROM signup_date) AS month,
    COUNT(*) AS new_users
FROM users
WHERE signup_date >= '2025-01-01' 
  AND signup_date < '2025-07-01'
GROUP BY year, month
ORDER BY year, month;
```

**Q2**: `WHERE` 조건을 `BETWEEN`으로 쓸 수도 있나요?  
**A2**: 사용 가능하지만 주의가 필요합니다. `BETWEEN`은 양쪽 끝을 포함(inclusive)하므로 `'2025-06-30'`까지 명시해야 합니다.

```sql
-- BETWEEN 사용 시
WHERE signup_date BETWEEN '2025-01-01' AND '2025-06-30'
```

**Q3**: 만약 특정 월에 가입자가 0명이면 어떻게 표시하나요?  
**A3**: `generate_series()`로 모든 월을 생성하고 `LEFT JOIN`을 사용해야 합니다.

```sql
-- 0명인 달도 표시
WITH all_months AS (
    SELECT generate_series(
        '2025-01-01'::date, 
        '2025-06-01'::date, 
        '1 month'::interval
    )::date AS month
)
SELECT 
    am.month,
    COALESCE(COUNT(u.user_id), 0) AS new_users
FROM all_months am
LEFT JOIN users u ON DATE_TRUNC('month', u.signup_date) = am.month
GROUP BY am.month
ORDER BY am.month;
```
