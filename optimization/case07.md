## Case 07: UNION vs UNION ALL - 프로모션 대상자 리스트 최적화

### 문제 상황

에이블리 마케팅팀에서 봄 시즌 프로모션 대상자 리스트를 요청했다.
대상자는 두 그룹으로 나뉜다: (1) 최근 30일 이내 가입한 신규 사용자, (2) 최근 90일 이내 재구매한 기존 사용자.
기존 쿼리에서 UNION을 사용하여 두 그룹을 합치고 있었는데, 두 그룹의 조건이 상호 배타적(가입일 기준)임에도
불구하고 중복 제거 연산이 수행되어 불필요한 정렬과 비교가 발생하고 있었다.
사용자 테이블 약 800만 건, 주문 테이블 약 3,000만 건 규모에서 4초 이상의 실행 시간이 발생했다.

### Before (비효율적)

**실행 시간**: 4.2초
**Scanned Data**: 890 MB

```sql
-- UNION으로 중복 제거 (불필요한 Sort + Unique 연산)
SELECT
    u.user_id,
    u.signup_date,
    u.region,
    'NEW_USER' AS promo_segment
FROM users AS u
WHERE u.signup_date >= CURRENT_DATE - INTERVAL '30 days'
    AND u.user_segment = 'regular'

UNION

SELECT
    u.user_id,
    u.signup_date,
    u.region,
    'REPEAT_BUYER' AS promo_segment
FROM users AS u
INNER JOIN orders AS o
    ON u.user_id = o.user_id
WHERE o.order_date >= CURRENT_DATE - INTERVAL '90 days'
    AND o.status = 'completed'
    AND u.signup_date < CURRENT_DATE - INTERVAL '30 days'
GROUP BY
    u.user_id,
    u.signup_date,
    u.region
HAVING COUNT(o.order_id) >= 2;
```

**EXPLAIN ANALYZE 결과**:
```
Unique  (cost=345678.90..367890.12 rows=234567 width=52) (actual time=3845.123..4189.456 rows=231045 loops=1)
  ->  Sort  (cost=345678.90..346789.01 rows=234567 width=52) (actual time=3845.120..3978.234 rows=234567 loops=1)
        Sort Key: u.user_id, u.signup_date, u.region, ('NEW_USER'::text)
        Sort Method: external merge  Disk: 24576kB
        ->  Append  (cost=0.00..312345.67 rows=234567 width=52) (actual time=0.034..3456.789 rows=234567 loops=1)
              ->  Seq Scan on users u  (cost=0.00..178234.56 rows=45678 width=52) (actual time=0.032..234.567 rows=45123 loops=1)
                    Filter: (signup_date >= (CURRENT_DATE - '30 days'::interval) AND user_segment = 'regular')
                    Rows Removed by Filter: 7954877
              ->  HashAggregate  (cost=123456.78..134567.89 rows=188889 width=52) (actual time=2890.123..3123.456 rows=189444 loops=1)
                    Group Key: u_1.user_id, u_1.signup_date, u_1.region
                    Filter: (count(o.order_id) >= 2)
                    Rows Removed by Filter: 567890
                    ->  Hash Join  (cost=89012.34..112345.67 rows=567890 width=44) (actual time=1234.567..2345.678 rows=757334 loops=1)
                          Hash Cond: (o.user_id = u_1.user_id)
                          ->  Seq Scan on orders o  (cost=0.00..56789.01 rows=1234567 width=8) (actual time=0.021..678.901 rows=1234567 loops=1)
                                Filter: (order_date >= (CURRENT_DATE - '90 days'::interval) AND status = 'completed')
                          ->  Hash  (cost=78901.23..78901.23 rows=7954877 width=36) (actual time=456.789..456.789 rows=7954877 loops=1)
                                ->  Seq Scan on users u_1  (cost=0.00..78901.23 rows=7954877 width=36) (actual time=0.015..234.567 rows=7954877 loops=1)
                                      Filter: (signup_date < (CURRENT_DATE - '30 days'::interval))
Planning Time: 1.567 ms
Execution Time: 4198.234 ms
```

**병목 원인**:
- UNION은 내부적으로 Sort + Unique 연산을 수행하여 전체 결과셋을 정렬 후 중복 비교
- promo_segment 컬럼이 'NEW_USER'와 'REPEAT_BUYER'로 이미 구분되므로 논리적으로 중복이 발생할 수 없음
- 정렬 시 메모리 초과로 디스크 기반 external merge sort 발생 (24MB 디스크 사용)
- 약 23만 건 전체를 불필요하게 정렬하는 오버헤드

### After (최적화)

**실행 시간**: 0.6초 (86% 개선)
**Scanned Data**: 890 MB (동일하지만 후처리 비용 제거)

