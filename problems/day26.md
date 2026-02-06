## Day 26: Recursive CTE로 조직도 계층 구조 조회

### 난이도
⭐⭐⭐ 고급

### 비즈니스 맥락
카카오의 HR팀에서 "조직도 계층 구조"를 조회합니다.
특정 임원 아래의 모든 직원을 계층별로 조회하여 보고 체계를 파악합니다.

### 테이블 스키마
- **employees**: employee_id, employee_name, manager_id, position

### 질문
CEO (manager_id = NULL)부터 시작하여 전체 조직의 계층 구조를 조회하세요.
각 직원의 레벨과 경로를 표시하세요.

### 정답 쿼리
```sql
WITH RECURSIVE org_chart AS (
    -- 앵커: CEO (최상위)
    SELECT 
        employee_id,
        employee_name,
        manager_id,
        position,
        1 AS level,
        ARRAY[employee_id] AS path,
        employee_name AS full_path
    FROM employees
    WHERE manager_id IS NULL
    
    UNION ALL
    
    -- 재귀: 하위 직원
    SELECT 
        e.employee_id,
        e.employee_name,
        e.manager_id,
        e.position,
        oc.level + 1,
        oc.path || e.employee_id,
        oc.full_path || ' > ' || e.employee_name
    FROM employees e
    JOIN org_chart oc ON e.manager_id = oc.employee_id
)
SELECT 
    employee_id,
    REPEAT('  ', level - 1) || employee_name AS hierarchy_display,
    position,
    level,
    full_path
FROM org_chart
ORDER BY path;
```

### 해설

**핵심 개념**
- `RECURSIVE CTE`: 재귀 쿼리
- 앵커(Anchor): 시작점 (CEO)
- 재귀(Recursive): 반복 로직
- `ARRAY[]`: 경로 추적

**Q1**: 특정 직원의 상위 관리자 조회?
```sql
WITH RECURSIVE manager_chain AS (
    -- 앵커: 특정 직원
    SELECT 
        employee_id,
        employee_name,
        manager_id,
        1 AS level
    FROM employees
    WHERE employee_id = 42  -- 특정 직원
    
    UNION ALL
    
    -- 재귀: 상위 관리자
    SELECT 
        e.employee_id,
        e.employee_name,
        e.manager_id,
        mc.level + 1
    FROM employees e
    JOIN manager_chain mc ON e.employee_id = mc.manager_id
)
SELECT * FROM manager_chain
ORDER BY level DESC;  -- CEO부터 표시
```

**Q2**: 특정 레벨의 직원만 조회?
```sql
SELECT * FROM org_chart WHERE level = 3;  -- 3단계 직원만
```
