# SQL Mastery 30

**데이터 분석가 면접을 위한 30일 SQL 챌린지 + 최적화 Before/After + 면접 설명 스크립트**

---

## 🎯 프로젝트 소개

SQL Mastery 30은 데이터 분석가 취업 준비생을 위한 **실무 중심 SQL 학습 프로젝트**입니다.

### 왜 이 프로젝트인가?

기존 SQL 학습 플랫폼의 문제점:
- ❌ "employees 테이블에서 평균 급여" 같은 추상적 문제
- ❌ 정답만 맞으면 끝, 성능 개선 경험 없음
- ❌ 면접에서 "왜 이렇게 짰는가" 설명 못함

### 이 프로젝트의 차별점

✅ **실무 맥락**: "라프텔의 7일 리텐션 계산", "에이블리의 재구매율 분석"  
✅ **최적화 경험**: Before/After 성능 비교 (12초 → 0.8초)  
✅ **면접 대비**: 각 문제마다 5분 설명 스크립트 제공

---

## 📚 콘텐츠 구성

### 1. 30개 실무 SQL 문제

**기초 (Day 1-10)**: 단일 테이블, 기본 집계  
**중급 (Day 11-25)**: 복잡한 JOIN, Window Function  
**고급 (Day 26-30)**: CTE, 복잡한 비즈니스 로직

### 2. 10개 최적화 Before/After 사례

실행 시간 10초 이상 → 1초 이하로 개선한 실제 사례:
- SELECT * 제거
- Subquery → CTE 변환
- 불필요한 JOIN 제거
- Window Function vs Self JOIN
- (총 10개)

### 3. 5개 핵심 문제 면접 가이드

면접관 앞에서 5분 내 설명하는## 🚀 시작하기

### 1. PostgreSQL 설치 (권장)
```bash
# macOS
brew install postgresql@14

# Ubuntu/Debian
sudo apt-get install postgresql-14

# Windows
# https://www.postgresql.org/download/windows/
```

### 2. 데이터베이스 생성 및 스키마 적용
```bash
# PostgreSQL 접속
psql -U postgres

# 데이터베이스 생성
CREATE DATABASE sql_mastery;
\c sql_mastery

# 스키마 + 샘플 데이터 한 번에 설정
\i setup.sql
```

**또는 개별 실행:**
```sql
-- 1. E-commerce 스키마
\i data/ecommerce/schema.sql
\i data/ecommerce/sample_data.sql

-- 2. Subscription 스키마
\i data/subscription/schema.sql
\i data/subscription/sample_data.sql
```

### 3. 샘플 데이터 확인
```sql
-- 테이블별 레코드 수 확인
SELECT 'users' AS table_name, COUNT(*) FROM users
UNION ALL SELECT 'products', COUNT(*) FROM products
UNION ALL SELECT 'orders', COUNT(*) FROM orders
UNION ALL SELECT 'order_items', COUNT(*) FROM order_items
UNION ALL SELECT 'subscriptions', COUNT(*) FROM subscriptions
UNION ALL SELECT 'events', COUNT(*) FROM events;
```

### 4. 문제 풀기
`problems/` 폴더의 Day 1부터 순서대로 학습하세요!

**학습 순서:**
- **Day 1-10** (기초): GROUP BY, JOIN, 집계 함수
- **Day 11-25** (중급): Window Function, Self JOIN, 퍼널 분석
- **Day 26-30** (고급): Recursive CTE, Cohort 분석, 대시보드시작
2. 비즈니스 맥락 읽기 → 쿼리 작성 → 정답 확인
3. 최적화 사례도 함께 학습

---

## 📂 디렉토리 구조

```
sql-mastery-30/
├── README.md                 # 프로젝트 소개
├── setup.sql                 # 전체 환경 설정 스크립트
├── data/                     # 데이터베이스 스키마 및 샘플 데이터
│   ├── ecommerce/
│   │   ├── schema.sql       # E-commerce DB 스키마
│   │   └── sample_data.sql  # 샘플 데이터 (1000 users, 5000 orders)
│   └── subscription/
│       ├── schema.sql       # Subscription App 스키마
│       └── sample_data.sql  # 샘플 데이터 (500 users, 25000 events)
├── problems/                 # 30개 SQL 문제
│   ├── day01.md             # Day 1: 월별 신규 가입자 수
│   ├── day02.md             # Day 2: 카테고리별 매출 Top 5
│   ├── ...
│   ├── day25.md             # Day 25: Self JOIN 상품 추천
│   ├── day26.md             # Day 26: Recursive CTE 조직도
│   └── day30.md             # Day 30: 종합 대시보드 KPI
└── solutions/ (Optional)     # 개인 정답 보관용 폴더
```       # ERD, Query Plan

---

## 🎯 타겟 사용자

### Primary: 데이터 분석가 취업 준비생
- SQL 기초는 알지만 "실전" 감각 필요
- 면접에서 "SQL 잘 하시네요" 평가 받고 싶음

### Secondary: SQL은 아는데 최적화 모르는 주니어
- 쿼리는 짜지만 "왜 느린가" 모름
- Window Function, CTE 실전 경험 필요

---

## 📊 학습 효과

- ✅ Window Function, CTE 실전 활용 가능
- ✅ Query Plan 읽고 병목 구간 파악 가능
- ✅ 비즈니스 질문 → SQL 쿼리 변환 10분 이내
- ✅ 면접에서 자신감 있게 쿼리 설명 가능

---

## 📝 라이선스

MIT License - 자유롭게 Fork하고 포트폴리오로 활용하세요!

---

## 🤝 기여하기

이슈, PR 환영합니다!

---

**작성자**: SQL Mastery 30 Team  
**버전**: v1.0 (2026-02-06)
