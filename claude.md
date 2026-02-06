# SQL Mastery 30

데이터 분석가 면접 대비 30개 실무 SQL 챌린지 + 최적화 Before/After + 면접 설명 스크립트 (GitHub 포트폴리오용)

## Tech Stack

- **DB**: PostgreSQL 14+ (기본), BigQuery (클라우드 최적화), SQLite (경량 테스트)
- **문서**: Markdown, Mermaid (ERD)
- **버전관리**: Git, GitHub

## Project Structure

```
sql-mastery-30/
├── claude.md              # Claude Code 설정
├── README.md              # 프로젝트 소개
├── setup.sql              # 전체 환경 설정 스크립트
├── data/
│   ├── ecommerce/         # E-commerce DB (schema.sql, sample_data.sql)
│   └── subscription/      # Subscription App DB (schema.sql, sample_data.sql)
├── problems/              # 30개 SQL 문제 (day01~30.md)
├── optimization/          # 10개 최적화 Before/After (case01~10.md)
├── interview/             # 5개 면접 설명 가이드 (guide01~05.md)
└── diagrams/              # ERD 다이어그램 (Mermaid)
```

## DB Schemas

**E-commerce** (`data/ecommerce/schema.sql`):
- users(user_id, signup_date, region, user_segment) — segment: `premium`, `regular`, `inactive`
- products(product_id, product_name, category, price)
- orders(order_id, user_id, order_date, total_amount, status) — status: `completed`, `cancelled`, `pending`
- order_items(order_item_id, order_id, product_id, quantity, item_price)

**Subscription** (`data/subscription/schema.sql`):
- users(user_id, signup_date, plan_type) — plan: `free`, `basic`, `premium`
- subscriptions(subscription_id, user_id, start_date, end_date, plan_type, status) — status: `active`, `cancelled`, `expired`
- events(event_id, user_id, event_date, event_type) — CHECK 없음, 자유 입력

## SQL Conventions

- SQL 키워드 **대문자**: `SELECT`, `FROM`, `WHERE`, `JOIN`
- 테이블/컬럼명 **소문자 + snake_case**: `user_id`, `order_date`
- 들여쓰기: 4 spaces, 각 주요 절은 새 줄
- `SELECT *` 금지 — 필요한 컬럼만 명시
- CTE (`WITH`) 선호, 중첩 Subquery 자제
- 비즈니스 맥락 주석 필수

## Document Conventions

**문제 파일** (`problems/dayXX.md`): 난이도, 비즈니스 맥락, 스키마, 질문, 힌트, 정답, 해설, 예상 추가 질문

**최적화 사례** (`optimization/caseXX.md`): Before/After 쿼리, 실행 시간, Scanned Data, EXPLAIN ANALYZE, 병목 원인, 개선 포인트, 핵심 교훈

**면접 가이드** (`interview/guideXX.md`): 5단계 구조 (문제 이해 → 접근 방법 → 쿼리 작성 → 결과 검증 → 예상 추가 질문)

## Prohibited

- `SELECT *` 사용
- EXPLAIN ANALYZE 없는 최적화 사례
- "employees 테이블" 같은 추상적 비즈니스 맥락
- 스키마 CHECK 제약조건에 없는 값 사용 (반드시 위 DB Schemas 참조)

## Current Status

- **BRIDGE Protocol**: Grow (G) 완료 — 상세 진행 로그는 `Bridge.md` 참조
- 30개 문제: 완료 (day01~day30)
- 10개 최적화 사례: 완료 (case01~case10, 검토/수정 완료)
- 5개 면접 가이드: 완료 (guide01~guide05, 검토/수정 완료)
- 샘플 데이터: 완료
- ERD 다이어그램: 완료
- GitHub Push: 미완료
