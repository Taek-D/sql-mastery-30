# 변경 이력

## 2026-02-07

### Claude Code Level 2 설정 적용
- **커스텀 커맨드 추가** (.claude/commands/)
  - `review-sql.md`: SQL 파일 검토 자동화 (스키마 정합성, 컨벤션, 필수 섹션 체크)
  - `new-problem.md`: 새 SQL 문제 생성 템플릿 (규칙 자동 적용)
- **Hooks 실질화** (settings.local.json)
  - `PostToolUse`: .sql/.md 파일 수정 시 스키마 제약조건 확인 리마인드
- **Permissions 강화**
  - deny 추가: `.env*` 읽기 차단, `rm -rf` 실행 차단

### Grow 단계 진행 ✅

- **최적화 사례 10개 생성** (optimization/case01~10.md)
  - SELECT * 제거, Subquery→CTE, 불필요 JOIN 제거, SARGable WHERE, WHERE vs HAVING
  - Window Function vs Self JOIN, UNION vs UNION ALL, EXISTS vs IN
  - BigQuery Partitioning/Clustering, Materialized View
  - 모든 사례에 Before/After 쿼리, EXPLAIN ANALYZE, 실행 시간, 면접 스크립트 포함

- **면접 가이드 5개 생성** (interview/guide01~05.md)
  - 7일 Rolling MAU, 코호트 리텐션율, RFM 세그먼테이션
  - Funnel Conversion Rate, A/B 테스트 통계적 유의성
  - 5단계 구조 (문제 이해 → 접근 방법 → 쿼리 작성 → 결과 검증 → 추가 질문)

- **콘텐츠 품질 검증 및 Critical 이슈 수정**
  - guide03.md: NTILE 정렬 방향 수정 (R:DESC, F:ASC, M:ASC)
  - case07.md: `user_segment = 'active'` → `'regular'` (스키마 정합성)
  - guide04.md: `subscription status = 'completed'` → `'expired'` (스키마 정합성)

- **ERD 다이어그램 생성** (diagrams/)
  - `erd_ecommerce.md`: E-commerce 스키마 ERD (Mermaid)
  - `erd_subscription.md`: Subscription 스키마 ERD (Mermaid)

- **claude.md 최적화**
  - 857줄 → 73줄 (91% 감소)
  - BRIDGE 진행 로그 분리, 3중 중복 제거, 불필요 가이드 제거
  - CHECK 제약조건 값 인라인 명시, Prohibited 규칙 추가

- **README.md 업데이트**
  - 최적화 사례 10개 링크 테이블 추가 (주제, 개선율)
  - 면접 가이드 5개 링크 테이블 추가 (주제, 핵심 SQL 개념)
  - 디렉토리 구조 업데이트

- **Git 커밋**: `a9eefd2` feat: Add optimization cases, interview guides, and ERD diagrams

---

## 2026-02-06

### Blueprint (B) 단계 완료 ✅
- 프로젝트 초기 설정 (research.md, idea-definition.md, PRD.md 분석)
- claude.md 생성 (BRIDGE Protocol 진행 상황 추적)
- 타겟 사용자, 차별화 포인트, 결과물 형태 확정

### Research (R) 단계 완료 ✅
- 30개 SQL 문제 목록 확정 (기초 10, 중급 15, 고급 5)
- 기술 스택 조사 (PostgreSQL 14+, BigQuery Sandbox, SQLite, Mermaid)
- 샘플 데이터 스키마 설계 (E-commerce, Subscription)
- 문서 템플릿 작성 (문제, 최적화 사례)

### Integrate (I) 단계 완료 ✅
- DB 스키마 생성 (`data/ecommerce/schema.sql`, `data/subscription/schema.sql`)
- Git 초기화 및 초기 커밋 (`d730754`)
- README.md, .gitignore 작성

### Deploy (D) 단계 완료 ✅
- 30개 SQL 문제 작성 (problems/day01~30.md)
  - `410f9a2` feat: Add Day 1-3 SQL problems
  - `f72d3d0` feat: Add Day 4-15 SQL problems
  - `b884ce8` feat: Complete all 30 SQL problems (Day 16-30)
- 샘플 데이터 생성 스크립트 (`sample_data.sql`, `setup.sql`)
  - `f71a8e9` feat: Add sample data scripts and update README
