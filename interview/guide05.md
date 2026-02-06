## 면접 설명 가이드: A/B 테스트 통계적 유의성 검증

### 개요
- **난이도**: ⭐⭐⭐ 고급
- **예상 소요 시간**: 5분
- **핵심 SQL 개념**: CTE, 집계 함수, 수학 함수 (SQRT, LN, POWER), Two-Proportion Z-Test
- **자주 출제하는 기업**: 토스, 카카오, 네이버, 쿠팡, 라인

---

### 1단계: 문제 이해 확인 (30초)

> "A/B 테스트 통계적 유의성 검증이란, 대조군(Control)과 실험군(Treatment)의 전환율 차이가 우연에 의한 것인지, 실제로 의미 있는 차이인지를 판단하는 것입니다. 일반적으로 Two-Proportion Z-Test를 사용하며, p-value가 0.05 미만이면 95% 신뢰 수준에서 통계적으로 유의미하다고 판단합니다. SQL만으로 Z-score를 계산하고, 이를 기반으로 유의성을 판단하는 쿼리를 작성하면 될까요? 검증할 지표가 전환율(비율)인지 연속형 지표(평균 결제 금액 등)인지도 확인하겠습니다."

**확인할 사항:**
- 비교 지표: 전환율(비율) vs 연속형(평균값)
- 신뢰 수준: 95%(alpha=0.05) 또는 99%(alpha=0.01)
- 단측 검정 vs 양측 검정
- 실험 기간 및 샘플 사이즈

---

### 2단계: 접근 방법 설명 (1분)

> "세 단계로 접근하겠습니다."

1. **그룹별 통계량 계산**: 대조군과 실험군 각각의 사용자 수, 전환 수, 전환율을 계산합니다.
2. **Z-score 계산**: Two-Proportion Z-Test 공식을 SQL로 구현합니다.
   - 합동 비율(pooled proportion): `p = (x1 + x2) / (n1 + n2)`
   - 표준 오차(SE): `SE = sqrt(p * (1-p) * (1/n1 + 1/n2))`
   - Z-score: `Z = (p1 - p2) / SE`
3. **유의성 판단**: Z-score의 절대값이 1.96 이상이면 95% 신뢰 수준에서 유의미합니다. SQL에서 정규분포 CDF를 직접 계산하기는 어렵지만, 임계값 비교로 판단할 수 있습니다.

> "핵심은 SQL의 수학 함수만으로 Z-score를 계산할 수 있다는 점이고, 다만 정확한 p-value 계산은 SQL의 한계가 있어 근사값 또는 임계값 비교 방식을 사용합니다."

---

### 3단계: 쿼리 작성 (2분)

