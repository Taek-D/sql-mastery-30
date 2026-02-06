# SQL Mastery 30 - PRD (Product Requirements Document)

## 📌 프로젝트 한 줄 정의
**"데이터 분석가 면접을 위한 30개 실무 SQL 챌린지 + 최적화 Before/After + 면접 설명 스크립트 (GitHub 포트폴리오용)"**

---

## 👥 타겟 사용자 페르소나

### Persona: 데이터 분석가 취업 준비생 "재영" (26세)
- **배경**: 경영학과 졸업, SQL 기초 3개월 학습 완료
- **목표**: 라프텔, 에이블리, 토스 데이터 분석가 합격
- **Pain Point**:
  - LeetCode SQL 문제는 풀지만 "실무"와 연결 안 됨
  - 면접에서 "이 쿼리 설명해보세요" 질문에 버벅임
  - Window Function, CTE는 이론만 알고 언제 쓰는지 모름
- **Success Metric**:
  - 면접 SQL 라이브 코딩에서 10분 내 완벽한 답 + 설명
  - GitHub 포트폴리오에 "SQL 챌린지 30개 완료" 증명

---

## 🎯 핵심 기능 (우선순위 순)

### Priority 1: 30개 실무 시나리오 SQL 문제 ⭐⭐⭐

**문제 구성 (난이도별)**:

#### 기초 (Day 1-10) - 단일 테이블, 기본 집계
1. 월별 신규 가입자 수 (GROUP BY + DATE_TRUNC)
2. 상품 카테고리별 매출 Top 5 (ORDER BY + LIMIT)
3. 재구매 고객 수 (HAVING COUNT(*) > 1)
4. 평균 주문 금액이 10만원 이상인 사용자 (Subquery)
5. 이번 달 가입자 중 구매 완료한 사용자 비율 (JOIN)
...

#### 중급 (Day 11-25) - 복잡한 JOIN, Window Function
11. 7일 Rolling MAU 계산 (Window Function)
12. 코호트별 D30 리텐션율 (Self JOIN + DATEDIFF)
13. 상품별 누적 매출 (CUMSUM)
14. 사용자별 첫 구매 후 재구매까지 기간 (LAG, LEAD)
15. 카테고리별 매출 Top 3 상품 (ROW_NUMBER)
...

#### 고급 (Day 26-30) - CTE, 복잡한 비즈니스 로직
26. Churn Rate 계산 (CTE + 코호트 분석)
27. Customer Lifetime Value 예측 (재귀 CTE)
28. RFM 세그먼테이션 (CASE + NTILE)
29. Funnel Conversion Rate (다중 CTE)
30. A/B 테스트 통계적 유의성 검증 (Two-Proportion Z-Test SQL)

**각 문제 포함 내용**:
```markdown
## Day 15: 상품별 누적 매출

### 비즈니스 맥락
에이블리의 PM이 "이번 달 상품별 누적 매출 그래프"를 요청했습니다.
일자별 매출을 누적해서 "언제 목표 금액에 도달하는가" 예측하려 합니다.

### 테이블 스키마
- orders: order_id, product_id, order_date, amount

### 질문
2025년 1월 각 상품의 일자별 누적 매출을 계산하세요.

### 정답 쿼리
[SQL 코드]

### 해설
- SUM() OVER (PARTITION BY ... ORDER BY ...) 사용 이유
- ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW 설명

### 예상 추가 질문
Q: "Window Function 없이 Self JOIN으로도 가능한가요?"
A: [답변]
```

---

### Priority 2: 10개 최적화 Before/After 사례 ⭐⭐⭐

**선정 기준**:
- 실행 시간이 10초 이상 → 1초 이하로 개선된 사례
- 실무에서 자주 하는 실수 (SELECT *, 불필요한 JOIN 등)

**사례 구성**:

#### Case 1: SELECT * 남용
**Before** (12.3초):
```sql
SELECT * FROM orders 
WHERE order_date >= '2025-01-01';
```

**After** (0.8초):
```sql
SELECT order_id, user_id, amount, order_date 
FROM orders 
WHERE order_date >= '2025-01-01';
```

**왜 빨라졌나**:
- Scanned Data: 50 columns → 4 columns (92% 감소)
- BigQuery 비용: $5.12 → $0.41

---

