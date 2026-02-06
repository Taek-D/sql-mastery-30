## 면접 설명 가이드: 코호트 리텐션율 계산

### 개요
- **난이도**: ⭐⭐⭐ 고급
- **예상 소요 시간**: 5분
- **핵심 SQL 개념**: CTE, DATE_TRUNC, Self JOIN, PIVOT, 집계 함수
- **자주 출제하는 기업**: 토스, 쿠팡, 카카오, 당근마켓, 배달의민족

---

### 1단계: 문제 이해 확인 (30초)

> "코호트 리텐션이라고 하면, 같은 시기에 가입한 사용자 그룹(코호트)이 시간이 지남에 따라 얼마나 서비스에 남아 있는지를 추적하는 분석입니다. 예를 들어 2024년 1월에 가입한 사용자 1,000명 중에서 D7(가입 후 7일)에 200명이 활동했다면 D7 리텐션은 20%입니다. 코호트 기준은 가입월(signup month)로, 리텐션 이벤트는 로그인이나 특정 활동 이벤트로 측정하면 될까요?"

**확인할 사항:**
- 코호트 기준: 가입월, 가입주 등
- 리텐션 이벤트 정의: 로그인, 구매, 앱 실행 등
- 측정 기간: D1, D7, D30 또는 월 단위(M1, M2, ...)
- Classic Retention인지, Rolling Retention인지

---

### 2단계: 접근 방법 설명 (1분)

> "네 단계로 접근하겠습니다."

1. **코호트 정의**: 사용자별 가입월을 기준으로 코호트를 배정합니다. `DATE_TRUNC('month', signup_date)`를 사용합니다.
2. **활동 이벤트 매칭**: 각 사용자의 이벤트를 코호트와 JOIN하여 가입일로부터 경과 월수를 계산합니다.
3. **코호트별 리텐션 집계**: 각 코호트 x 경과 월수 조합별로 활동 사용자 수를 집계합니다.
4. **비율 계산**: 코호트 초기 사용자 수 대비 각 월의 활동 사용자 비율을 계산합니다.

> "핵심은 가입월 코호트에 대해 경과 기간(month_number)을 계산하고, month_number 0인 초기 코호트 크기로 나누는 것입니다."

---

### 3단계: 쿼리 작성 (2분)

```sql
-- 코호트 리텐션율 계산 (월 단위)
-- 스키마: users(user_id, signup_date, plan_type)
--         events(event_id, user_id, event_date, event_type)

WITH cohort_base AS (
    -- 1단계: 사용자별 코호트(가입월) 배정 및 코호트 크기 계산
    SELECT
        user_id,
        DATE_TRUNC('month', signup_date) AS cohort_month
    FROM users
),

user_activity AS (
    -- 2단계: 사용자 활동을 코호트와 매칭하고 경과 월수 계산
    SELECT
        cb.cohort_month,
        cb.user_id,
        DATE_TRUNC('month', e.event_date) AS activity_month,
        EXTRACT(YEAR FROM AGE(
            DATE_TRUNC('month', e.event_date),
            cb.cohort_month
        )) * 12
        + EXTRACT(MONTH FROM AGE(
            DATE_TRUNC('month', e.event_date),
            cb.cohort_month
        )) AS month_number
    FROM cohort_base cb
    INNER JOIN events e
        ON cb.user_id = e.user_id
    WHERE e.event_type IN ('login', 'purchase', 'page_view')
),

retention_calc AS (
    -- 3단계: 코호트별, 경과 월별 고유 사용자 수 집계
    SELECT
        cohort_month,
        month_number,
        COUNT(DISTINCT user_id) AS active_users
    FROM user_activity
    WHERE month_number >= 0
    GROUP BY cohort_month, month_number
),

cohort_size AS (
    -- 코호트별 초기 사용자 수 (month_number = 0)
    SELECT
        cohort_month,
        active_users AS initial_users
    FROM retention_calc
    WHERE month_number = 0
)

SELECT
    rc.cohort_month,
    cs.initial_users,
    rc.month_number,
    rc.active_users,
    ROUND(
        rc.active_users::NUMERIC / cs.initial_users * 100,
        2
    ) AS retention_rate_pct
FROM retention_calc rc
INNER JOIN cohort_size cs
    ON rc.cohort_month = cs.cohort_month
WHERE rc.month_number BETWEEN 0 AND 12
ORDER BY rc.cohort_month, rc.month_number;
```

