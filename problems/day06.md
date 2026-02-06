## Day 6: 최근 30일 일별 주문 수 추이

### 난이도
⭐ 기초

### 비즈니스 맥락
배달의민족의 운영팀에서 "최근 주문량 추이"를 모니터링합니다.
일별 주문 수를 시각화하여 트래픽 패턴을 파악하려 합니다.

### 테이블 스키마
- **orders**: order_id, order_date, status

### 질문
2025년 1월 1일부터 1월 30일까지 일별 주문 수(status='completed')를 계산하세요.

### 힌트
<details>
<summary>힌트 보기</summary>

- DATE_TRUNC 또는 DATE로 날짜만 추출
- GROUP BY 날짜
- ORDER BY로 시간 순 정렬

</details>

### 정답 쿼리
```sql
SELECT 
    DATE(order_date) AS order_day,
    COUNT(*) AS order_count
FROM orders
WHERE order_date >= '2025-01-01' 
  AND order_date < '2025-01-31'
  AND status = 'completed'
GROUP BY DATE(order_date)
ORDER BY order_day;
```

### 해설

**핵심 개념**
- `DATE()` 함수로 타임스탬프에서 날짜만 추출
- 일별 집계 패턴

**Q1**: 주문이 없는 날도 0으로 표시하려면?
```sql
WITH RECURSIVE date_range AS (
    SELECT DATE('2025-01-01') AS day
    UNION ALL
    SELECT day + INTERVAL '1 day'
    FROM date_range
    WHERE day < DATE('2025-01-30')
)
SELECT 
    dr.day,
    COALESCE(COUNT(o.order_id), 0) AS order_count
FROM date_range dr
LEFT JOIN orders o ON DATE(o.order_date) = dr.day 
    AND o.status = 'completed'
GROUP BY dr.day
ORDER BY dr.day;
```