#### Case 2: Subquery → CTE 변환
**Before** (8.7초):
```sql
SELECT u.user_id, 
       (SELECT COUNT(*) FROM orders WHERE user_id = u.user_id) as order_count
FROM users u;
```

**After** (1.2초):
```sql
WITH order_counts AS (
  SELECT user_id, COUNT(*) as order_count
  FROM orders
  GROUP BY user_id
)
SELECT u.user_id, COALESCE(oc.order_count, 0)
FROM users u
LEFT JOIN order_counts oc ON u.user_id = oc.user_id;
```

**왜 빨라졌나**:
- Correlated Subquery(N번 실행) → JOIN(1번 실행)
- Execution Plan: Nested Loop → Hash Join

---

**10개 사례 목록**:
1. SELECT * 제거
2. Subquery → CTE
3. 불필요한 JOIN 제거
4. WHERE 절 인덱스 활용
5. GROUP BY 전 필터링 (WHERE vs HAVING)
6. Window Function vs Self JOIN
7. UNION vs UNION ALL
8. EXISTS vs IN
9. Partitioning/Clustering 활용 (BigQuery)
10. Materialized View 활용

---

### Priority 3: 면접 설명 스크립트 (5개 핵심 문제) ⭐⭐

**형식**:
```markdown
## 면접 설명 가이드: 7일 Rolling MAU

### 1. 문제 이해 확인 (30초)
"7일 Rolling MAU는 특정 날짜 기준 최근 7일간 활동한 순 사용자 수를 의미합니다.
예를 들어 1월 8일 기준으로는 1월 2일~8일 사이 로그인한 사용자를 집계합니다."

### 2. 접근 방법 설명 (1분)
"먼저 user_id와 activity_date를 기준으로 중복을 제거하고,
각 날짜별로 WINDOW 함수를 사용해 최근 7일 범위의 사용자를 COUNT하겠습니다."

### 3. 쿼리 작성 (2분)
[화면에 쿼리 작성하며 설명]

### 4. 검증 (1분)
"결과를 확인해보니 1월 8일 MAU가 12,345명인데,
수동으로 1월 2~8일 사용자를 세어보면 동일합니다."

### 5. 예상 추가 질문 대응
Q: "DAU와 MAU의 차이는?"
A: "DAU는 당일 활성 사용자, MAU는 월간 활성 사용자입니다..."

Q: "이 쿼리의 성능 이슈는?"
A: "데이터가 많으면 Window Function이 느릴 수 있어, 
날짜별 DAU를 먼저 구한 후 7일 합산하는 방식이 더 효율적입니다."
```

**5개 핵심 문제**:
1. 7일 Rolling MAU
2. 코호트 리텐션율
3. RFM 세그먼테이션
4. Funnel Conversion Rate
5. A/B 테스트 유의성 검증

---

### Priority 4: 샘플 데이터셋 제공 ⭐

**제공 항목**:
- E-commerce 데이터 (users, orders, products) - 10만 행
- Subscription App 데이터 (users, events, subscriptions) - 5만 행
- SQL 스크립트 (테이블 생성 + 샘플 데이터 INSERT)

**활용 방법**:
1. SQLite/PostgreSQL 로컬 DB에 Import
2. BigQuery Sandbox 무료 Slot 활용
3. db-fiddle.com 같은 온라인 SQL 에디터

---

## 🖼️ 화면 구성 (GitHub README 구조)

```
# SQL Mastery 30 🚀

## 📚 목차
- [소개](#소개)
- [문제 목록](#문제-목록)
- [최적화 사례](#최적화-사례)
- [면접 가이드](#면접-가이드)
- [샘플 데이터](#샘플-데이터)

## 🎯 소개
30일간 하루 1문제씩 풀면 데이터 분석가 면접 SQL 준비 완료!

## 📋 문제 목록

### 기초 (Day 1-10)
- [Day 1: 월별 신규 가입자 수](./problems/day01.md) ✅ 완료
- [Day 2: 카테고리별 매출 Top 5](./problems/day02.md) ⬜ 진행 중
...

### 중급 (Day 11-25)
...

### 고급 (Day 26-30)
...

## ⚡ 최적화 사례

### Case 1: SELECT * 남용 (12.3초 → 0.8초)
[Before/After 코드 + 설명]

...

## 🎤 면접 설명 가이드

### 문제 1: 7일 Rolling MAU
[5분 발표 스크립트]

...

## 📊 샘플 데이터

### 다운로드
- [E-commerce 데이터셋](./data/ecommerce.sql)
- [Subscription App 데이터셋](./data/subscription.sql)

### 사용 방법
```bash
psql -U postgres -d mydb -f ecommerce.sql
```
```