**쿼리 설명** (작성하면서 말할 내용):
- **CTE 1 (`cohort_base`)**: 각 사용자를 가입월 기준 코호트로 배정합니다. `DATE_TRUNC`으로 월 단위를 맞춥니다.
- **CTE 2 (`user_activity`)**: 이벤트 테이블과 JOIN하여 활동 월과 경과 월수(`month_number`)를 계산합니다. `AGE()` 함수로 정확한 월 차이를 구합니다.
- **CTE 3 (`retention_calc`)**: 코호트 x 경과 월 조합별로 고유 활동 사용자 수를 집계합니다.
- **CTE 4 (`cohort_size`)**: month_number = 0인 초기 코호트 크기를 별도로 추출합니다.
- **최종 SELECT**: 초기 사용자 수 대비 비율을 계산하여 리텐션율을 도출합니다.

---

### 4단계: 결과 검증 (1분)

> "결과 검증은 다음과 같이 진행하겠습니다."

1. **Month 0 검증**: month_number = 0의 리텐션율은 반드시 100% 이하여야 합니다 (이벤트가 없는 가입자가 있을 수 있어 100% 미만일 수도 있음).
2. **단조 감소 확인**: 일반적으로 Classic Retention은 시간이 지남에 따라 감소하는 경향이 있습니다. 갑자기 증가하는 구간이 있다면 데이터 이상이나 특별 이벤트를 의심합니다.
3. **특정 코호트 수동 검증**:
   ```sql
   -- 2024-01 코호트의 M1 리텐션 수동 검증
   SELECT COUNT(DISTINCT e.user_id)
   FROM users u
   INNER JOIN events e ON u.user_id = e.user_id
   WHERE DATE_TRUNC('month', u.signup_date) = '2024-01-01'
     AND DATE_TRUNC('month', e.event_date) = '2024-02-01';
   ```
4. **전체 사용자 수 크로스 체크**: 모든 코호트의 initial_users 합계가 전체 사용자 수와 일치하는지 확인합니다.

---

### 5단계: 예상 추가 질문 & 모범 답변

**Q1**: 리텐션율과 이탈률(Churn Rate)의 관계는 무엇인가요?
**A1**: 리텐션율과 이탈률은 보완 관계입니다. 특정 기간의 이탈률 = 100% - 리텐션율입니다. 다만, 이탈의 정의에 따라 다르게 계산될 수 있습니다. "특정 기간 동안 활동하지 않은 사용자" 기준의 이탈률은 단순히 `1 - retention`이지만, 구독 서비스에서 "명시적으로 구독을 해지한 사용자" 기준의 이탈률은 별도로 계산해야 합니다. 실무에서는 이탈의 정의를 명확히 하는 것이 가장 중요합니다.

**Q2**: D1, D7, D30 리텐션이 각각 중요한 이유는 무엇인가요?
**A2**: 각 시점은 서로 다른 사용자 행동 단계를 반영합니다. **D1 리텐션**은 온보딩 품질을 측정합니다. 첫날 경험이 좋지 않으면 사용자가 즉시 이탈합니다. **D7 리텐션**은 핵심 가치 발견(Aha Moment) 여부를 보여줍니다. 일주일 안에 서비스의 가치를 느꼈는지가 관건입니다. **D30 리텐션**은 습관 형성 여부를 나타냅니다. 한 달 후에도 사용한다면 서비스가 일상에 정착된 것입니다. 업계 벤치마크로 모바일 앱의 경우 D1 약 25-30%, D7 약 10-15%, D30 약 5-8% 정도가 평균입니다.

