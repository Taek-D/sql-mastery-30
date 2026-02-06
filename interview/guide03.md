## 면접 설명 가이드: RFM 세그먼테이션

### 개요
- **난이도**: ⭐⭐⭐ 고급
- **예상 소요 시간**: 5분
- **핵심 SQL 개념**: CTE, NTILE, Window Function, CASE WHEN, 집계 함수
- **자주 출제하는 기업**: 쿠팡, 무신사, 마켓컬리, 11번가, SSG닷컴

---

### 1단계: 문제 이해 확인 (30초)

> "RFM 세그먼테이션은 고객을 구매 행동 기반으로 분류하는 대표적인 마케팅 분석 기법입니다. R(Recency)은 최근성으로 마지막 구매가 얼마나 최근인지, F(Frequency)는 빈도로 얼마나 자주 구매하는지, M(Monetary)은 금액으로 얼마나 많이 소비하는지를 나타냅니다. 각 지표를 5등급(또는 3등급)으로 나누어 고객 세그먼트를 정의하면 될까요? 분석 기간이나 등급 수에 대한 추가 조건이 있으신지요?"

**확인할 사항:**
- 분석 기간 (최근 1년 등)
- 등급 수 (3등급 vs 5등급)
- 기준 이벤트: 주문 완료(취소 제외) 여부
- 출력 형태: 고객별 세그먼트 또는 세그먼트별 집계

---

### 2단계: 접근 방법 설명 (1분)

> "세 단계로 접근하겠습니다."

1. **RFM 원시값 계산**: 사용자별로 R(마지막 주문 이후 경과일), F(주문 횟수), M(총 주문 금액)을 계산합니다.
2. **등급 부여**: `NTILE(5)`를 사용하여 각 지표를 1~5등급으로 나눕니다. R은 값이 작을수록(최근일수록) 높은 등급, F와 M은 값이 클수록 높은 등급으로 정렬 방향을 주의합니다.
3. **세그먼트 명명**: R, F, M 등급 조합에 따라 비즈니스 의미 있는 세그먼트명을 부여합니다. 예를 들어 R=5, F=5, M=5이면 "Champions", R=1, F=1, M=1이면 "Hibernating" 등입니다.

> "핵심은 NTILE의 정렬 방향을 R과 F/M에서 반대로 설정하는 것과, 비즈니스에 맞는 세그먼트 명명 규칙입니다."

---

### 3단계: 쿼리 작성 (2분)

```sql
-- RFM 세그먼테이션
-- 스키마: users(user_id, signup_date, region, user_segment)
--         orders(order_id, user_id, order_date, total_amount, status)

WITH rfm_base AS (
    -- 1단계: 사용자별 RFM 원시값 계산
    SELECT
        u.user_id,
        u.region,
        CURRENT_DATE - MAX(o.order_date)::DATE AS recency_days,
        COUNT(DISTINCT o.order_id) AS frequency,
        SUM(o.total_amount) AS monetary
    FROM users u
    INNER JOIN orders o
        ON u.user_id = o.user_id
    WHERE o.status = 'completed'
      AND o.order_date >= CURRENT_DATE - INTERVAL '1 year'
    GROUP BY u.user_id, u.region
),

rfm_scores AS (
    -- 2단계: NTILE(5)로 1~5등급 부여
    SELECT
        user_id,
        region,
        recency_days,
        frequency,
        monetary,
        -- R: 최근일수록 높은 점수 (DESC 정렬 → 경과일 큰 값이 낮은 등급, 작은 값이 높은 등급)
        NTILE(5) OVER (ORDER BY recency_days DESC) AS r_score,
        -- F: 많을수록 높은 점수 (ASC 정렬 → 큰 값이 높은 등급)
        NTILE(5) OVER (ORDER BY frequency ASC) AS f_score,
        -- M: 많을수록 높은 점수 (ASC 정렬 → 큰 값이 높은 등급)
        NTILE(5) OVER (ORDER BY monetary ASC) AS m_score
    FROM rfm_base
),

rfm_segments AS (
    -- 3단계: RFM 점수 조합으로 세그먼트 명명
    SELECT
        user_id,
        region,
        recency_days,
        frequency,
        monetary,
        r_score,
        f_score,
        m_score,
        r_score * 100 + f_score * 10 + m_score AS rfm_combined,
        CASE
            WHEN r_score >= 4 AND f_score >= 4 AND m_score >= 4
                THEN 'Champions'
            WHEN r_score >= 4 AND f_score >= 3
                THEN 'Loyal Customers'
            WHEN r_score >= 4 AND f_score <= 2
                THEN 'New Customers'
            WHEN r_score >= 3 AND f_score >= 3 AND m_score >= 3
                THEN 'Potential Loyalists'
            WHEN r_score >= 3 AND f_score <= 2 AND m_score <= 2
                THEN 'Promising'
            WHEN r_score <= 2 AND f_score >= 4
                THEN 'At Risk'
            WHEN r_score <= 2 AND f_score >= 2 AND m_score >= 3
                THEN 'Need Attention'
            WHEN r_score <= 2 AND f_score <= 2
                THEN 'Hibernating'
            ELSE 'Others'
        END AS segment_name
    FROM rfm_scores
)

-- 최종 결과: 세그먼트별 요약 통계
SELECT
    segment_name,
    COUNT(*) AS customer_count,
    ROUND(COUNT(*)::NUMERIC / SUM(COUNT(*)) OVER () * 100, 2) AS pct_of_total,
    ROUND(AVG(recency_days), 1) AS avg_recency_days,
    ROUND(AVG(frequency), 1) AS avg_frequency,
    ROUND(AVG(monetary), 0) AS avg_monetary,
    ROUND(AVG(r_score), 2) AS avg_r,
    ROUND(AVG(f_score), 2) AS avg_f,
    ROUND(AVG(m_score), 2) AS avg_m
FROM rfm_segments
GROUP BY segment_name
ORDER BY avg_monetary DESC;
```

