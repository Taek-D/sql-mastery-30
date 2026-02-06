새 SQL 문제를 생성합니다.

Day 번호: $ARGUMENTS (예: 31)

## 생성 규칙

1. claude.md의 Document Conventions 준수
2. 필수 섹션: 난이도, 비즈니스 맥락, 테이블 스키마, 질문, 힌트, 정답 쿼리, 해설, 예상 추가 질문 & 답변
3. DB Schemas의 CHECK 제약조건 값 반드시 확인 후 쿼리 작성
4. SELECT * 금지, CTE 선호, 4 spaces 들여쓰기
5. 비즈니스 맥락은 실무 시나리오 (에이블리, 라프텔, 토스 등 실제 서비스 맥락)
6. 생성 후 CHANGELOG.md 업데이트

## 난이도 가이드

- Day 1-10: 기초 (단일 테이블, GROUP BY, JOIN, 집계)
- Day 11-25: 중급 (Window Function, Self JOIN, 코호트)
- Day 26-30+: 고급 (CTE, 복잡한 비즈니스 로직)