```sql
-- A/B 테스트 통계적 유의성 검증 (Two-Proportion Z-Test)
-- 스키마: users(user_id, signup_date, plan_type)
--         subscriptions(subscription_id, user_id, start_date, end_date, plan_type, status)
--         events(event_id, user_id, event_date, event_type)
-- 가정: users.user_segment 또는 별도 ab_test 컬럼으로 실험군/대조군 구분

WITH group_stats AS (
    -- 1단계: 그룹별 기본 통계량 계산
    SELECT
        u.plan_type AS test_group,  -- 'control' vs 'treatment'
        COUNT(DISTINCT u.user_id) AS total_users,
        COUNT(DISTINCT s.user_id) AS converted_users,
        COUNT(DISTINCT s.user_id)::NUMERIC
            / COUNT(DISTINCT u.user_id) AS conversion_rate
    FROM users u
    LEFT JOIN subscriptions s
        ON u.user_id = s.user_id
        AND s.status = 'active'
        AND s.start_date BETWEEN '2024-01-01' AND '2024-03-31'
    WHERE u.signup_date BETWEEN '2024-01-01' AND '2024-03-31'
      AND u.plan_type IN ('control', 'treatment')
    GROUP BY u.plan_type
),

test_params AS (
    -- 2단계: 대조군과 실험군 통계를 열로 피벗
    SELECT
        MAX(CASE WHEN test_group = 'control'
            THEN total_users END) AS n_control,
        MAX(CASE WHEN test_group = 'control'
            THEN converted_users END) AS x_control,
        MAX(CASE WHEN test_group = 'control'
            THEN conversion_rate END) AS p_control,
        MAX(CASE WHEN test_group = 'treatment'
            THEN total_users END) AS n_treatment,
        MAX(CASE WHEN test_group = 'treatment'
            THEN converted_users END) AS x_treatment,
        MAX(CASE WHEN test_group = 'treatment'
            THEN conversion_rate END) AS p_treatment
    FROM group_stats
),

z_test_calc AS (
    -- 3단계: Z-score 계산
    SELECT
        n_control,
        x_control,
        p_control,
        n_treatment,
        x_treatment,
        p_treatment,
        -- 전환율 차이
        p_treatment - p_control AS rate_diff,
        -- 합동 비율 (pooled proportion)
        (x_control + x_treatment)::NUMERIC
            / (n_control + n_treatment) AS p_pooled,
        -- 표준 오차 (Standard Error)
        SQRT(
            ((x_control + x_treatment)::NUMERIC / (n_control + n_treatment))
            * (1 - (x_control + x_treatment)::NUMERIC / (n_control + n_treatment))
            * (1.0 / n_control + 1.0 / n_treatment)
        ) AS standard_error,
        -- Z-score
        (p_treatment - p_control)
        / NULLIF(
            SQRT(
                ((x_control + x_treatment)::NUMERIC / (n_control + n_treatment))
                * (1 - (x_control + x_treatment)::NUMERIC / (n_control + n_treatment))
                * (1.0 / n_control + 1.0 / n_treatment)
            ),
            0
        ) AS z_score
    FROM test_params
)

SELECT
    n_control,
    n_treatment,
    ROUND(p_control * 100, 4) AS control_rate_pct,
    ROUND(p_treatment * 100, 4) AS treatment_rate_pct,
    ROUND(rate_diff * 100, 4) AS diff_pct_points,
    ROUND(
        rate_diff / NULLIF(p_control, 0) * 100, 2
    ) AS relative_lift_pct,
    ROUND(z_score, 4) AS z_score,
    -- 유의성 판단 (양측 검정)
    CASE
        WHEN ABS(z_score) >= 2.576 THEN 'Significant (p < 0.01)'
        WHEN ABS(z_score) >= 1.960 THEN 'Significant (p < 0.05)'
        WHEN ABS(z_score) >= 1.645 THEN 'Marginal (p < 0.10)'
        ELSE 'Not Significant'
    END AS significance,
    -- 95% 신뢰 구간
    ROUND((rate_diff - 1.96 * standard_error) * 100, 4) AS ci_lower_pct,
    ROUND((rate_diff + 1.96 * standard_error) * 100, 4) AS ci_upper_pct
FROM z_test_calc;
```

**쿼리 설명** (작성하면서 말할 내용):
- **CTE 1 (`group_stats`)**: 대조군과 실험군 각각의 전체 사용자 수, 전환 사용자 수, 전환율을 계산합니다. LEFT JOIN으로 미전환 사용자도 포함합니다.
- **CTE 2 (`test_params`)**: PIVOT 기법으로 대조군과 실험군 통계를 한 행에 나란히 배치합니다. 이후 계산의 편의를 위함입니다.
- **CTE 3 (`z_test_calc`)**: Two-Proportion Z-Test의 핵심 계산입니다. 합동 비율(pooled proportion), 표준 오차(SE), Z-score를 순서대로 계산합니다.
- **최종 SELECT**: Z-score를 임계값(1.645, 1.960, 2.576)과 비교하여 유의성 수준을 판단하고, 95% 신뢰 구간도 함께 제공합니다.

---

### 4단계: 결과 검증 (1분)

