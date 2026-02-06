## 면접 설명 가이드: 7일 Rolling MAU 계산

### 개요
- **난이도**: ⭐⭐ 중급
- **예상 소요 시간**: 5분
- **핵심 SQL 개념**: Window Function, RANGE/ROWS, COUNT DISTINCT, CTE
- **자주 출제하는 기업**: 카카오, 네이버, 쿠팡, 토스, 라인

---

### 1단계: 문제 이해 확인 (30초)

> "Rolling MAU라고 하면, 특정 날짜를 기준으로 과거 7일간(혹은 30일간) 접속한 **순 사용자 수(Unique Users)**를 매일 계산하는 지표로 이해하겠습니다. 일반적인 MAU가 월 단위 고정 구간인 반면, Rolling MAU는 슬라이딩 윈도우 방식으로 매일 갱신되기 때문에 트렌드 변화를 더 세밀하게 포착할 수 있습니다. 혹시 기간이나 기준 테이블에 대해 추가 조건이 있을까요?"

**확인할 사항:**
- Rolling 기간: 7일인지 30일인지
- 기준 이벤트: 로그인인지, 주문인지, 특정 이벤트인지
- 출력 형태: 날짜별 한 행씩인지

---

### 2단계: 접근 방법 설명 (1분)

> "접근 방법을 단계별로 말씀드리겠습니다."

1. **일별 고유 사용자 집계**: 먼저 이벤트 테이블에서 날짜별로 중복을 제거한 사용자 목록을 만듭니다.
2. **날짜-사용자 페어 생성**: 각 날짜에 해당 사용자가 활동했는지 여부를 나타내는 행을 생성합니다.
3. **7일 윈도우 내 고유 사용자 카운트**: 각 날짜를 기준으로 과거 6일(총 7일)의 고유 사용자를 셉니다.
4. **Window Function 활용**: `COUNT(DISTINCT ...)`는 일반적으로 Window Function과 직접 결합이 안 되므로, 날짜별 사용자를 먼저 펼친 뒤 서브쿼리나 Self JOIN으로 처리합니다. 또는 `dense_rank` 기반 우회 방법을 사용합니다.

> "핵심 트릭은 COUNT DISTINCT가 윈도우 함수에서 직접 지원되지 않기 때문에, CTE로 단계를 분리하여 해결하는 것입니다."

---

### 3단계: 쿼리 작성 (2분)

```sql
-- 7일 Rolling MAU 계산
-- 스키마: events(event_id, user_id, event_date, event_type)

WITH daily_users AS (
    -- 1단계: 날짜별 고유 사용자 추출 (중복 제거)
    SELECT DISTINCT
        event_date,
        user_id
    FROM events
    WHERE event_type = 'login'
      AND event_date BETWEEN '2024-01-01' AND '2024-12-31'
),

date_spine AS (
    -- 2단계: 분석 기간의 모든 날짜 생성
    SELECT DISTINCT event_date AS base_date
    FROM events
    WHERE event_date BETWEEN '2024-01-01' AND '2024-12-31'
),

rolling_mau AS (
    -- 3단계: 각 기준 날짜에 대해 과거 7일 내 고유 사용자 수 계산
    SELECT
        ds.base_date,
        COUNT(DISTINCT du.user_id) AS mau_7d
    FROM date_spine ds
    LEFT JOIN daily_users du
        ON du.event_date BETWEEN ds.base_date - INTERVAL '6 days'
                              AND ds.base_date
    GROUP BY ds.base_date
)

SELECT
    base_date,
    mau_7d,
    LAG(mau_7d, 7) OVER (ORDER BY base_date) AS mau_7d_prev_week,
    ROUND(
        (mau_7d - LAG(mau_7d, 7) OVER (ORDER BY base_date))::NUMERIC
        / NULLIF(LAG(mau_7d, 7) OVER (ORDER BY base_date), 0) * 100,
        2
    ) AS wow_change_pct
FROM rolling_mau
ORDER BY base_date;
```

**쿼리 설명** (작성하면서 말할 내용):
- **CTE 1 (`daily_users`)**: 이벤트 테이블에서 날짜별 고유 사용자를 추출합니다. `SELECT DISTINCT`로 같은 날 여러 번 로그인한 경우를 한 번만 카운트합니다.
- **CTE 2 (`date_spine`)**: 분석 기간의 모든 날짜를 생성합니다. 활동이 없는 날짜도 포함하기 위함입니다.
- **CTE 3 (`rolling_mau`)**: 핵심 로직입니다. 각 기준 날짜(`base_date`)에 대해 과거 7일 범위의 사용자를 `LEFT JOIN`으로 연결하고 `COUNT(DISTINCT user_id)`로 집계합니다.
- **최종 SELECT**: Rolling MAU와 함께 전주 대비 변화율(WoW)을 계산하여 트렌드를 파악합니다.

---

### 4단계: 결과 검증 (1분)

> "결과를 검증하기 위해 다음과 같은 방법을 사용하겠습니다."

1. **특정 날짜 수동 검증**: 예를 들어 2024-01-08의 결과를 확인하려면, 1월 2일~8일까지의 고유 사용자 수를 직접 세어봅니다.
   ```sql
   SELECT COUNT(DISTINCT user_id)
   FROM events
   WHERE event_type = 'login'
     AND event_date BETWEEN '2024-01-02' AND '2024-01-08';
   ```
2. **경계값 확인**: 첫 7일(1월 1일~7일)은 이전 데이터가 부족하므로 값이 낮을 수 있습니다. 이는 정상적인 현상입니다.
3. **단조성 체크**: MAU 값이 음수이거나 전체 사용자 수를 초과하는 경우가 없는지 확인합니다.
4. **DAU와 비교**: 7일 Rolling MAU는 항상 해당 일의 DAU 이상이어야 합니다(같은 기간이므로).