---

## 🛠️ 기술 스택

### 문서 작성
- **Markdown** (GitHub README 최적화)
- **Mermaid** (ERD, Query Plan 다이어그램)

### SQL 실행 환경
- **PostgreSQL 14+** (로컬 개발)
- **BigQuery** (클라우드 최적화 사례)
- **SQLite** (초경량, 샘플 데이터 테스트)

### 성능 측정
- **EXPLAIN ANALYZE** (PostgreSQL)
- **Query Plan Viewer** (BigQuery)
- **Benchmark 스크립트** (Python + psycopg2)

### 버전 관리
- **GitHub** (Public Repository)
- **GitHub Actions** (SQL Lint 자동 실행)

---

## 📚 참고 레퍼런스

### SQL 학습 자료
1. **LeetCode SQL Problems** - 문제 난이도 벤치마크
2. **StrataScratch** - 실제 기업 문제 참고
3. **Mode Analytics SQL Tutorial** - 비즈니스 맥락 학습

### 최적화 자료
4. **Use The Index, Luke** (https://use-the-index-luke.com) - 인덱스 최적화 바이블
5. **BigQuery Best Practices** - 클라우드 DW 최적화
6. **PostgreSQL Performance Guide** - 오픈소스 DB 최적화

### 포트폴리오 참고
7. **Alex The Analyst GitHub** - SQL 포트폴리오 포맷
8. **DataLemur Blog** - 문제 설명 스타일

---

## 📊 Success Metrics

### 콘텐츠 품질
- [ ] 30개 문제 모두 실무 시나리오 기반
- [ ] 10개 최적화 사례 모두 10초 → 1초 이하 개선
- [ ] 면접 스크립트 5분 이내 발표 가능

### 포트폴리오 임팩트
- [ ] GitHub Star 100개 (3개월 내)
- [ ] 면접에서 "이 프로젝트 설명해보세요" 질문 시 자신감 있게 답변
- [ ] "SQL 잘 하시네요" 피드백 획득

### 학습 효과
- [ ] Window Function, CTE 실전 활용 가능
- [ ] Query Plan 읽고 병목 구간 파악 가능
- [ ] 비즈니스 질문 → SQL 쿼리 변환 10분 이내

---

## 🚀 Development Roadmap

### Week 1: 기초 문제 10개 + 샘플 데이터
- [ ] Day 1~10 문제 작성
- [ ] E-commerce 샘플 데이터 생성
- [ ] GitHub Repository 구조 셋업

### Week 2: 중급 문제 15개 + 최적화 5개
- [ ] Day 11~25 문제 작성
- [ ] 최적화 Case 1~5 Before/After 작성
- [ ] README 초안 완성

### Week 3: 고급 문제 5개 + 최적화 5개
- [ ] Day 26~30 문제 작성
- [ ] 최적화 Case 6~10 Before/After 작성
- [ ] 면접 가이드 3개 작성

### Week 4: 면접 가이드 완성 + 배포
- [ ] 면접 가이드 5개 완성
- [ ] Mermaid 다이어그램 추가
- [ ] LinkedIn/Velog에 프로젝트 소개 글 작성

---

## 💡 Phase 2 Features (MVP 이후)

1. **인터랙티브 SQL 에디터**
   - 웹에서 바로 쿼리 실행 가능 (SQLite WASM)

2. **자동 채점 시스템**
   - 사용자 쿼리 vs 정답 결과 비교

3. **AI 면접관 챗봇**
   - "이 쿼리 설명해보세요" 질문 → 답변 평가

4. **기업별 맞춤 문제**
   - 라프텔 특화, 토스 특화 문제 세트

---

## ✅ Definition of Done

1. [ ] 라프텔/에이블리 JD의 "SQL 능숙" 역량 증명
2. [ ] GitHub README가 5,000자 이상 체계적 문서
3. [ ] 최적화 사례 10개 모두 Before/After 성능 수치 포함
4. [ ] Velog/Medium에 "SQL 챌린지 회고" 작성
5. [ ] 모의 면접에서 SQL 문제 10분 내 완벽 답변

---

**작성일**: 2026-02-06  
**버전**: v1.0