**쿼리 설명** (작성하면서 말할 내용):
- **CTE 1 (`rfm_base`)**: 사용자별로 마지막 구매 경과일(R), 주문 횟수(F), 총 주문 금액(M) 원시값을 계산합니다. 취소된 주문은 제외하고, 최근 1년 데이터만 사용합니다.
- **CTE 2 (`rfm_scores`)**: `NTILE(5)`로 각 지표를 5등급으로 나눕니다. NTILE은 정렬 순서대로 1부터 5까지 배정하므로, 높은 점수(5)가 좋은 등급이 되려면 R은 DESC(경과일 큰 값→1, 작은 값→5), F/M은 ASC(작은 값→1, 큰 값→5)로 정렬합니다.
- **CTE 3 (`rfm_segments`)**: CASE WHEN으로 R/F/M 조합에 따라 비즈니스 의미 있는 세그먼트명을 부여합니다.
- **최종 SELECT**: 세그먼트별 고객 수, 비율, 평균 RFM 값을 집계하여 전체 세그먼트 구성을 한눈에 파악합니다.

---

### 4단계: 결과 검증 (1분)

> "결과를 다음과 같이 검증하겠습니다."

1. **등급 분포 확인**: NTILE(5)을 사용했으므로 각 등급(1~5)에 전체 고객의 약 20%씩 배분되어야 합니다.
   ```sql
   SELECT r_score, COUNT(*), ROUND(COUNT(*)::NUMERIC / SUM(COUNT(*)) OVER () * 100, 1) AS pct
   FROM rfm_scores GROUP BY r_score ORDER BY r_score;
   ```
2. **세그먼트 합산**: 모든 세그먼트의 customer_count 합이 전체 고객 수와 일치하는지 확인합니다.
3. **논리적 일관성**: Champions 세그먼트의 avg_recency가 가장 낮고, avg_frequency와 avg_monetary가 가장 높아야 합니다. Hibernating은 그 반대입니다.
4. **극단값 확인**: monetary가 음수이거나 비정상적으로 큰 값이 없는지 확인합니다.

---

### 5단계: 예상 추가 질문 & 모범 답변

**Q1**: NTILE과 PERCENT_RANK의 차이는 무엇이고, RFM에서 어떤 것을 써야 하나요?
**A1**: `NTILE(n)`은 데이터를 n개의 동일 크기 버킷으로 나눕니다. 결과는 1부터 n까지의 정수입니다. `PERCENT_RANK()`는 0에서 1 사이의 상대적 순위 비율을 반환합니다. RFM에서 **NTILE이 더 적합**한 이유는: (1) 비즈니스 관점에서 "상위 20% 고객"처럼 명확한 등급 분류가 필요하고, (2) CASE WHEN 조건에서 정수 비교가 더 직관적이며, (3) 각 등급의 고객 수가 균등하게 분배됩니다. 반면, PERCENT_RANK는 더 세밀한 분포를 원할 때 유용하지만 임계값 설정이 주관적일 수 있습니다.

**Q2**: 각 RFM 세그먼트에 대해 어떤 마케팅 전략을 제안하시겠습니까?
**A2**: 세그먼트별 전략은 다음과 같습니다. **Champions(R높/F높/M높)**: VIP 프로그램, 얼리 액세스, 추천 프로그램으로 브랜드 앰배서더화합니다. **Loyal Customers(R높/F높)**: 크로스셀/업셀 추천, 리뷰 작성 유도합니다. **New Customers(R높/F낮)**: 온보딩 이메일, 두 번째 구매 할인 쿠폰으로 재구매를 유도합니다. **At Risk(R낮/F높)**: 과거 충성 고객이 이탈 중이므로, 긴급 윈백 캠페인과 "보고 싶어요" 메시지를 보냅니다. **Hibernating(R낮/F낮)**: 비용 대비 효과를 고려하여, 재활성화 캠페인을 시도하되 반응 없으면 마케팅 비용을 줄입니다.