> "결과를 다음과 같이 검증하겠습니다."

1. **샘플 사이즈 확인**: 두 그룹의 n이 충분한지 확인합니다. 일반적으로 각 그룹 최소 수백~수천 명이 필요합니다.
2. **전환율 범위 확인**: 0%~100% 사이의 합리적인 값인지 확인합니다.
3. **Z-score 부호 확인**: treatment > control이면 양수, 반대면 음수입니다. 방향이 예상과 일치하는지 확인합니다.
4. **신뢰 구간 확인**: 95% CI에 0이 포함되면 유의하지 않고, 포함되지 않으면 유의합니다. significance 판단과 일치해야 합니다.
5. **수동 검산**: 간단한 숫자로 검증합니다.
   ```
   예: control 1000명 중 100명 전환(10%), treatment 1000명 중 130명 전환(13%)
   pooled p = 230/2000 = 0.115
   SE = sqrt(0.115 * 0.885 * (1/1000 + 1/1000)) = 0.02016
   Z = (0.13 - 0.10) / 0.02016 = 1.488 → Not Significant (p > 0.05)
   ```

---

### 5단계: 예상 추가 질문 & 모범 답변

**Q1**: p-value가 0.05라는 기준은 어떤 의미이고, 왜 0.05를 쓰나요?
**A1**: p-value는 "귀무가설(두 그룹에 차이가 없다)이 참일 때, 관찰된 차이 이상의 결과가 나올 확률"입니다. p-value < 0.05는 "차이가 없다면 이런 결과가 나올 확률이 5% 미만"이므로, 차이가 있다고 판단합니다. 0.05는 관례적인 기준이며, Ronald Fisher가 제안한 이후 학계와 산업계에서 표준처럼 사용됩니다. 하지만 절대적인 기준은 아닙니다. 의료 분야에서는 0.01을 쓰기도 하고, 탐색적 분석에서는 0.10을 허용하기도 합니다. 중요한 것은 실험 전에 기준을 정해야 한다는 것입니다(사후에 기준을 바꾸면 p-hacking이 됩니다).

**Q2**: 1종 오류(Type I Error)와 2종 오류(Type II Error)의 차이는?
**A2**: **1종 오류(False Positive)**: 실제로는 차이가 없는데 "차이가 있다"고 결론 내리는 오류입니다. 확률은 alpha(보통 0.05)로 통제합니다. 비즈니스에서는 "효과 없는 변경을 적용"하는 결과로 이어집니다. **2종 오류(False Negative)**: 실제로 차이가 있는데 "차이가 없다"고 결론 내리는 오류입니다. 확률은 beta이며, 1 - beta를 검정력(Power)이라 합니다. 비즈니스에서는 "효과 있는 개선을 놓치는" 결과입니다. 일반적으로 Power = 0.8(80%)을 목표로 합니다. 두 오류는 트레이드오프 관계이며, 샘플 사이즈를 키우면 둘 다 줄일 수 있습니다.

**Q3**: 적절한 샘플 사이즈는 어떻게 결정하나요?
**A3**: 실험 전에 필요한 샘플 사이즈를 계산해야 합니다. 네 가지 요소가 필요합니다: (1) **기존 전환율(baseline)**: 예를 들어 현재 10%. (2) **최소 감지 효과(MDE, Minimum Detectable Effect)**: 의미 있는 최소 차이. 예를 들어 2%p 향상. (3) **유의 수준(alpha)**: 보통 0.05. (4) **검정력(power)**: 보통 0.80. 공식은 `n = (Z_alpha/2 + Z_beta)^2 * (p1(1-p1) + p2(1-p2)) / (p2-p1)^2`입니다. SQL만으로 이 사전 계산을 하기는 번거로우므로, Python의 `statsmodels.stats.power` 모듈이나 온라인 계산기(Evan Miller 등)를 사용하는 것이 실용적입니다.

