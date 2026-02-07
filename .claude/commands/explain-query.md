SQL 쿼리의 실행계획을 분석하고 최적화 방안을 제안합니다.

대상 쿼리 또는 파일: $ARGUMENTS (예: "SELECT ... FROM orders ...", "problems/day15.md의 정답 쿼리")

## 분석 절차

### 1단계: 쿼리 파싱
- 사용된 테이블과 컬럼 식별
- JOIN 타입 및 순서 분석
- WHERE 절 조건 분류 (SARGable / Non-SARGable)
- 집계 함수 및 Window Function 식별

### 2단계: 실행 계획 추정
PostgreSQL EXPLAIN ANALYZE 기반으로 추정합니다:

```
Scan Type: Seq Scan / Index Scan / Bitmap Scan
Join Method: Nested Loop / Hash Join / Merge Join
Sort Method: quicksort / external merge
Estimated Rows: {예상 행 수}
```

### 3단계: 병목 진단

| 패턴 | 문제 | 개선 방법 |
|------|------|----------|
| Seq Scan on large table | Full Table Scan | 적절한 인덱스 추가 |
| Nested Loop with Seq Scan | O(N*M) 복잡도 | Hash Join 유도 또는 인덱스 |
| Sort + Limit | 전체 정렬 후 일부 반환 | Top-N Heapsort (인덱스) |
| WHERE 함수(컬럼) | Non-SARGable | 함수 제거, 범위 조건 변환 |
| SELECT * | 불필요 I/O | 필요 컬럼만 명시 |
| Subquery in SELECT | 행마다 서브쿼리 실행 | JOIN 또는 CTE로 변환 |

### 4단계: 최적화 제안

각 제안은 아래 형식으로 출력합니다:

```markdown
#### 개선 #{N}: {제목}

**문제**: {현재 문제 설명}
**해결**: {구체적 변경 내용}

Before:
​```sql
{원본 쿼리 해당 부분}
​```

After:
​```sql
{최적화된 쿼리}
​```

**예상 효과**: {개선율 또는 설명}
```

### 5단계: 면접 설명 스크립트

최적화 내용을 면접에서 설명할 수 있는 1-2문장으로 요약합니다:

> "이 쿼리의 병목은 {원인}에 있었습니다. {해결 방법}을 적용하여 {효과}를 달성했습니다."
