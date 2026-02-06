## Case 09: Partitioning/Clustering 활용 (BigQuery) - 월별 이벤트 집계 비용 최적화

### 문제 상황

라프텔 데이터팀에서 BigQuery로 월별 사용자 이벤트 집계 쿼리를 실행하고 있는데,
매번 전체 테이블을 풀스캔하여 비용이 과도하게 발생하고 있다.
이벤트 테이블에는 약 3년치 데이터(약 15억 건, 비압축 기준 약 2.1GB)가 저장되어 있으며,
실제 분석은 최근 1개월 데이터만 사용하는 경우가 대부분이다.
월간 BigQuery 비용이 $300 이상 발생하여 비용 최적화가 시급한 상황이다.

### Before (비효율적)

**실행 시간**: 12.3초
**Scanned Data**: 2.1 GB (전체 테이블)
**예상 비용**: $10.50 (쿼리당, $5/TB 기준)

```sql
-- 파티셔닝 없는 테이블에서 전체 스캔
-- 테이블: `project.dataset.events` (파티셔닝/클러스터링 미적용)
SELECT
    FORMAT_DATE('%Y-%m', event_date) AS event_month,
    event_type,
    COUNT(DISTINCT user_id) AS unique_users,
    COUNT(event_id) AS total_events,
    COUNT(DISTINCT user_id) / LAG(COUNT(DISTINCT user_id)) OVER (
        PARTITION BY event_type
        ORDER BY FORMAT_DATE('%Y-%m', event_date)
    ) AS mom_ratio
FROM `project.dataset.events`
WHERE event_date BETWEEN '2024-11-01' AND '2024-12-31'
    AND event_type IN ('play', 'search', 'subscribe')
GROUP BY
    event_month,
    event_type
ORDER BY
    event_month,
    event_type;
```

**BigQuery Query Plan (Before)**:
```
Stage 1 (Input):
  READ: project.dataset.events
  - Records read: 1,500,000,000
  - Bytes read: 2.1 GB
  - Slot time: 45,000 ms
  FILTER: event_date BETWEEN '2024-11-01' AND '2024-12-31'
           AND event_type IN ('play', 'search', 'subscribe')
  - Records after filter: 28,456,789
  - Bytes shuffled: 456 MB

Stage 2 (Aggregate):
  AGGREGATE: GROUP BY event_month, event_type
  - COUNT(DISTINCT user_id), COUNT(event_id)
  - Slot time: 12,000 ms

Stage 3 (Window):
  WINDOW: LAG() OVER (PARTITION BY event_type ORDER BY event_month)
  - Slot time: 2,000 ms

Stage 4 (Output):
  WRITE: __output__
  - Records written: 6
  - Bytes written: 240 B

Total:
  Slot time consumed: 59,000 ms
  Bytes processed: 2.1 GB
  Billing tier: On-demand ($5/TB)
  Estimated cost: $10.50
```

**병목 원인**:
- 파티셔닝이 없어 WHERE event_date 필터가 있어도 테이블 전체(2.1GB)를 스캔
- 15억 건 중 실제 필요한 데이터는 약 2,845만 건(1.9%)에 불과하지만 100% 스캔
- event_type 필터도 스캔 후 메모리에서 필터링하여 불필요한 데이터 읽기 발생
- 쿼리당 $10.50 비용으로, 일 10회 실행 시 월 $3,150 발생

### After (최적화)

**실행 시간**: 1.8초 (85% 개선)
**Scanned Data**: 180 MB (91% 감소)
**예상 비용**: $0.90 (91% 절감)

**Step 1: 파티셔닝 + 클러스터링 테이블 생성**

```sql
-- event_date로 DATE 파티셔닝 + event_type으로 클러스터링
CREATE TABLE `project.dataset.events_optimized`
PARTITION BY event_date
CLUSTER BY event_type
AS
SELECT
    event_id,
    user_id,
    event_date,
    event_type
FROM `project.dataset.events`;
```

**Step 2: 최적화된 쿼리 실행**

```sql
-- 파티션 프루닝 + 클러스터 필터링이 자동 적용
SELECT
    FORMAT_DATE('%Y-%m', event_date) AS event_month,
    event_type,
    COUNT(DISTINCT user_id) AS unique_users,
    COUNT(event_id) AS total_events,
    COUNT(DISTINCT user_id) / LAG(COUNT(DISTINCT user_id)) OVER (
        PARTITION BY event_type
        ORDER BY FORMAT_DATE('%Y-%m', event_date)
    ) AS mom_ratio
FROM `project.dataset.events_optimized`
WHERE event_date BETWEEN '2024-11-01' AND '2024-12-31'
    AND event_type IN ('play', 'search', 'subscribe')
GROUP BY
    event_month,
    event_type
ORDER BY
    event_month,
    event_type;
```

