## Case 01: SELECT * 남용 제거

### 문제 상황

에이블리 PM이 이번 달 주문 현황 리포트를 요청했다. 기존 대시보드 쿼리가 `SELECT *`로 작성되어 있어 주문 테이블의 전체 컬럼(20개 이상)을 매번 스캔하고 있었다. 주문 데이터가 월 500만 건 이상 적재되는 상황에서, 리포트 로딩 시간이 12초를 넘기며 PM이 "대시보드가 너무 느려서 못 쓰겠다"는 피드백을 주었다.

실제로 리포트에 필요한 정보는 주문 ID, 주문일, 총 금액, 주문 상태 4개뿐이었다.

### Before (비효율적)

**실행 시간**: 12.3초
**Scanned Data**: 4.2 GB

```sql
-- 전체 컬럼을 스캔하는 비효율적 쿼리
SELECT
    *
FROM
    orders
WHERE
    order_date >= '2025-01-01';
```

**EXPLAIN ANALYZE 결과**:

```
Seq Scan on orders  (cost=0.00..985432.00 rows=5230000 width=312)
  Filter: (order_date >= '2025-01-01'::date)
  Rows Removed by Filter: 12450000
  Buffers: shared hit=1024 read=524288
  Planning Time: 0.85 ms
  Execution Time: 12312.45 ms
```

**BigQuery 기준 비용**: $5.12 (4.2 GB 스캔 x $5/TB)

**병목 원인**:

- `SELECT *`로 인해 orders 테이블의 전체 컬럼(20개)을 디스크에서 읽어야 함
- 실제 리포트에 불필요한 TEXT, JSON 타입의 대용량 컬럼(배송지 주소, 메모, 메타데이터 등)까지 모두 스캔
- 컬럼 수가 많을수록 I/O 비용과 네트워크 전송량이 비례하여 증가
- BigQuery 같은 컬럼 기반 스토리지에서는 선택한 컬럼 수가 곧 과금 기준

### After (최적화)

**실행 시간**: 0.8초 (93% 개선)
**Scanned Data**: 0.34 GB (92% 감소)

```sql
-- 필요한 컬럼만 명시적으로 선택
SELECT
    order_id,
    order_date,
    total_amount,
    status
FROM
    orders
WHERE
    order_date >= '2025-01-01';
```

**EXPLAIN ANALYZE 결과**:

```
Index Scan using idx_orders_order_date on orders  (cost=0.43..48523.00 rows=5230000 width=28)
  Index Cond: (order_date >= '2025-01-01'::date)
  Buffers: shared hit=512 read=32768
  Planning Time: 0.12 ms
  Execution Time: 823.67 ms
```

**BigQuery 기준 비용**: $0.41 (0.34 GB 스캔 x $5/TB) -- 기존 대비 92% 비용 절감

**개선 포인트**:

- 필요한 4개 컬럼만 선택하여 디스크 I/O를 92% 감소시킴
- width가 312 -> 28로 줄어 네트워크 전송량 대폭 감소
- 불필요한 TEXT/JSON 대용량 컬럼을 제외하여 메모리 사용량 절감
- BigQuery 비용이 $5.12 -> $0.41로 월 기준 수십만 원 절약 가능
- 컬럼 축소로 인해 옵티마이저가 인덱스 온리 스캔을 선택할 가능성 증가

### 핵심 교훈

- `SELECT *`는 개발 편의성을 위한 것이지 프로덕션 쿼리에서 사용하면 안 된다
- 컬럼 기반 스토리지(BigQuery, Redshift, Snowflake)에서는 선택 컬럼 수가 곧 비용이다
- 쿼리 작성 시 "이 리포트에 정말 필요한 컬럼이 무엇인가?"를 먼저 확인하는 습관이 중요하다
- `SELECT *`를 쓰면 테이블 스키마 변경 시 다운스트림 파이프라인이 예기치 않게 깨질 수도 있다

### 면접에서 이렇게 설명하세요

"에이블리에서 PM이 요청한 월간 주문 리포트 대시보드가 12초 이상 걸려 사용이 불가능한 상태였습니다. 원인을 분석해보니 SELECT *로 20개 전체 컬럼을 스캔하고 있었고, 실제 리포트에 필요한 건 4개 컬럼뿐이었습니다. 필요한 컬럼만 명시적으로 선택하도록 수정한 결과, 스캔 데이터가 4.2GB에서 0.34GB로 92% 줄었고 실행 시간은 12.3초에서 0.8초로 93% 개선되었습니다. BigQuery 기준 비용도 건당 $5.12에서 $0.41로 절감했습니다. 이 경험을 통해 컬럼 기반 스토리지에서 SELECT *가 얼마나 큰 비용 낭비인지 체감했습니다."
