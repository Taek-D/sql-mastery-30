## 면접 설명 가이드: Funnel Conversion Rate (퍼널 전환율)

### 개요
- **난이도**: ⭐⭐ 중급
- **예상 소요 시간**: 5분
- **핵심 SQL 개념**: CTE, LEFT JOIN, 조건부 집계 (CASE WHEN + COUNT), 비율 계산
- **자주 출제하는 기업**: 토스, 카카오, 네이버, 리디, 야놀자

---

### 1단계: 문제 이해 확인 (30초)

> "퍼널 전환율 분석은 사용자가 서비스의 주요 단계를 거치는 과정에서 각 단계별로 얼마나 이탈하고 얼마나 다음 단계로 넘어가는지를 측정하는 분석입니다. 구독 서비스를 기준으로 '가입 -> 첫 로그인 -> 콘텐츠 조회 -> 구독 전환'의 4단계 퍼널을 가정하겠습니다. 각 단계의 정의와 순서에 대해 추가 요구사항이 있으신지요? 그리고 반드시 순서대로 거쳐야 하는 Strict Funnel인지, 순서와 무관하게 도달 여부만 보는 Any-Order Funnel인지도 확인하겠습니다."

**확인할 사항:**
- 퍼널 단계 정의 및 순서
- 순서 강제(Strict) vs 순서 무관(Any-Order)
- 시간 제한 여부 (가입 후 7일 이내 등)
- 분석 기간

---

### 2단계: 접근 방법 설명 (1분)

> "네 단계로 접근하겠습니다."

1. **기준 코호트 정의**: 분석 기간 내 가입한 사용자를 기준 코호트로 설정합니다 (퍼널 Step 1).
2. **각 단계별 도달 사용자 식별**: events 테이블에서 각 event_type에 해당하는 사용자를 추출합니다.
3. **단계간 매칭**: LEFT JOIN으로 각 단계를 연결하여, 이전 단계 도달 사용자 중 다음 단계에 도달한 사용자를 찾습니다.
4. **전환율 계산**: 두 가지 전환율을 계산합니다. Step-to-Step 전환율(직전 단계 대비)과 Overall 전환율(최초 단계 대비).

> "핵심은 LEFT JOIN을 사용하여 이전 단계에 있지만 다음 단계에 없는 사용자(이탈자)도 포착하는 것입니다."

---

### 3단계: 쿼리 작성 (2분)

```sql
-- 퍼널 전환율 분석
-- 스키마: users(user_id, signup_date, plan_type)
--         subscriptions(subscription_id, user_id, start_date, end_date, plan_type, status)
--         events(event_id, user_id, event_date, event_type)

WITH funnel_step1 AS (
    -- Step 1: 가입 사용자 (기준 코호트)
    SELECT
        user_id,
        signup_date AS step1_date
    FROM users
    WHERE signup_date BETWEEN '2024-01-01' AND '2024-03-31'
),

funnel_step2 AS (
    -- Step 2: 첫 로그인
    SELECT
        user_id,
        MIN(event_date) AS step2_date
    FROM events
    WHERE event_type = 'login'
    GROUP BY user_id
),

funnel_step3 AS (
    -- Step 3: 콘텐츠 조회
    SELECT
        user_id,
        MIN(event_date) AS step3_date
    FROM events
    WHERE event_type = 'content_view'
    GROUP BY user_id
),

funnel_step4 AS (
    -- Step 4: 구독 전환
    SELECT
        user_id,
        MIN(start_date) AS step4_date
    FROM subscriptions
    WHERE status IN ('active', 'expired')
    GROUP BY user_id
),

funnel_joined AS (
    -- 모든 단계를 LEFT JOIN으로 연결 (순서 강제)
    SELECT
        s1.user_id,
        s1.step1_date,
        s2.step2_date,
        s3.step3_date,
        s4.step4_date,
        -- 순서 검증: 각 단계가 이전 단계 이후에 발생했는지
        CASE WHEN s2.step2_date >= s1.step1_date
             THEN 1 ELSE 0 END AS reached_step2,
        CASE WHEN s3.step3_date >= s2.step2_date
                  AND s2.step2_date >= s1.step1_date
             THEN 1 ELSE 0 END AS reached_step3,
        CASE WHEN s4.step4_date >= s3.step3_date
                  AND s3.step3_date >= s2.step2_date
                  AND s2.step2_date >= s1.step1_date
             THEN 1 ELSE 0 END AS reached_step4
    FROM funnel_step1 s1
    LEFT JOIN funnel_step2 s2 ON s1.user_id = s2.user_id
    LEFT JOIN funnel_step3 s3 ON s1.user_id = s3.user_id
    LEFT JOIN funnel_step4 s4 ON s1.user_id = s4.user_id
),

conversion_rates AS (
    -- 전환율 집계
    SELECT
        COUNT(*) AS step1_users,
        SUM(reached_step2) AS step2_users,
        SUM(reached_step3) AS step3_users,
        SUM(reached_step4) AS step4_users
    FROM funnel_joined
)

SELECT
    'Step 1: 가입' AS funnel_step,
    step1_users AS users,
    100.0 AS overall_rate_pct,
    NULL::NUMERIC AS step_conversion_pct
FROM conversion_rates

UNION ALL

SELECT
    'Step 2: 첫 로그인',
    step2_users,
    ROUND(step2_users::NUMERIC / step1_users * 100, 2),
    ROUND(step2_users::NUMERIC / step1_users * 100, 2)
FROM conversion_rates

UNION ALL

SELECT
    'Step 3: 콘텐츠 조회',
    step3_users,
    ROUND(step3_users::NUMERIC / step1_users * 100, 2),
    ROUND(step3_users::NUMERIC / NULLIF(step2_users, 0) * 100, 2)
FROM conversion_rates

UNION ALL

SELECT
    'Step 4: 구독 전환',
    step4_users,
    ROUND(step4_users::NUMERIC / step1_users * 100, 2),
    ROUND(step4_users::NUMERIC / NULLIF(step3_users, 0) * 100, 2)
FROM conversion_rates;
```