**BigQuery Query Plan (After)**:
```
Stage 1 (Input):
  READ: project.dataset.events_optimized
  - Partitions matched: 61 / 1,095 (partition pruning)
  - Cluster blocks scanned: 183 / 4,392 (cluster filtering)
  - Records read: 28,456,789
  - Bytes read: 180 MB
  - Slot time: 3,200 ms
  FILTER: event_type IN ('play', 'search', 'subscribe')
  - Records after filter: 28,456,789 (cluster filtering으로 이미 대부분 필터링됨)
  - Bytes shuffled: 42 MB

Stage 2 (Aggregate):
  AGGREGATE: GROUP BY event_month, event_type
  - COUNT(DISTINCT user_id), COUNT(event_id)
  - Slot time: 1,800 ms

Stage 3 (Window):
  WINDOW: LAG() OVER (PARTITION BY event_type ORDER BY event_month)
  - Slot time: 200 ms

Stage 4 (Output):
  WRITE: __output__
  - Records written: 6
  - Bytes written: 240 B

Total:
  Slot time consumed: 5,200 ms
  Bytes processed: 180 MB
  Billing tier: On-demand ($5/TB)
  Estimated cost: $0.90
```

**개선 포인트**:
- 파티션 프루닝: 1,095개 파티션 중 61개(2024-11-01 ~ 2024-12-31)만 스캔하여 데이터 읽기량 91% 감소
- 클러스터 필터링: event_type 기준으로 데이터가 물리적으로 정렬되어 있어 블록 수준에서 불필요한 데이터 건너뜀
- Slot time 59초에서 5.2초로 91% 감소하여 병렬 처리 리소스도 절약
- Shuffle 데이터 456MB에서 42MB로 감소하여 Stage 간 네트워크 I/O도 개선

### 파티셔닝 전략 가이드

```
파티셔닝 컬럼 선택 기준:
+-----------------------------------+----------------------------+
| 기준                               | 권장 사항                   |
+-----------------------------------+----------------------------+
| WHERE 절에 자주 사용되는 날짜 컬럼    | DATE 파티셔닝 최우선         |
| 카디널리티가 너무 높으면 안 됨        | 파티션 수 4,000개 이하       |
| 데이터가 고르게 분포                 | 특정 파티션에 쏠리지 않도록   |
+-----------------------------------+----------------------------+

클러스터링 컬럼 선택 기준:
+-----------------------------------+----------------------------+
| 기준                               | 권장 사항                   |
+-----------------------------------+----------------------------+
| WHERE / GROUP BY에 자주 사용        | 첫 번째 클러스터링 컬럼       |
| 카디널리티가 적당한 컬럼             | 카디널리티 높으면 효과 감소   |
| 최대 4개 컬럼까지 지정 가능          | 자주 쓰는 순서대로 지정       |
+-----------------------------------+----------------------------+
```

### 비용 비교 요약

| 항목 | Before | After | 개선율 |
|------|--------|-------|--------|
| 스캔 데이터 | 2.1 GB | 180 MB | 91% 감소 |
| 쿼리당 비용 | $10.50 | $0.90 | 91% 절감 |
| 일 10회 실행 시 월 비용 | $3,150 | $270 | $2,880 절감 |
| Slot time | 59초 | 5.2초 | 91% 감소 |
| 실행 시간 | 12.3초 | 1.8초 | 85% 개선 |

### 핵심 교훈

- BigQuery는 스캔한 데이터량 기준으로 과금하므로, 파티셔닝으로 스캔 범위를 줄이는 것이 비용 최적화의 핵심이다
- DATE 파티셔닝은 시계열 데이터에서 가장 효과적이며, WHERE 절의 날짜 필터와 자동으로 연동된다
- 클러스터링은 파티션 내부에서 추가적인 블록 수준 필터링을 제공하여 스캔량을 더 줄여준다
- 파티셔닝 + 클러스터링은 한 번 설정하면 쿼리 수정 없이 자동 적용되므로 ROI가 매우 높다
- BigQuery에서 쿼리 실행 전 "이 쿼리가 처리할 바이트" 표시를 반드시 확인하는 습관을 들여라

### 면접에서 이렇게 설명하세요

"월별 이벤트 집계 쿼리가 BigQuery에서 매번 2.1GB 전체 테이블을 스캔하여 쿼리당 $10.50의 비용이 발생하고 있었습니다.
event_date 컬럼으로 DATE 파티셔닝을 적용하고 event_type으로 클러스터링을 추가하여,
파티션 프루닝으로 스캔 범위를 180MB로 91% 줄였고, 비용도 $0.90으로 91% 절감했습니다.
BigQuery는 스캔량 기반 과금이므로, 파티셔닝은 성능뿐 아니라 비용 최적화의 핵심 전략입니다."
