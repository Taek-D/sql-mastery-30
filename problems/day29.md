## Day 29: 복잡한 Moving Average (이동 평균선)

### 난이도
⭐⭐⭐ 고급

### 비즈니스 맥락
쿠팡의 예측팀에서 "7일/30일 이동 평균 매출"을 계산합니다.
단기/장기 트렌드를 비교하여 매출 변화를 조기에 감지합니다.

### 테이블 스키마
- **orders**: order_id, order_date, total_amount, status

### 질문
2025년 1월 각 날짜의:
- 일별 매출
- 7일 이동 평균
- 30일 이동 평균
- 7일 평균과 30일 평균의 차이 (골든 크로스/데드 크로스 감지)
를 계산하세요.

### 정답 쿼리
```sql
WITH daily_revenue AS (
    SELECT 
        DATE(order_date) AS day,
        SUM(total_amount) AS daily_sales
    FROM orders
    WHERE order_date >= '2024-12-01'  -- 30일 이동평균을 위해 더 많은 데이터 필요
      AND order_date < '2025-02-01'
      AND status = 'completed'
    GROUP BY DATE(order_date)
),
moving_averages AS (
    SELECT 
        day,
        daily_sales,
        AVG(daily_sales) OVER (
            ORDER BY day
            ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
        ) AS ma_7day,
        AVG(daily_sales) OVER (
            ORDER BY day
            ROWS BETWEEN 29 PRECEDING AND CURRENT ROW
        ) AS ma_30day
    FROM daily_revenue
)
SELECT 
    day,
    ROUND(daily_sales, 0) AS daily_sales,
    ROUND(ma_7day, 0) AS ma_7,
    ROUND(ma_30day, 0) AS ma_30,
    ROUND(ma_7day - ma_30day, 0) AS ma_diff,
    CASE 
        WHEN ma_7day > ma_30day THEN '상승 추세 (골든 크로스)'
        WHEN ma_7day < ma_30day THEN '하락 추세 (데드 크로스)'
        ELSE '중립'
    END AS trend_signal,
    LAG(ma_7day - ma_30day) OVER (ORDER BY day) AS prev_diff,
    CASE 
        WHEN (ma_7day - ma_30day) > 0 
             AND LAG(ma_7day - ma_30day) OVER (ORDER BY day) <= 0 
        THEN '⚠️ 골든 크로스 발생'
        WHEN (ma_7day - ma_30day) < 0 
             AND LAG(ma_7day - ma_30day) OVER (ORDER BY day) >= 0 
        THEN '⚠️ 데드 크로스 발생'
        ELSE ''
    END AS crossover_alert
FROM moving_averages
WHERE day >= '2025-01-01'  -- 2025년 1월만 출력
ORDER BY day;
```

### 해설

**핵심 개념**
- Moving Average: 이동 평균선
- `ROWS BETWEEN N PRECEDING AND CURRENT ROW`: N+1일 평균
- 골든 크로스: 단기 > 장기 (상승 신호)
- 데드 크로스: 단기 < 장기 (하락 신호)

**Q1**: EMA (지수 이동 평균)?
```sql
-- EMA는 SQL보다 Python/R이 적합
-- SQL로는 Recursive CTE로 구현 가능하나 복잡함
```

**Q2**: 표준편차 기반 Bollinger Bands?
```sql
SELECT 
    day,
    ma_7day,
    STDDEV(daily_sales) OVER (
        ORDER BY day
        ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
    ) AS std_7day,
    ma_7day + 2 * STDDEV(daily_sales) OVER (...) AS upper_band,
    ma_7day - 2 * STDDEV(daily_sales) OVER (...) AS lower_band
FROM daily_revenue;
```