**쿼리 설명** (작성하면서 말할 내용):
- **CTE 1~4 (`funnel_step1` ~ `funnel_step4`)**: 각 퍼널 단계별로 사용자가 최초로 해당 이벤트를 수행한 날짜를 추출합니다. `MIN()`으로 첫 발생 시점을 기준으로 합니다.
- **CTE 5 (`funnel_joined`)**: LEFT JOIN으로 모든 단계를 연결합니다. 순서 검증을 위해 각 단계의 날짜가 이전 단계보다 같거나 이후인지 CASE WHEN으로 확인합니다.
- **CTE 6 (`conversion_rates`)**: 각 단계별 도달 사용자 수를 집계합니다.
- **최종 SELECT**: UNION ALL로 각 단계를 행으로 펼쳐서, Overall 전환율(Step 1 대비)과 Step-to-Step 전환율(직전 단계 대비)을 모두 보여줍니다.

---

### 4단계: 결과 검증 (1분)

> "다음과 같이 검증하겠습니다."

1. **단조 감소 확인**: 각 단계의 사용자 수는 반드시 이전 단계 이하여야 합니다. `step1 >= step2 >= step3 >= step4`
2. **개별 단계 검증**:
   ```sql
   -- Step 2 사용자 수 수동 검증
   SELECT COUNT(DISTINCT e.user_id)
   FROM users u
   INNER JOIN events e ON u.user_id = e.user_id
   WHERE u.signup_date BETWEEN '2024-01-01' AND '2024-03-31'
     AND e.event_type = 'login'
     AND e.event_date >= u.signup_date;
   ```
3. **비율 범위 확인**: 모든 전환율은 0%~100% 사이여야 합니다.
4. **NULL 처리 확인**: LEFT JOIN에서 매칭되지 않는 사용자가 NULL로 처리되어 올바르게 카운트에서 제외되는지 확인합니다.
5. **이탈 구간 파악**: 가장 큰 이탈이 발생하는 단계를 식별하여 비즈니스적으로 합리적인지 판단합니다.

---

### 5단계: 예상 추가 질문 & 모범 답변

**Q1**: 순서가 있는 퍼널(Strict Funnel)과 없는 퍼널(Any-Order Funnel)의 차이와 각각의 SQL 구현은?
**A1**: **Strict Funnel**은 반드시 Step 1 -> Step 2 -> Step 3 순서로 거쳐야 합니다. 위 쿼리처럼 날짜 순서 조건(`step2_date >= step1_date`)을 추가합니다. **Any-Order Funnel**은 순서와 무관하게 해당 이벤트 발생 여부만 봅니다. SQL에서는 날짜 비교 없이 단순히 LEFT JOIN + IS NOT NULL로 처리합니다. 실무에서는 대부분 Strict Funnel을 사용하지만, 탐색적 분석에서는 Any-Order로 먼저 전체 도달률을 파악한 후 Strict로 세분화하는 접근이 효과적입니다.

**Q2**: 가장 큰 이탈 구간을 파악한 후 어떻게 개선하나요?
**A2**: 이탈 구간을 파악한 후의 분석 프로세스입니다. (1) **이탈 사용자 프로파일링**: 이탈한 사용자와 통과한 사용자의 속성(가입 채널, 디바이스, 지역)을 비교합니다. (2) **시간 분석**: 이전 단계에서 다음 단계까지 걸린 시간 분포를 확인합니다. 너무 오래 걸리는 경우 UX 문제일 수 있습니다. (3) **세그먼트별 퍼널**: 유입 채널, 디바이스 등으로 분리하여 특정 세그먼트에서 이탈이 집중되는지 확인합니다. (4) **정성적 분석 연계**: SQL 분석 결과를 바탕으로 UX 리서치팀에 해당 단계의 사용자 인터뷰를 요청합니다.

