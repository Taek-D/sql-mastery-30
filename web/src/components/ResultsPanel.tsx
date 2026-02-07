import type { ValidationResult } from '../services/queryValidator';

interface ResultsPanelProps {
  result: ValidationResult | null;
  error: string | null;
  isRunning: boolean;
  xpGained: number | null;
}

export function ResultsPanel({ result, error, isRunning, xpGained }: ResultsPanelProps) {
  if (isRunning) {
    return (
      <div className="results-area">
        <div className="results-panel">
          <div className="results-empty">
            <div className="spinner" style={{ width: 24, height: 24, margin: '0 auto 8px' }} />
            쿼리 실행 중...
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="results-area">
        <div className="results-panel">
          <div className="results-header">
            <h4>❌ 오류</h4>
          </div>
          <div className="results-error">{error}</div>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="results-area">
        <div className="results-panel">
          <div className="results-empty">
            SQL 쿼리를 작성하고 실행(Ctrl+Enter)하세요
          </div>
        </div>
      </div>
    );
  }

  const scoreClass = result.score === 100 ? 'perfect' : result.score >= 50 ? 'partial' : 'wrong';

  return (
    <div className="results-area">
      <div className="results-panel">
        <div className="results-header">
          <h4>
            {result.score >= 80 ? '✅' : result.score >= 50 ? '⚠️' : '❌'} {result.message}
          </h4>
          <div className="results-score">
            {xpGained !== null && xpGained > 0 && (
              <span style={{ color: 'var(--accent)', fontSize: 13, fontWeight: 600 }}>
                +{xpGained} XP
              </span>
            )}
            <span className={`score-badge ${scoreClass}`}>{result.score}점</span>
          </div>
        </div>

        {result.details.length > 0 && (
          <div style={{ marginBottom: 12, fontSize: 12, color: 'var(--text-secondary)' }}>
            {result.details.map((d, i) => (
              <div key={i} style={{ padding: '2px 0' }}>
                {d.includes('일치') && !d.includes('불일치') ? '✓' : '✗'} {d}
              </div>
            ))}
          </div>
        )}

        {result.userResult && result.userResult.values.length > 0 && (
          <div className="results-table-container">
            <table className="results-table">
              <thead>
                <tr>
                  {result.userResult.columns.map((col: string, i: number) => (
                    <th key={i}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.userResult.values.slice(0, 50).map((row: unknown[], i: number) => (
                  <tr key={i}>
                    {row.map((val: unknown, j: number) => (
                      <td key={j}>{val === null ? 'NULL' : String(val)}</td>
                    ))}
                  </tr>
                ))}
                {result.userResult.values.length > 50 && (
                  <tr>
                    <td
                      colSpan={result.userResult.columns.length}
                      style={{ textAlign: 'center', color: 'var(--text-muted)' }}
                    >
                      ... {result.userResult.values.length - 50}행 더 있음
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
