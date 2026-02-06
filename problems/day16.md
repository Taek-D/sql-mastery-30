## Day 16: 전월 대비 매출 증감률

### 난이도
⭐⭐ 중급

### 비즈니스 맥락
토스 커머스의 경영진이 "월별 매출 성장률"을 요청했습니다.
전월 대비 매출이 얼마나 증가했는지 추적하여 성장 흐름을 파악합니다.

### 테이블 스키마
- **orders**: order_id, order_date, total_amount, status

### 질문
2025년 각 월의 총 매출과 전월 대비 증감률(%)을 계산하세요.

### 정답 쿼리
```sql
WITH monthly_revenue AS (
    SELECT 
        DATE_TRUNC('month', order_date) AS month,
        SUM(total_amount) AS revenue
    FROM orders
    WHERE order_date >= '2025-01-01'
      AND order_date < '2026-01-01'
      AND status = 'completed'
    GROUP BY DATE_TRUNC('month', order_date)
)
SELECT 
    month,
    revenue AS current_revenue,
    LAG(revenue) OVER (ORDER BY month) AS previous_revenue,
    ROUND(
        100.0 * (revenue - LAG(revenue) OVER (ORDER BY month)) 
        / NULLIF(LAG(revenue) OVER (ORDER BY month), 0), 
        2
    ) AS growth_rate_pct
FROM monthly_revenue
ORDER BY month;
```

### 해설

**핵심 개념**
- `LAG()`: 이전 행 값 참조
- `NULLIF()`: 0으로 나누기 방지
- 증감률 = (현재 - 이전) / 이전 × 100

**Q1**: 전년 동월 대비는?
```sql
-- LAG(revenue, 12) OVER (ORDER BY month)
-- 12개월 전 값 가져오기
```

**Q2**: YoY (Year over Year)?
```sql
WITH yearly_revenue AS (
    SELECT 
        EXTRACT(YEAR FROM order_date) AS year,
        SUM(total_amount) AS revenue
    FROM orders
    WHERE status = 'completed'
    GROUP BY EXTRACT(YEAR FROM order_date)
)
SELECT 
    year,
    revenue,
    LAG(revenue) OVER (ORDER BY year) AS prev_year_revenue,
    ROUND(
        100.0 * (revenue - LAG(revenue) OVER (ORDER BY year)) 
        / NULLIF(LAG(revenue) OVER (ORDER BY year), 0), 
        2
    ) AS yoy_growth_pct
FROM yearly_revenue;
```