**Q3**: 코호트 크기가 작을 때 통계적 유의성은 어떻게 판단하나요?
**A3**: 코호트 크기가 작으면 리텐션율의 분산이 커져서 신뢰하기 어렵습니다. 예를 들어 코호트가 10명일 때 1명 차이가 10%p 차이를 만들어냅니다. 이를 해결하기 위해: (1) **신뢰 구간 계산** - 이항 비율의 95% 신뢰 구간을 함께 표시합니다. `p +/- 1.96 * sqrt(p*(1-p)/n)` 공식을 사용합니다. (2) **코호트 묶기** - 주 단위 코호트를 월 단위로 합쳐 크기를 키웁니다. (3) **최소 코호트 크기 기준** 설정 - 보통 100명 이상을 권장합니다.

**Q4**: 실무에서 리텐션을 개선하기 위해 SQL 분석 관점에서 어떤 것들을 하나요?
**A4**: SQL 분석으로 리텐션 개선 포인트를 발견할 수 있습니다. (1) **리텐션 사용자 vs 이탈 사용자 비교 분석**: 가입 후 7일 내 어떤 기능을 사용했는지 비교하여 핵심 기능(Aha Moment)을 찾습니다. (2) **세그먼트별 리텐션**: 가입 채널, 지역, 플랜 타입별로 리텐션을 분리하여 어떤 세그먼트가 높은지 파악합니다. (3) **이탈 전 행동 패턴 분석**: 이탈 사용자의 마지막 7일간 활동 빈도, 사용 기능을 분석하여 이탈 조기 경고 신호를 탐지합니다. (4) **재활성화 분석**: 이탈 후 복귀한 사용자의 특성을 파악합니다.

**Q5**: Self JOIN으로도 코호트 리텐션을 구할 수 있나요?
**A5**: 네, 가능합니다. CTE 없이 Self JOIN으로 구현할 수 있습니다. events 테이블을 두 번 참조하여, 첫 번째는 기준(가입 이벤트), 두 번째는 후속 활동으로 JOIN합니다. 하지만 CTE 방식이 더 가독성이 좋고, 실행 계획도 유사하거나 CTE가 더 나은 경우가 많습니다. 면접에서는 CTE를 사용하되 "Self JOIN으로도 동일한 결과를 얻을 수 있다"고 언급하면 이해도를 보여줄 수 있습니다.

**Q6**: Classic Retention과 Rolling Retention의 차이는 무엇인가요?
**A6**: **Classic Retention(N-day Retention)**은 가입 후 정확히 N일째에 활동한 사용자 비율입니다. 예를 들어 D7은 가입 후 정확히 7일째 날의 활동만 봅니다. **Rolling Retention(Return Retention)**은 가입 후 N일 이후 언제든 한 번이라도 활동한 사용자 비율입니다. Rolling Retention은 항상 Classic Retention보다 높게 나오며, "사용자가 아직 완전히 이탈하지 않았는지"를 보는 데 유용합니다. 쿼리 차이는 WHERE 조건에서 `=`을 쓰느냐 `>=`를 쓰느냐입니다.

---

### 핵심 요약 (30초 엘리베이터 피치)

"코호트 리텐션은 같은 시기에 가입한 사용자 그룹이 시간 경과에 따라 얼마나 남아 있는지를 추적합니다. SQL 구현의 핵심은 세 가지입니다. 첫째, DATE_TRUNC로 가입월 기반 코호트를 정의하고, 둘째, 이벤트 테이블과 JOIN하여 경과 월수를 계산하며, 셋째, 코호트 초기 크기 대비 활성 사용자 비율을 구합니다. 이 분석은 D1이 온보딩, D7이 가치 발견, D30이 습관 형성을 반영하며, 제품 개선의 핵심 의사결정 도구로 활용됩니다."
