SQL 문제/최적화/면접 가이드 파일을 검토합니다.

대상: $ARGUMENTS (예: problems/day15.md, optimization/case03.md, interview/guide02.md)

## 검토 항목

### 공통
1. SQL 키워드 대문자 여부 (SELECT, FROM, WHERE, JOIN 등)
2. SELECT * 사용 여부 (금지)
3. 비즈니스 맥락이 실무적인지 ("employees 테이블" 같은 추상적 맥락 금지)
4. DB 스키마 CHECK 제약조건 값 정합성:
   - E-commerce users.user_segment: `premium`, `regular`, `inactive`
   - E-commerce orders.status: `completed`, `cancelled`, `pending`
   - Subscription subscriptions.status: `active`, `cancelled`, `expired`
   - Subscription users.plan_type: `free`, `basic`, `premium`

### 문제 파일 (problems/)
5. 필수 섹션 포함: 난이도, 비즈니스 맥락, 테이블 스키마, 질문, 힌트, 정답 쿼리, 해설, 예상 추가 질문

### 최적화 사례 (optimization/)
6. Before/After 쿼리 + 실행 시간 + Scanned Data 포함
7. EXPLAIN ANALYZE 결과 비교 포함
8. 병목 원인 & 개선 포인트 명시

### 면접 가이드 (interview/)
9. 5단계 구조 (문제 이해 → 접근 방법 → 쿼리 작성 → 결과 검증 → 예상 추가 질문)

## 출력 형식

| # | 검토 항목 | 결과 | 비고 |
|---|----------|------|------|
| 1 | ... | Pass/Fail | ... |

문제 발견 시 수정안을 구체적으로 제시합니다.
