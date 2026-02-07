# 변경 이력

## 2026-02-07 (3) — Claude Code 설정 업그레이드 (레벨 3 → 4+)

### 완료된 사항

#### Custom Agents 추가 (.claude/agents/)
- **sql-reviewer.md**: SQL 문제/쿼리/최적화/면접 가이드 품질 검토 전문가 에이전트
  - 6항목 자동 검토 (SQL 컨벤션, SELECT * 검사, 스키마 CHECK 정합성, 필수 섹션, 비즈니스 맥락, CTE 활용)
  - Pass/Fail 테이블 + 수정안 출력
- **optimization-analyst.md**: 쿼리 성능 분석 및 최적화 전략 제안 전문가 에이전트
  - 4단계 분석 (쿼리 구조, 인덱스 활용, 실행 계획, 플랫폼별 최적화)
  - Before/After 비교 + 면접 교훈 출력

#### Skills 폴더 추가 (.claude/skills/)
- **sql-conventions.md**: SQL 작성 컨벤션 상세 가이드 (포맷팅 예시, 안티패턴, Window Function 패턴)
- **schema-reference.md**: E-commerce + Subscription DB 전체 스키마 (CREATE TABLE, CHECK 제약, 관계도, 샘플 규모)
  - CLAUDE.md 토큰 절약을 위한 온디맨드 로딩 방식

#### Hooks 강화 (settings.local.json)
- **PostToolUse 개선**: problems/optimization/interview 디렉토리 파일 수정 시에만 스키마 CHECK 리마인더 (오탐 감소)
- **PreToolUse 신규**: 파괴적 SQL 명령 (DROP TABLE/DATABASE/INDEX, TRUNCATE, 조건 없는 DELETE) 차단 (exit 2 블로킹)
- **Notification 신규**: 작업 완료 시 .claude/activity.log에 타임스탬프 기록

#### Permissions 강화
- `Bash(npm *)` 허용 추가 (웹앱 빌드/테스트용)
- `mcp__github__list_issues`, `mcp__github__search_issues`, `mcp__github__get_file_contents` 허용 추가
- `Bash(DROP *)`, `Bash(TRUNCATE *)` 차단 추가

#### 새 Commands 추가 (.claude/commands/)
- **changelog-update.md**: CHANGELOG.md 자동 업데이트 표준화 (카테고리 분류, 필수 형식)
- **explain-query.md**: SQL 쿼리 실행계획 5단계 분석 (파싱 → 실행계획 추정 → 병목 진단 → 최적화 제안 → 면접 스크립트)

### 2026년 2월 트렌드 반영
- **Skills 온디맨드 로딩**: CLAUDE.md 비대화 방지 (Boris Cherny 권장)
- **Custom Agents**: 작업별 전문 에이전트 분리 (2026 베스트 프랙티스)
- **PreToolUse 블로킹 훅**: 파괴적 명령 사전 차단 (Hooks 진화 트렌드)
- **GitHub MCP 권한 확장**: Issues/Search 도구 활용 (MCP 생태계 성장)

### 생성/수정된 파일

| 파일 | 작업 | 설명 |
|------|------|------|
| `.claude/agents/sql-reviewer.md` | 신규 | SQL 검토 전문가 에이전트 |
| `.claude/agents/optimization-analyst.md` | 신규 | 최적화 분석 전문가 에이전트 |
| `.claude/skills/sql-conventions.md` | 신규 | SQL 컨벤션 온디맨드 가이드 |
| `.claude/skills/schema-reference.md` | 신규 | DB 스키마 레퍼런스 |
| `.claude/settings.local.json` | 수정 | Hooks 3종 + Permissions 강화 |
| `.claude/commands/changelog-update.md` | 신규 | CHANGELOG 업데이트 커맨드 |
| `.claude/commands/explain-query.md` | 신규 | 쿼리 실행계획 분석 커맨드 |

---

## 2026-02-07 (2) — 인터랙티브 웹앱 v1.0

### 완료된 사항 ✅

#### Phase 1: 프로젝트 초기화 + 데이터 변환
- **Vite + React + TypeScript** 프로젝트 생성 (`web/`)
- **의존성**: sql.js (CDN WASM), @monaco-editor/react, tsx (스크립트용)
- **PostgreSQL → SQLite 데이터 변환** (`scripts/generateData.ts`)
  - E-commerce: users 200명, products 50개, orders 1,000건, order_items ~2,500건
  - Subscription: sub_users 200명, subscriptions 200건, events 5,000건
  - `SERIAL` → `INTEGER PRIMARY KEY AUTOINCREMENT`, `VARCHAR` → `TEXT`, `DECIMAL` → `REAL`
- **30개 문제 MD → JSON 자동 변환** (`scripts/convertProblems.ts`)
  - CRLF 정규화, 제목/난이도/맥락/스키마/질문/힌트/정답/해설 파싱
  - PostgreSQL → SQLite 구문 변환: `DATE_TRUNC` → `strftime`, `EXTRACT` → `CAST(strftime())`, `INTERVAL` → `date()`, `AGE` → `julianday`, `TO_CHAR` → `strftime` 등

#### Phase 2: 핵심 UI 컴포넌트
- **Header** (`Header.tsx`): 로고, 레벨 배지 (tier 색상), XP 프로그레스바, 통계 (해결/연속/XP)
- **Sidebar** (`Sidebar.tsx`): 30개 문제 목록, 난이도별 섹션 (기초/중급/고급), 완료 상태 아이콘 (○/✓/★)
- **ProblemView** (`ProblemView.tsx`): Split pane (좌=설명, 우=에디터+결과), 힌트 토글 (XP 페널티 안내), 정답/해설 보기
- **SQLEditor** (`SQLEditor.tsx`): Monaco Editor (VS Code 수준), Ctrl+Enter 실행 단축키
- **ResultsPanel** (`ResultsPanel.tsx`): 결과 테이블, 점수 배지, 채점 상세 내역, XP 획득 표시
- **LevelUpModal** (`LevelUpModal.tsx`): 정답 축하 모달 (🏆), 배지 획득 알림 (슬라이드 애니메이션)
- **global.css**: 다크 테마, CSS 변수, 반응형 (768px), 스크롤바 커스텀

