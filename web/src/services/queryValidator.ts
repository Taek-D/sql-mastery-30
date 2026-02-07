import type { QueryExecResult } from 'sql.js';

export interface ValidationResult {
  score: number;
  message: string;
  details: string[];
  userResult: QueryExecResult | null;
  answerResult: QueryExecResult | null;
}

export function validateQuery(
  userResults: QueryExecResult[],
  answerResults: QueryExecResult[],
): ValidationResult {
  const userResult = userResults.length > 0 ? userResults[userResults.length - 1] : null;
  const answerResult = answerResults.length > 0 ? answerResults[answerResults.length - 1] : null;

  if (!userResult || !answerResult) {
    return {
      score: 0,
      message: '결과를 비교할 수 없습니다',
      details: ['쿼리가 결과를 반환하지 않았습니다'],
      userResult,
      answerResult,
    };
  }

  const details: string[] = [];
  let score = 0;

  // 1. Column count match (20 points)
  const userCols = userResult.columns.length;
  const answerCols = answerResult.columns.length;
  if (userCols === answerCols) {
    score += 20;
    details.push(`컬럼 수 일치 (${answerCols}개)`);
  } else {
    details.push(`컬럼 수 불일치: 기대 ${answerCols}개, 실제 ${userCols}개`);
  }

  // 2. Row count match (20 points)
  const userRows = userResult.values.length;
  const answerRows = answerResult.values.length;
  if (userRows === answerRows) {
    score += 20;
    details.push(`행 수 일치 (${answerRows}행)`);
  } else {
    details.push(`행 수 불일치: 기대 ${answerRows}행, 실제 ${userRows}행`);
  }

  // 3. Column names match (20 points)
  const normalizedUserCols = userResult.columns.map((c: string) => c.toLowerCase().trim());
  const normalizedAnswerCols = answerResult.columns.map((c: string) => c.toLowerCase().trim());
  const colNameMatch = normalizedAnswerCols.every((c: string, i: number) => normalizedUserCols[i] === c);
  if (colNameMatch && userCols === answerCols) {
    score += 20;
    details.push('컬럼 이름 일치');
  } else if (userCols === answerCols) {
    // Check if same set of columns regardless of order
    const userSet = new Set(normalizedUserCols);
    const answerSet = new Set(normalizedAnswerCols);
    const sameSet = normalizedAnswerCols.every((c: string) => userSet.has(c)) &&
                    normalizedUserCols.every((c: string) => answerSet.has(c));
    if (sameSet) {
      score += 10;
      details.push('컬럼 이름 일치 (순서 다름)');
    } else {
      details.push(`컬럼 이름 불일치`);
    }
  }

  // 4. Values match (40 points)
  if (userRows === answerRows && userCols === answerCols) {
    const userValues = normalizeValues(userResult.values);
    const answerValues = normalizeValues(answerResult.values);

    let matchingRows = 0;
    const totalRows = answerValues.length;

    for (let i = 0; i < totalRows; i++) {
      if (rowsEqual(userValues[i], answerValues[i])) {
        matchingRows++;
      }
    }

    if (matchingRows === totalRows) {
      score += 40;
      details.push('모든 값 일치');
    } else if (matchingRows > 0) {
      // Check unordered match
      const unmatchedAnswer = [...answerValues];
      let unorderedMatches = 0;
      for (const userRow of userValues) {
        const idx = unmatchedAnswer.findIndex((ar) => rowsEqual(userRow, ar));
        if (idx !== -1) {
          unorderedMatches++;
          unmatchedAnswer.splice(idx, 1);
        }
      }

      if (unorderedMatches === totalRows) {
        score += 30; // Order doesn't match but values do
        details.push('값 일치 (정렬 순서 다름)');
      } else {
        const valueScore = Math.round(40 * (matchingRows / totalRows));
        score += valueScore;
        details.push(`값 부분 일치 (${matchingRows}/${totalRows}행)`);
      }
    } else {
      details.push('값 불일치');
    }
  }

  score = Math.min(100, score);

  let message: string;
  if (score === 100) {
    message = '정답입니다!';
  } else if (score >= 80) {
    message = '거의 정답입니다!';
  } else if (score >= 50) {
    message = '부분 정답입니다';
  } else {
    message = '다시 시도해보세요';
  }

  return { score, message, details, userResult, answerResult };
}

function normalizeValues(values: unknown[][]): string[][] {
  return values.map((row) =>
    row.map((val) => {
      if (val === null || val === undefined) return 'NULL';
      const str = String(val).trim();
      // Normalize numeric values
      const num = Number(str);
      if (!isNaN(num) && str !== '') {
        return String(Math.round(num * 100) / 100);
      }
      return str.toLowerCase();
    }),
  );
}

function rowsEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) {
      // Fuzzy numeric compare
      const numA = Number(a[i]);
      const numB = Number(b[i]);
      if (!isNaN(numA) && !isNaN(numB)) {
        if (Math.abs(numA - numB) < 0.01) continue;
      }
      return false;
    }
  }
  return true;
}