**Q3**: 데이터 분포가 심하게 치우쳐(skewed) 있을 때 어떻게 대처하나요?
**A3**: 예를 들어 Monetary가 소수의 초고액 고객에 의해 크게 치우친 경우가 흔합니다. 대처 방법으로는: (1) **로그 변환** - `LOG(monetary + 1)`을 사용하여 분포를 정규화한 후 등급을 나눕니다. (2) **NTILE 자체의 강점 활용** - NTILE은 순위 기반이므로 극단값의 영향을 덜 받습니다. 값이 아닌 순위로 등급을 나누기 때문입니다. (3) **이상치 처리** - 상/하위 1%를 윈저라이징(capping)합니다. (4) **커스텀 구간 설정** - 비즈니스 도메인 지식에 기반하여 "10만원 미만/10~50만원/50만원 이상" 같은 절대 기준을 설정합니다.

**Q4**: 실시간으로 RFM을 업데이트해야 한다면 어떻게 설계하시겠습니까?
**A4**: 배치 방식은 보통 일 1회 업데이트이지만, 실시간이 필요하다면: (1) **Materialized View + 주기적 갱신** - PostgreSQL의 `REFRESH MATERIALIZED VIEW CONCURRENTLY`를 사용하여 30분~1시간 간격으로 갱신합니다. (2) **이벤트 기반 업데이트** - 주문 완료 시 트리거 또는 CDC(Change Data Capture)로 해당 고객의 RFM 점수만 재계산합니다. (3) **캐싱 레이어** - Redis에 고객별 RFM 점수를 캐싱하고, 주문 이벤트 시 해당 키만 갱신합니다. 완전한 실시간은 비용이 크므로, "주문 발생 후 5분 이내 반영" 같은 SLA를 협의하는 것이 현실적입니다.

**Q5**: RFM 외에 어떤 고객 세그먼테이션 방법이 있나요?
**A5**: RFM 이외의 주요 방법들입니다. (1) **행동 기반(Behavioral)**: 페이지 뷰 패턴, 앱 사용 시간, 기능 사용 빈도 등 행동 데이터 기반. SQL로는 이벤트 로그를 집계하여 피처를 생성합니다. (2) **가치 기반(Value-based)**: CLV(Customer Lifetime Value) 예측 기반 세그먼테이션. (3) **인구통계(Demographic)**: 나이, 지역, 성별 기반이지만 행동 기반보다 예측력이 낮습니다. (4) **K-Means 클러스터링**: SQL만으로는 어렵고, Python(scikit-learn)이나 BigQuery ML의 `CREATE MODEL`로 구현합니다. RFM의 장점은 SQL만으로 구현 가능하고 비즈니스 직관이 명확하다는 점입니다.

**Q6**: NTILE에서 동점(tie)이 발생하면 어떻게 처리되나요?
**A6**: NTILE은 동점을 구분하지 않고 행 순서에 따라 강제로 버킷에 배분합니다. 예를 들어 frequency가 같은 고객이 많으면 일부는 등급 3, 일부는 등급 4에 무작위로 배정될 수 있습니다. 이를 해결하려면: (1) 보조 정렬 기준 추가 - `NTILE(5) OVER (ORDER BY frequency DESC, user_id)`처럼 tie-breaker를 설정합니다. (2) `PERCENT_RANK` 기반으로 정확한 백분위를 구한 후 CASE WHEN으로 커스텀 등급을 부여합니다. (3) 비즈니스적으로 동점 처리가 중요하다면, 절대값 기준 구간을 사용합니다.

---

### 핵심 요약 (30초 엘리베이터 피치)

"RFM 세그먼테이션은 고객을 Recency(최근성), Frequency(빈도), Monetary(금액) 세 축으로 분류하는 마케팅 분석 기법입니다. SQL 구현의 핵심은 세 단계입니다. 첫째, 사용자별 R/F/M 원시값을 집계하고, 둘째, NTILE(5)로 각 지표를 5등급으로 나누되 R은 ASC, F/M은 DESC로 정렬 방향을 반대로 설정하며, 셋째, CASE WHEN으로 비즈니스 의미 있는 세그먼트명을 부여합니다. Champions에게는 VIP 프로그램을, At Risk에게는 윈백 캠페인을 적용하는 등 각 세그먼트에 맞춤 전략을 수립할 수 있습니다."
