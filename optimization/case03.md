## Case 03: 불필요한 JOIN 제거

### 문제 상황

라프텔 마케팅팀이 이번 달 활성 구독자 수를 요청했다. 기존 쿼리는 subscriptions, users, events 3개 테이블을 모두 JOIN하고 있었다. 그러나 실제로 "이번 달 활성 구독자 수"를 구하는 데는 subscriptions 테이블 하나면 충분했다. 불필요한 JOIN으로 인해 수백만 건의 events 테이블까지 스캔되면서 쿼리 실행 시간이 5초를 넘기고 있었다. 마케팅팀은 이 수치를 매일 아침 슬랙으로 받아보길 원했기 때문에 빠른 응답 속도가 필수였다.

### Before (비효율적)

**실행 시간**: 5.4초
**Scanned Data**: 3.1 GB

```sql
-- 불필요한 3개 테이블 JOIN
SELECT
    COUNT(DISTINCT s.user_id) AS active_subscriber_count
FROM
    subscriptions s
    INNER JOIN users u
        ON s.user_id = u.user_id
    INNER JOIN events e
        ON s.user_id = e.user_id
WHERE
    s.status = 'active'
    AND s.start_date <= CURRENT_DATE
    AND (s.end_date IS NULL OR s.end_date >= CURRENT_DATE);
```

**EXPLAIN ANALYZE 결과**:

```
Aggregate  (cost=892345.00..892345.01 rows=1 width=8)
  ->  Hash Join  (cost=345678.00..885432.00 rows=2765200 width=4)
        Hash Cond: (e.user_id = s.user_id)
        ->  Seq Scan on events e  (cost=0.00..312456.00 rows=15000000 width=4)
        ->  Hash  (cost=234567.00..234567.00 rows=120000 width=8)
              ->  Hash Join  (cost=12345.00..234567.00 rows=120000 width=8)
                    Hash Cond: (s.user_id = u.user_id)
                    ->  Seq Scan on subscriptions s  (cost=0.00..198765.00 rows=120000 width=4)
                          Filter: ((status = 'active') AND (start_date <= CURRENT_DATE) AND ((end_date IS NULL) OR (end_date >= CURRENT_DATE)))
                    ->  Hash  (cost=9876.00..9876.00 rows=800000 width=4)
                          ->  Seq Scan on users u  (cost=0.00..9876.00 rows=800000 width=4)
  Planning Time: 3.45 ms
  Execution Time: 5423.12 ms
```

**병목 원인**:

- events 테이블(1,500만 건)을 불필요하게 전체 스캔하고 있음
- users 테이블과의 JOIN도 불필요 -- subscriptions에 이미 user_id가 있고, users의 다른 컬럼을 사용하지 않음
- 3개 테이블 JOIN으로 중간 결과 집합이 276만 건으로 폭발적 증가
- COUNT(DISTINCT)가 거대한 중간 결과에 대해 수행되어 추가 비용 발생
- events와 JOIN하면서 동일 user_id가 이벤트 수만큼 중복되어 DISTINCT 비용 극대화

### After (최적화)

**실행 시간**: 0.3초 (94% 개선)
**Scanned Data**: 0.18 GB (94% 감소)

```sql
-- 불필요한 JOIN 제거, subscriptions 테이블 단독으로 충분
SELECT
    COUNT(*) AS active_subscriber_count
FROM
    subscriptions
WHERE
    status = 'active'
    AND start_date <= CURRENT_DATE
    AND (end_date IS NULL OR end_date >= CURRENT_DATE);
```

**EXPLAIN ANALYZE 결과**:

```
Aggregate  (cost=24567.00..24567.01 rows=1 width=8)
  ->  Index Scan using idx_subscriptions_status on subscriptions  (cost=0.42..24123.00 rows=120000 width=0)
        Index Cond: (status = 'active')
        Filter: ((start_date <= CURRENT_DATE) AND ((end_date IS NULL) OR (end_date >= CURRENT_DATE)))
        Rows Removed by Filter: 35000
  Planning Time: 0.18 ms
  Execution Time: 298.45 ms
```

**개선 포인트**:

- 1,500만 건의 events 테이블 스캔을 완전히 제거
- 80만 건의 users 테이블 스캔도 제거 -- 결과에 users 컬럼이 필요 없으므로 JOIN 불필요
- 3개 테이블 JOIN이 단일 테이블 조회로 단순화되어 실행 계획이 극적으로 간소화
- COUNT(DISTINCT user_id)가 COUNT(*)로 변경 가능 -- subscriptions에서 active 상태는 user_id당 1건이므로
- 인덱스 스캔을 활용할 수 있게 되어 디스크 I/O 대폭 감소

### 핵심 교훈

- 쿼리를 작성하기 전에 "이 결과를 얻는 데 정말 필요한 테이블이 무엇인가?"를 먼저 판단하라
- JOIN을 추가할 때마다 중간 결과 집합이 커질 수 있다는 점을 인지해야 한다
- 이전 쿼리를 복사해서 수정할 때 불필요한 JOIN이 잔존하는 경우가 매우 흔하다
- SELECT 절에서 사용하지 않는 테이블이 FROM/JOIN에 있다면 제거 대상으로 의심하라
- COUNT(DISTINCT)가 보이면 "왜 DISTINCT가 필요한가? JOIN 때문이 아닌가?"를 자문하라

### 면접에서 이렇게 설명하세요

"라프텔 마케팅팀이 매일 아침 슬랙으로 받아볼 활성 구독자 수 리포트를 만드는데, 기존 쿼리가 5.4초나 걸렸습니다. 분석해보니 subscriptions, users, events 3개 테이블을 JOIN하고 있었는데, 실제로 필요한 건 subscriptions 테이블 하나뿐이었습니다. 특히 1,500만 건의 events 테이블이 불필요하게 전체 스캔되면서 중간 결과가 276만 건으로 폭발하고 있었습니다. 불필요한 JOIN 2개를 제거하고 단일 테이블 조회로 바꾼 결과, 0.3초로 94% 개선되었습니다. 이 경험을 통해 쿼리 작성 시 '이 JOIN이 정말 필요한가?'를 항상 점검하는 습관을 갖게 되었습니다."