```sql
-- UNION ALL로 불필요한 중복 제거 제거
-- 두 그룹은 signup_date 조건과 promo_segment가 상호 배타적이므로 중복 불가
WITH new_users AS (
    SELECT
        u.user_id,
        u.signup_date,
        u.region,
        'NEW_USER' AS promo_segment
    FROM users AS u
    WHERE u.signup_date >= CURRENT_DATE - INTERVAL '30 days'
        AND u.user_segment = 'regular'
),
repeat_buyers AS (
    SELECT
        u.user_id,
        u.signup_date,
        u.region,
        'REPEAT_BUYER' AS promo_segment
    FROM users AS u
    INNER JOIN orders AS o
        ON u.user_id = o.user_id
    WHERE o.order_date >= CURRENT_DATE - INTERVAL '90 days'
        AND o.status = 'completed'
        AND u.signup_date < CURRENT_DATE - INTERVAL '30 days'
    GROUP BY
        u.user_id,
        u.signup_date,
        u.region
    HAVING COUNT(o.order_id) >= 2
)
SELECT
    user_id,
    signup_date,
    region,
    promo_segment
FROM new_users

UNION ALL

SELECT
    user_id,
    signup_date,
    region,
    promo_segment
FROM repeat_buyers;
```

**EXPLAIN ANALYZE 결과**:
```
Append  (cost=0.00..312345.67 rows=234567 width=52) (actual time=0.031..589.234 rows=234567 loops=1)
  ->  CTE Scan on new_users  (cost=0.00..901.23 rows=45123 width=52) (actual time=0.029..12.345 rows=45123 loops=1)
        CTE new_users
          ->  Seq Scan on users u  (cost=0.00..178234.56 rows=45678 width=52) (actual time=0.027..198.456 rows=45123 loops=1)
                Filter: (signup_date >= (CURRENT_DATE - '30 days'::interval) AND user_segment = 'regular')
                Rows Removed by Filter: 7954877
  ->  CTE Scan on repeat_buyers  (cost=0.00..3789.01 rows=189444 width=52) (actual time=234.567..456.789 rows=189444 loops=1)
        CTE repeat_buyers
          ->  HashAggregate  (cost=123456.78..134567.89 rows=188889 width=52) (actual time=234.345..345.678 rows=189444 loops=1)
                Group Key: u_1.user_id, u_1.signup_date, u_1.region
                Filter: (count(o.order_id) >= 2)
                Rows Removed by Filter: 567890
                ->  Hash Join  (cost=89012.34..112345.67 rows=567890 width=44) (actual time=89.012..198.765 rows=757334 loops=1)
                      Hash Cond: (o.user_id = u_1.user_id)
                      ->  Index Scan using idx_orders_date_status on orders o  (cost=0.56..34567.89 rows=1234567 width=8) (actual time=0.034..78.901 rows=1234567 loops=1)
                            Index Cond: (order_date >= (CURRENT_DATE - '90 days'::interval))
                            Filter: (status = 'completed')
                      ->  Hash  (cost=78901.23..78901.23 rows=7954877 width=36) (actual time=67.890..67.890 rows=7954877 loops=1)
                            ->  Seq Scan on users u_1  (cost=0.00..78901.23 rows=7954877 width=36) (actual time=0.012..34.567 rows=7954877 loops=1)
                                  Filter: (signup_date < (CURRENT_DATE - '30 days'::interval))
Planning Time: 1.234 ms
Execution Time: 601.456 ms
```

**개선 포인트**:
- UNION의 Sort + Unique 단계가 완전히 제거되어 후처리 비용 0으로 감소
- 디스크 기반 정렬(24MB)이 사라져 I/O 오버헤드 제거
- Append 노드가 단순히 두 결과셋을 연결만 하므로 추가 비용 거의 없음
- CTE로 분리하여 각 그룹의 의도와 상호 배타성이 코드 레벨에서 명확하게 드러남

### 핵심 교훈

- UNION은 항상 내부적으로 Sort + Unique를 수행하므로, 중복이 발생할 수 없는 경우 반드시 UNION ALL을 사용하라
- 두 쿼리의 결과가 상호 배타적인지 판단하는 기준: WHERE 조건이 겹치지 않거나, 결과에 구분 컬럼(segment 등)이 포함된 경우
- UNION ALL은 단순 Append 연산으로, 정렬 없이 결과를 순차적으로 이어 붙이기만 한다
- 데이터 규모가 클수록 불필요한 정렬의 영향이 기하급수적으로 증가한다 (메모리 초과 시 디스크 사용)
- 쿼리 리뷰 시 UNION을 발견하면 "정말 중복 제거가 필요한가?"를 반드시 자문하라

### 면접에서 이렇게 설명하세요

"프로모션 대상자 리스트를 신규 사용자와 재구매 사용자로 나누어 UNION으로 합치고 있었는데,
두 그룹은 가입일 조건이 상호 배타적이라 논리적으로 중복이 발생할 수 없는 상황이었습니다.
UNION을 UNION ALL로 변경하여 불필요한 Sort + Unique 연산을 제거했고,
디스크 기반 정렬이 사라지면서 4.2초에서 0.6초로 86% 개선되었습니다.
핵심은 UNION은 항상 중복 제거를 위한 정렬 비용이 발생하므로, 중복 가능성이 없다면 UNION ALL을 써야 한다는 것입니다."