**Q4**: Novelty Effect(새로움 효과)란 무엇이고, 어떻게 대처하나요?
**A4**: Novelty Effect는 실험군 사용자가 변화 자체에 호기심을 느껴 초반에 전환율이 일시적으로 높아지는 현상입니다. 시간이 지나면 효과가 사라져서, 조기 종료하면 잘못된 결론을 내릴 수 있습니다. 대처 방법: (1) **충분한 기간 운영** - 최소 2주 이상(사용 주기를 최소 2번 포함). (2) **시간 경과에 따른 전환율 추이 관찰** - 일별 전환율이 안정화되는지 확인합니다. SQL에서는 날짜별로 Z-test를 분리 실행하여 시계열로 확인합니다. (3) **신규 사용자만 대상** - 기존 UX를 경험하지 않은 사용자만 실험에 포함하면 Novelty Effect를 줄일 수 있습니다. (4) **Holdout Group** - 실험 종료 후에도 일부 사용자를 대조군으로 유지하여 장기 효과를 모니터링합니다.

**Q5**: SQL만으로 A/B 테스트 분석의 한계는 무엇이고, Python/R이 필요한 경우는?
**A5**: SQL의 한계와 Python/R이 필요한 경우입니다. (1) **정확한 p-value 계산**: SQL에는 정규분포 CDF 함수가 없어서 임계값 비교만 가능합니다. Python의 `scipy.stats.norm.sf()`로 정확한 p-value를 계산합니다. (2) **다중 비교 보정**: 여러 지표를 동시에 테스트하면 Bonferroni, FDR 보정이 필요한데, SQL로는 복잡합니다. (3) **베이지안 A/B 테스트**: 사전 분포 설정, 사후 분포 계산, 확률 시뮬레이션은 SQL로 불가능합니다. (4) **시각화**: 전환율 추이, 신뢰 구간 시각화 등은 Python(matplotlib, seaborn)이 필수입니다. (5) **사전 샘플 사이즈 계산**: 검정력 분석(power analysis)은 Python이 편리합니다. 실무에서는 SQL로 데이터를 추출하고 Python으로 통계 분석 및 시각화를 하는 파이프라인이 일반적입니다.

**Q6**: 연속형 지표(예: 평균 결제 금액)로 A/B 테스트를 할 때는 어떻게 달라지나요?
**A6**: 비율이 아닌 연속형 지표(평균 결제 금액, 평균 사용 시간 등)에서는 Two-Sample T-Test를 사용합니다. SQL에서의 차이점은: (1) 그룹별로 `AVG()`, `STDDEV()`, `COUNT()`를 계산합니다. (2) T-statistic = `(avg1 - avg2) / sqrt(s1^2/n1 + s2^2/n2)`로 계산합니다 (Welch's t-test). (3) 자유도(degrees of freedom) 계산이 추가로 필요하며, 이는 Welch-Satterthwaite 공식으로 근사합니다. 비율 검정보다 계산이 약간 복잡하지만, SQL의 집계 함수와 수학 함수로 충분히 구현 가능합니다. 다만, 결제 금액처럼 분포가 크게 치우친(skewed) 지표는 중앙값(median) 비교나 로그 변환 후 검정이 더 적절할 수 있습니다.

---

### 핵심 요약 (30초 엘리베이터 피치)

"A/B 테스트 통계적 유의성 검증은 대조군과 실험군의 전환율 차이가 우연인지 실제 효과인지를 판단합니다. SQL로 구현하는 핵심은 세 단계입니다. 첫째, 그룹별 전환율을 계산하고, 둘째, 합동 비율과 표준 오차를 거쳐 Z-score를 산출하며, 셋째, 임계값(1.96) 비교로 유의성을 판단합니다. 95% 신뢰 구간도 함께 제공하면 결과의 실질적 의미를 더 잘 전달할 수 있습니다. SQL만으로 Z-score 계산까지는 가능하지만, 정확한 p-value나 베이지안 분석은 Python과의 연계가 필요합니다."