#### Phase 3: SQL 실행 + 채점 엔진
- **sql.js CDN 로딩** (`initDatabase.ts`): `<script>` 동적 삽입, WASM CDN (v1.12.0)
- **자동 채점** (`queryValidator.ts`): 4단계 비교 (컬럼 수 20점 + 행 수 20점 + 컬럼명 20점 + 값 40점)
  - 컬럼 순서 다른 경우 부분 점수 (10점), 정렬 순서 다른 경우 부분 점수 (30점)
  - 숫자값 fuzzy 비교 (오차 0.01 이내 허용)

#### Phase 4: 게임화 시스템
- **레벨 시스템** (`gamification.ts`): Bronze I~III → Silver I~III → Gold I~III → Platinum (10단계)
- **XP 보상**: 기초 100 / 중급 200 / 고급 300, 첫 시도 보너스 +50, 힌트 사용 시 ×0.7
- **배지 8종**: 첫 쿼리, 다섯 고개, 열정의 10일, 숙련자, 완전 정복, 완벽주의자, 독학 천재, 원샷 원킬
- **진행 상태** (`useProgress.ts`): localStorage 저장, 연속 학습 streak 추적, 문제별 최고 점수/시도 횟수/코드 보관

#### Phase 5: 배포 설정
- **GitHub Actions** (`.github/workflows/deploy.yml`): main push 시 자동 빌드 → GitHub Pages 배포
- **README.md**: 웹앱 데모 링크 (`https://taek-d.github.io/sql-mastery-30/`) 및 소개 섹션 추가

#### 브라우저 테스트 결과
- Playwright로 실제 브라우저 검증 완료
- DB 초기화 → 문제 로드 → SQL 실행 → 채점 → XP/레벨/배지 전체 플로우 정상 동작
- Day 1 정답 쿼리 실행: 100점, +150 XP, "첫 쿼리" 배지 획득 확인

### 생성/수정된 파일

| 파일 | 작업 | 설명 |
|------|------|------|
| `web/package.json` | 신규 | React + sql.js + Monaco 의존성 |
| `web/vite.config.ts` | 신규 | base path, Monaco 코드 스플릿 |
| `web/index.html` | 수정 | 한국어, 폰트 (Inter, JetBrains Mono), favicon |
| `web/tsconfig*.json` | 신규 | strict TypeScript 설정 |
| `web/src/App.tsx` | 수정 | 루트 컴포넌트 (DB + Progress + Layout) |
| `web/src/main.tsx` | 수정 | 엔트리포인트 |
| `web/src/vite-env.d.ts` | 신규 | sql.js 타입 선언, .sql?raw 선언 |
| `web/src/styles/global.css` | 신규 | 전체 스타일 (~500줄) |
| `web/src/components/*.tsx` | 신규 | UI 컴포넌트 6개 |
| `web/src/services/*.ts` | 신규 | 채점 + 게임화 로직 |
| `web/src/hooks/*.ts` | 신규 | DB + Progress 커스텀 훅 |
| `web/src/database/*.sql` | 신규 | SQLite 호환 스키마+데이터 |
| `web/src/database/initDatabase.ts` | 신규 | sql.js CDN 초기화 |
| `web/src/data/problems.json` | 신규 | 30개 문제 JSON (자동 생성) |
| `web/src/data/problems.ts` | 신규 | 타입 정의 + 데이터 export |
| `web/scripts/generateData.ts` | 신규 | SQLite INSERT 생성 스크립트 |
| `web/scripts/convertProblems.ts` | 신규 | MD → JSON 변환 스크립트 |
| `.github/workflows/deploy.yml` | 신규 | Pages 자동 배포 |
| `README.md` | 수정 | 웹앱 데모 링크 + 소개 + 디렉토리 구조 |

---

### 다음 단계 (TODO)

#### 즉시 필요: Git 커밋 + GitHub 배포
1. `web/` 전체 및 변경 파일 git add + commit + push
2. GitHub 저장소 Settings → Pages → Source: **GitHub Actions** 선택
3. 배포 완료 후 `https://taek-d.github.io/sql-mastery-30/` 접속 확인

#### 추가 개선 (선택)
- **Subscription DB 문제 호환**: sub_users 테이블명 prefix 때문에 Day 7, 11, 12, 17, 19, 22, 24, 28 쿼리에서 `users` → `sub_users` 매핑 필요
- **PostgreSQL 전용 문제 표시**: `generate_series()`, `FILTER()`, `PERCENTILE_CONT()`, `FULL OUTER JOIN` 등 SQLite 미지원 구문이 포함된 고급 문제에 "PostgreSQL 전용" 라벨 + 외부 SQL playground 링크
- **모바일 반응형 개선**: 사이드바 오버레이, 에디터/결과 탭 전환
- **성능 최적화**: Monaco Editor lazy loading으로 초기 로딩 속도 개선 (현재 ~1.4MB JS)

## 2026-02-07

### BRIDGE Execute (E) 단계 완료 — GitHub 배포
- **GitHub 저장소 생성 및 Push 완료**
  - URL: https://github.com/Taek-D/sql-mastery-30
  - Public 저장소, 7개 커밋 전체 Push
  - BRIDGE Protocol 전 단계 (B-R-I-D-G-E) 완료

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
