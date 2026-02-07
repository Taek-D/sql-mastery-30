## Day 17: 구매 전환 퍼널 분석

### 난이도
⭐⭐ 중급

### 비즈니스 맥락
쿠팡의 CX팀에서 "회원가입 → 첫 구매까지의 전환율"을 분석합니다.
어느 단계에서 이탈이 많은지 파악하여 개선점을 찾습니다.

### 테이블 스키마
- **sub_users**: user_id, signup_date
- **events**: event_id, user_id, event_date, event_type
  - event_type: 'signup', 'product_view', 'add_to_cart', 'checkout', 'purchase'

### 질문
2025년 1월 가입 사용자의 각 퍼널 단계별 전환율을 계산하세요.
(signup → product_view → add_to_cart → checkout → purchase)

### 정답 쿼리
```sql
WITH jan_users AS (
    SELECT user_id
    FROM sub_users
    WHERE signup_date >= '2025-01-01'
      AND signup_date < '2025-02-01'
),
funnel_stages AS (
    SELECT 
        'signup' AS stage,
        COUNT(DISTINCT ju.user_id) AS users,
        1 AS step_order
    FROM jan_users ju
    
    UNION ALL
    
    SELECT 
        'product_view',
        COUNT(DISTINCT e.user_id),
        2
    FROM jan_users ju
    JOIN events e ON ju.user_id = e.user_id 
        AND e.event_type = 'product_view'
        AND e.event_date >= '2025-01-01'
    
    UNION ALL
    
    SELECT 
        'add_to_cart',
        COUNT(DISTINCT e.user_id),
        3
    FROM jan_users ju
    JOIN events e ON ju.user_id = e.user_id 
        AND e.event_type = 'add_to_cart'
        AND e.event_date >= '2025-01-01'
    
    UNION ALL
    
    SELECT 
        'checkout',
        COUNT(DISTINCT e.user_id),
        4
    FROM jan_users ju
    JOIN events e ON ju.user_id = e.user_id 
        AND e.event_type = 'checkout'
        AND e.event_date >= '2025-01-01'
    
    UNION ALL
    
    SELECT 
        'purchase',
        COUNT(DISTINCT e.user_id),
        5
    FROM jan_users ju
    JOIN events e ON ju.user_id = e.user_id 
        AND e.event_type = 'purchase'
        AND e.event_date >= '2025-01-01'
)
SELECT 
    stage,
    users,
    ROUND(100.0 * users / FIRST_VALUE(users) OVER (ORDER BY step_order), 2) AS conversion_from_signup,
    ROUND(100.0 * users / LAG(users) OVER (ORDER BY step_order), 2) AS conversion_from_previous
FROM funnel_stages
ORDER BY step_order;
```

### 해설

**핵심 개념**
- Funnel Analysis: 단계별 사용자 이탈 추적
- `FIRST_VALUE()`: 첫 단계 기준 전환율
- `LAG()`: 이전 단계 기준 전환율

**Q1**: 각 단계별 평균 소요 시간은?
```sql
WITH user_events AS (
    SELECT 
        user_id,
        event_type,
        MIN(event_date) AS first_event_time
    FROM events
    WHERE user_id IN (SELECT user_id FROM jan_users)
    GROUP BY user_id, event_type
)
SELECT 
    'product_view to add_to_cart' AS transition,
    AVG(
        EXTRACT(EPOCH FROM (cart.first_event_time - view.first_event_time)) / 3600
    ) AS avg_hours
FROM user_events view
JOIN user_events cart 
    ON view.user_id = cart.user_id
    AND view.event_type = 'product_view'
    AND cart.event_type = 'add_to_cart';
```
