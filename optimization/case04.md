## Case 04: WHERE 절 인덱스 활용 (함수 적용으로 인한 인덱스 무효화 제거)

### 문제 상황

에이블리 CS팀이 2025년도 취소 주문을 조회해달라고 요청했다. 고객 환불 처리 현황을 파악하기 위한 용도였다. 기존 쿼리는 `WHERE EXTRACT(YEAR FROM order_date) = 2025`로 작성되어 있었는데, order_date 컬럼에 인덱스가 걸려 있음에도 불구하고 EXTRACT 함수가 컬럼에 적용되면서 인덱스를 전혀 활용하지 못하고 있었다. 주문 테이블이 1,770만 건인 상황에서 매번 전체 테이블을 스캔하느라 15초가 넘게 걸렸고, CS팀원들이 "조회할 때마다 멍하니 기다려야 한다"는 불만을 제기했다.

### Before (비효율적)

**실행 시간**: 15.2초
**Scanned Data**: 5.8 GB

```sql
-- 컬럼에 함수를 적용하여 인덱스가 무효화되는 쿼리
SELECT
    order_id,
    user_id,
    order_date,
    total_amount,
    status
FROM
    orders
WHERE
    EXTRACT(YEAR FROM order_date) = 2025
    AND status = 'cancelled';
```

**EXPLAIN ANALYZE 결과**:

```
Seq Scan on orders  (cost=0.00..1245678.00 rows=523000 width=48)
  Filter: ((EXTRACT(year FROM order_date) = 2025) AND (status = 'cancelled'))
  Rows Removed by Filter: 17177000
  Buffers: shared hit=2048 read=786432
  Planning Time: 0.92 ms
  Execution Time: 15234.67 ms
  -- idx_orders_order_date 인덱스가 존재하지만 EXTRACT() 함수 때문에 사용 불가
  -- 17,700,000건 전체를 Seq Scan으로 읽은 후 필터링
```

**병목 원인**:

- `EXTRACT(YEAR FROM order_date)`가 컬럼에 함수를 적용하여 인덱스 무효화 (SARGable 위반)
- 옵티마이저는 함수가 적용된 컬럼의 결과를 미리 알 수 없으므로 인덱스를 사용할 수 없음
- 1,770만 건 전체를 Sequential Scan으로 읽어야 하므로 디스크 I/O가 극대화
- `YEAR()`, `MONTH()`, `DATE()`, `UPPER()`, `LOWER()` 등 WHERE 절에서 컬럼에 함수를 적용하면 동일한 문제 발생
- 인덱스가 있어도 없는 것과 마찬가지인 상황

### After (최적화)

**실행 시간**: 0.5초 (97% 개선)
**Scanned Data**: 0.42 GB (93% 감소)

```sql
-- 범위 조건으로 변경하여 인덱스를 활용하는 쿼리
SELECT
    order_id,
    user_id,
    order_date,
    total_amount,
    status
FROM
    orders
WHERE
    order_date >= '2025-01-01'
    AND order_date < '2026-01-01'
    AND status = 'cancelled';
```

**EXPLAIN ANALYZE 결과**:

```
Index Scan using idx_orders_order_date on orders  (cost=0.56..34521.00 rows=523000 width=48)
  Index Cond: ((order_date >= '2025-01-01'::date) AND (order_date < '2026-01-01'::date))
  Filter: (status = 'cancelled')
  Rows Removed by Filter: 4707000
  Buffers: shared hit=512 read=24576
  Planning Time: 0.15 ms
  Execution Time: 498.23 ms
  -- 인덱스를 통해 2025년 데이터만 직접 접근 (523만 건)
  -- 이후 status = 'cancelled' 필터로 최종 결과 도출
```

**개선 포인트**:

- `EXTRACT(YEAR FROM ...)` 대신 범위 조건(`>=`, `<`)을 사용하여 인덱스 활용 가능하게 변경
- Seq Scan이 Index Scan으로 전환되어 1,770만 건 중 2025년 데이터(523만 건)만 직접 접근
- 디스크 읽기가 786,432 블록에서 24,576 블록으로 97% 감소
- 복합 인덱스 `(order_date, status)`를 추가하면 Filter 단계도 제거 가능하여 추가 최적화 여지 있음
- `order_date < '2026-01-01'`은 `order_date <= '2025-12-31'`보다 안전함 (시간 포함 시 경계값 누락 방지)

### 추가 최적화: 복합 인덱스 적용

```sql
-- 복합 인덱스 생성 (추가 최적화)
CREATE INDEX idx_orders_date_status
    ON orders (order_date, status);
```

```
-- 복합 인덱스 적용 후 EXPLAIN ANALYZE
Index Scan using idx_orders_date_status on orders  (cost=0.56..12345.00 rows=523000 width=48)
  Index Cond: ((order_date >= '2025-01-01'::date) AND (order_date < '2026-01-01'::date) AND (status = 'cancelled'))
  Buffers: shared hit=256 read=8192
  Planning Time: 0.12 ms
  Execution Time: 187.45 ms
```

### 핵심 교훈

- WHERE 절에서 컬럼에 함수를 적용하면 인덱스가 무효화된다 (SARGable 조건 위반)
- 날짜 필터링은 항상 범위 조건(`>=`, `<`)으로 작성하라
- `EXTRACT()`, `YEAR()`, `DATE_FORMAT()`, `CAST()` 등을 WHERE 절 컬럼에 직접 적용하지 마라
- 실행 계획에서 Seq Scan이 보이면 "인덱스가 있는데 왜 안 쓰이는가?"를 반드시 확인하라
- 이 원칙은 `WHERE UPPER(email) = 'TEST@TEST.COM'` 같은 패턴에도 동일하게 적용된다

### 면접에서 이렇게 설명하세요

"에이블리 CS팀의 취소 주문 조회 쿼리가 15초나 걸려 실무에서 사용이 불가능했습니다. 원인을 분석해보니 WHERE 절에서 EXTRACT(YEAR FROM order_date)로 함수를 컬럼에 적용하고 있어, order_date 인덱스가 있음에도 전혀 활용되지 않고 1,770만 건 전체를 Sequential Scan하고 있었습니다. 이는 SARGable 조건 위반으로, 옵티마이저가 함수 적용 결과를 예측할 수 없기 때문입니다. 범위 조건으로 변경하여 인덱스를 활용하게 만든 결과, Seq Scan이 Index Scan으로 전환되면서 15.2초에서 0.5초로 97% 개선되었습니다. 이후 복합 인덱스까지 적용하여 0.18초까지 추가 최적화했습니다."
