## Day 10: 주문당 평균 상품 개수

### 난이도
⭐ 기초

### 비즈니스 맥락
쿠팡의 물류팀에서 "주문당 평균 상품 개수"를 분석합니다.
포장 크기 최적화를 위해 이 지표를 활용합니다.

### 테이블 스키마
- **orders**: order_id, status
- **order_items**: order_item_id, order_id, quantity

### 질문
2025년 1월 완료된 주문(status='completed')의 주문당 평균 상품 개수를 계산하세요.

### 정답 쿼리
```sql
SELECT 
    ROUND(AVG(items_per_order), 2) AS avg_items_per_order
FROM (
    SELECT 
        o.order_id,
        SUM(oi.quantity) AS items_per_order
    FROM orders o
    JOIN order_items oi ON o.order_id = oi.order_id
    WHERE o.order_date >= '2025-01-01'
      AND o.order_date < '2025-02-01'
      AND o.status = 'completed'
    GROUP BY o.order_id
) AS order_summary;
```

### 해설

**핵심 개념**
- 집계 후 다시 집계 (주문별 SUM → 전체 AVG)
- Subquery 패턴

**Q1**: 윈도우 함수로?
```sql
WITH order_totals AS (
    SELECT 
        o.order_id,
        SUM(oi.quantity) OVER (PARTITION BY o.order_id) AS total_items
    FROM orders o
    JOIN order_items oi ON o.order_id = oi.order_id
    WHERE o.order_date >= '2025-01-01'
      AND o.order_date < '2025-02-01'
      AND o.status = 'completed'
)
SELECT 
    ROUND(AVG(total_items), 2) AS avg_items_per_order
FROM (SELECT DISTINCT order_id, total_items FROM order_totals) AS distinct_orders;
```