---

### 5단계: 예상 추가 질문 & 모범 답변

**Q1**: DAU와 MAU의 차이점은 무엇이고, DAU/MAU 비율은 어떤 의미인가요?
**A1**: DAU(Daily Active Users)는 하루 동안의 고유 활성 사용자, MAU(Monthly Active Users)는 월간 고유 활성 사용자입니다. DAU/MAU 비율은 **Stickiness(고착도)**라고 하며, 사용자가 얼마나 자주 서비스를 이용하는지를 나타냅니다. 이 비율이 높을수록(예: 0.5 이상) 사용자가 거의 매일 접속한다는 의미이고, 소셜미디어나 메신저 앱에서 특히 중요한 지표입니다. 일반적으로 20% 이상이면 양호, 50% 이상이면 매우 우수한 수준입니다.

**Q2**: Window Function에서 ROWS와 RANGE의 차이는 무엇인가요?
**A2**: `ROWS BETWEEN`은 물리적 행 수 기준으로 윈도우를 정의합니다. 예를 들어 `ROWS BETWEEN 6 PRECEDING AND CURRENT ROW`는 현재 행 포함 7개 행입니다. 반면 `RANGE BETWEEN`은 논리적 값 범위 기준입니다. 날짜 컬럼에서 `RANGE BETWEEN INTERVAL '6 days' PRECEDING AND CURRENT ROW`는 실제 날짜 차이를 기준으로 합니다. **Rolling MAU에서는 RANGE가 더 적합**합니다. 중간에 데이터가 없는 날짜가 있을 수 있기 때문에, ROWS를 사용하면 의도한 7일이 아닌 7행이 되어 실제로는 더 긴 기간을 포함할 수 있습니다.

**Q3**: Window Function의 성능 이슈는 어떻게 해결하나요?
**A3**: Window Function은 파티션 전체를 메모리에 올려야 하므로 대용량 데이터에서 성능 문제가 발생할 수 있습니다. 해결 방법으로는: (1) **사전 집계 테이블** 활용 - 일별 집계를 미리 해두면 Window Function 대상 행 수가 줄어듭니다. (2) **인덱스 최적화** - `(event_date, user_id)` 복합 인덱스를 생성합니다. (3) **파티셔닝** - 날짜 기준 테이블 파티셔닝으로 스캔 범위를 줄입니다. (4) **Materialized View** - 주기적으로 미리 계산된 결과를 저장합니다.

**Q4**: 실시간 MAU를 계산해야 한다면 어떻게 접근하시겠습니까?
**A4**: 실시간 계산이 필요하다면 전통적인 SQL 배치 방식은 한계가 있습니다. (1) **Redis의 HyperLogLog**를 사용하면 근사치 고유 사용자 수를 O(1) 시간에 계산할 수 있습니다. 메모리도 12KB 정도로 매우 효율적입니다. (2) **Apache Kafka + Flink** 같은 스트리밍 파이프라인에서 슬라이딩 윈도우를 구현할 수 있습니다. (3) 약간의 지연을 허용한다면, 1분 단위로 갱신되는 **Materialized View**도 실용적입니다. 정확도와 실시간성 사이의 트레이드오프를 비즈니스 요구사항에 맞게 결정해야 합니다.

**Q5**: Rolling 기간을 7일에서 30일로 변경하려면 쿼리를 어떻게 수정하나요?
**A5**: 두 곳만 변경하면 됩니다. `rolling_mau` CTE에서 JOIN 조건의 `INTERVAL '6 days'`를 `INTERVAL '29 days'`로 변경하고, 최종 SELECT의 `LAG` 함수에서 `LAG(mau_7d, 7)`을 `LAG(mau_30d, 30)`으로 변경합니다. 쿼리를 매개변수화하여 기간을 변수로 받도록 설계하면 재사용성이 높아집니다. 다만, 30일 Rolling의 경우 JOIN 대상 행 수가 약 4배 증가하므로 성능 튜닝을 함께 고려해야 합니다.

**Q6**: COUNT DISTINCT가 Window Function에서 직접 지원되지 않는 이유와 대안은 무엇인가요?
**A6**: 대부분의 RDBMS에서 `COUNT(DISTINCT ...) OVER()`를 지원하지 않는 이유는, 윈도우 프레임이 이동할 때마다 고유 값 집합을 효율적으로 유지(incremental update)하기 어렵기 때문입니다. 대안으로는: (1) 이 쿼리에서 사용한 것처럼 **Self JOIN + GROUP BY** 조합, (2) **DENSE_RANK 기반 우회** - `MAX(DENSE_RANK() OVER(...)) OVER(...)`으로 근사, (3) PostgreSQL 기준 **LATERAL JOIN** 활용, (4) 최근 일부 DB(BigQuery 등)에서는 `COUNT(DISTINCT) OVER()`를 직접 지원합니다.

---

### 핵심 요약 (30초 엘리베이터 피치)

"7일 Rolling MAU는 매일 과거 7일간의 고유 활성 사용자 수를 계산하는 지표입니다. 핵심 구현 전략은 세 단계입니다. 첫째, 일별 고유 사용자를 CTE로 추출하고, 둘째, 날짜 스파인과 범위 JOIN으로 7일 윈도우를 구성하며, 셋째, COUNT DISTINCT로 집계합니다. Window Function에서 COUNT DISTINCT가 직접 지원되지 않으므로 JOIN 기반 우회가 필요하다는 점이 핵심 포인트이고, 대용량 데이터에서는 사전 집계 테이블이나 HyperLogLog 같은 근사 알고리즘을 고려해야 합니다."
