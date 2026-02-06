## Day 30: 종합 대시보드 쿼리 (All-in-One KPI)

### 난이도
⭐⭐⭐ 고급

### 비즈니스 맥락
토스 커머스의 경영진이 요청한 "월간 비즈니스 대시보드"입니다.
핵심 KPI를 한 번에 조회하여 비즈니스 현황을 파악합니다.

### 테이블 스키마
- **users**: user_id, signup_date
- **orders**: order_id, user_id, order_date, total_amount, status
- **order_items**: order_item_id, order_id, product_id, quantity, item_price

### 질문
2025년 1월의 종합 KPI를 한 번에 계산하세요:
1. 총 매출 (GMV)
2. 주문 수
3. 신규 가입자 수
4. 활성 구매자 수 (Active Buyers)
5. 객단가 (AOV)
6. 재구매율 (Repeat Purchase Rate)
7. 전월 대비 매출 증감률
8. 주문당 평균 상품 수

### 정답 쿼리
```sql
WITH current_month AS (
    SELECT 
        -- 1. GMV (Gross Merchandise Value)
        SUM(total_amount) AS gmv,
        
        -- 2. 주문 수
        COUNT(DISTINCT order_id) AS total_orders,
        
        -- 4. 활성 구매자 수
        COUNT(DISTINCT user_id) AS active_buyers,
        
        -- 5. 객단가 (AOV = Average Order Value)
        ROUND(AVG(total_amount), 0) AS aov
    FROM orders
    WHERE order_date >= '2025-01-01'
      AND order_date < '2025-02-01'
      AND status = 'completed'
),
previous_month AS (
    SELECT SUM(total_amount) AS prev_gmv
    FROM orders
    WHERE order_date >= '2024-12-01'
      AND order_date < '2025-01-01'
      AND status = 'completed'
),
new_signups AS (
    -- 3. 신규 가입자 수
    SELECT COUNT(*) AS new_users
    FROM users
    WHERE signup_date >= '2025-01-01'
      AND signup_date < '2025-02-01'
),
repeat_customers AS (
    -- 6. 재구매율
    SELECT 
        COUNT(DISTINCT user_id) AS repeat_buyers
    FROM orders
    WHERE user_id IN (
        SELECT user_id
        FROM orders
        WHERE order_date >= '2025-01-01'
          AND order_date < '2025-02-01'
          AND status = 'completed'
        GROUP BY user_id
        HAVING COUNT(*) >= 2
    )
),
items_per_order AS (
    -- 8. 주문당 평균 상품 수
    SELECT 
        AVG(item_count) AS avg_items_per_order
    FROM (
        SELECT 
            oi.order_id,
            COUNT(*) AS item_count
        FROM order_items oi
        JOIN orders o ON oi.order_id = o.order_id
        WHERE o.order_date >= '2025-01-01'
          AND o.order_date < '2025-02-01'
          AND o.status = 'completed'
        GROUP BY oi.order_id
    ) AS order_items_count
)
SELECT 
    '2025-01' AS period,
    
    -- 1. GMV
    cm.gmv,
    
    -- 2. 주문 수
    cm.total_orders,
    
    -- 3. 신규 가입자
    ns.new_users,
    
    -- 4. 활성 구매자
    cm.active_buyers,
    
    -- 5. 객단가
    cm.aov,
    
    -- 6. 재구매율
    ROUND(100.0 * rc.repeat_buyers / NULLIF(cm.active_buyers, 0), 2) AS repeat_rate_pct,
    
    -- 7. 전월 대비 매출 증감률
    ROUND(100.0 * (cm.gmv - pm.prev_gmv) / NULLIF(pm.prev_gmv, 0), 2) AS gmv_growth_pct,
    
    -- 8. 주문당 평균 상품 수
    ROUND(ipo.avg_items_per_order, 2) AS avg_items_per_order
    
FROM current_month cm
CROSS JOIN previous_month pm
CROSS JOIN new_signups ns
CROSS JOIN repeat_customers rc
CROSS JOIN items_per_order ipo;
```

### 해설

**핵심 개념**
- `CROSS JOIN`: 단일 행 테이블 결합
- 여러 CTE를 조합하여 종합 지표 생성
- 실무에서 자주 사용되는 대시보드 쿼리 패턴

**출력 예시**:
```
period   | gmv        | total_orders | new_users | active_buyers | aov     | repeat_rate | gmv_growth | avg_items
2025-01  | 12,500,000 | 3,450        | 1,200     | 2,800         | 3,623   | 18.57       | 12.34      | 2.8
```

**Q1**: 월별 추이를 한 번에 보려면?
```sql
-- UNION ALL로 여러 월 결합
-- 또는 generate_series + LATERAL JOIN
```

**Q2**: 더 많은 KPI 추가?
```sql
-- LTV (Lifetime Value)
-- Churn Rate
-- NPS (Net Promoter Score) - 설문 데이터 필요
-- CAC (Customer Acquisition Cost) - 마케팅 비용 데이터 필요
```

---

## 🎉 30일 챌린지 완료!

축하합니다! SQL Mastery 30을 모두 완료했습니다.

### 학습한 내용 요약
- **기초 (Day 1-10)**: GROUP BY, JOIN, 기본 집계 함수
- **중급 (Day 11-25)**: Window Function, Self JOIN, 퍼널 분석, RFM
- **고급 (Day 26-30)**: Recursive CTE, Cohort Analysis, Growth Accounting

### 다음 단계
1. 각 문제를 PostgreSQL/BigQuery에서 실행
2. 실제 데이터로 변형하여 포트폴리오에 추가
3. GitHub에 업로드하여 면접 준비 자료로 활용