**Q3**: 시간 제한이 있는 퍼널(Time-bounded Funnel)은 어떻게 분석하나요?
**A3**: 예를 들어 "가입 후 7일 이내에 구독까지 전환한 비율"을 보려면, JOIN 조건에 시간 제한을 추가합니다.
```sql
LEFT JOIN funnel_step2 s2
    ON s1.user_id = s2.user_id
    AND s2.step2_date BETWEEN s1.step1_date
                          AND s1.step1_date + INTERVAL '7 days'
```
시간 제한을 두면 전환율이 낮아지지만, 실제 비즈니스 의사결정에 더 유용합니다. "가입 후 3일 내 첫 로그인"과 "가입 후 30일 내 첫 로그인"은 전혀 다른 사용자 경험을 의미하기 때문입니다. 다양한 시간 윈도우(1일, 3일, 7일, 14일, 30일)로 분석하면 최적의 전환 윈도우를 찾을 수 있습니다.

**Q4**: A/B 테스트와 퍼널 분석을 어떻게 결합하나요?
**A4**: A/B 테스트 그룹별로 퍼널을 분리하여 비교합니다. 실험군과 대조군 각각의 Step-to-Step 전환율을 계산하고, 어느 단계에서 차이가 발생하는지 확인합니다. 예를 들어 새로운 온보딩 플로우를 테스트한다면, Step 1 -> Step 2(첫 로그인)에서는 차이가 없지만 Step 2 -> Step 3(콘텐츠 조회)에서 실험군이 10%p 높다면, 온보딩 개선이 콘텐츠 발견에 도움을 줬다는 인사이트를 얻습니다. SQL에서는 `WHERE user_id IN (SELECT user_id FROM ab_test WHERE group = 'treatment')` 조건을 추가하면 됩니다.

**Q5**: 퍼널 시각화는 어떻게 하나요?
**A5**: SQL 결과를 시각화하는 방법은 여러 가지입니다. (1) **BI 도구 활용**: 위 쿼리 결과를 Tableau, Looker, Redash 등에 연결하면 자동으로 퍼널 차트를 생성할 수 있습니다. (2) **Python 연동**: matplotlib이나 plotly의 funnel chart를 사용합니다. `plotly.express.funnel()`이 가장 간편합니다. (3) **Sankey Diagram**: 각 단계 간 이동(전환 + 이탈)을 흐름으로 보여주는 Sankey 다이어그램이 퍼널의 전체 그림을 가장 잘 표현합니다. (4) **SQL 자체**: 간단하게는 바 차트 형태로 `REPEAT('|', users/10)` 같은 방식으로 텍스트 기반 시각화도 가능합니다.

**Q6**: 퍼널 단계가 많아질 때(10단계 이상) 쿼리를 어떻게 효율적으로 작성하나요?
**A6**: 단계가 많아지면 CTE를 일일이 만드는 것이 비효율적입니다. (1) **PIVOT 방식**: 이벤트 타입을 행으로 두고 조건부 집계(`SUM(CASE WHEN event_type = 'X' THEN 1 END)`)를 사용하여 한 번의 스캔으로 모든 단계를 처리합니다. (2) **동적 SQL**: 단계 목록을 배열로 정의하고 프로시저에서 동적으로 쿼리를 생성합니다. (3) **Window Function 활용**: 사용자별 이벤트를 시간순 정렬 후 `LEAD`/`LAG`로 다음/이전 단계와의 관계를 파악합니다. 실무에서는 Amplitude, Mixpanel 같은 전용 제품 분석 도구를 병행하는 것이 일반적입니다.

---

### 핵심 요약 (30초 엘리베이터 피치)

"퍼널 전환율 분석은 사용자가 핵심 행동 단계를 거치면서 각 단계에서 얼마나 전환하고 이탈하는지를 측정합니다. SQL 구현은 각 단계를 CTE로 정의하고 LEFT JOIN으로 연결한 뒤, Overall 전환율과 Step-to-Step 전환율을 동시에 계산하는 구조입니다. Strict Funnel은 날짜 순서 조건을 추가하고, Time-bounded Funnel은 시간 제한 조건을 JOIN에 포함합니다. 가장 큰 이탈 구간을 찾아 세그먼트별로 분석하면 제품 개선의 핵심 포인트를 발견할 수 있습니다."
