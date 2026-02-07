import { useState, useCallback } from 'react';
import type { Problem } from '../data/problems';
import type { ProblemProgress } from '../hooks/useProgress';
import type { ValidationResult } from '../services/queryValidator';
import { validateQuery } from '../services/queryValidator';
import type { Difficulty, Badge } from '../services/gamification';
import { SQLEditor } from './SQLEditor';
import { ResultsPanel } from './ResultsPanel';
import { LevelUpModal, BadgeNotification } from './LevelUpModal';
import type { QueryExecResult } from 'sql.js';

interface ProblemViewProps {
  problem: Problem;
  progress: ProblemProgress | undefined;
  executeQuery: (sql: string) => QueryExecResult[];
  onRecordAttempt: (
    dayNum: number,
    score: number,
    difficulty: Difficulty,
    code: string,
    usedHint: boolean,
  ) => { xpGained: number; newBadges: Badge[] };
  onSaveCode: (dayNum: number, code: string) => void;
  onMarkHintUsed: (dayNum: number) => void;
}

export function ProblemView({
  problem,
  progress,
  executeQuery,
  onRecordAttempt,
  onSaveCode,
  onMarkHintUsed,
}: ProblemViewProps) {
  const [code, setCode] = useState(progress?.lastCode || problem.starterCode || '');
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [lastXpGained, setLastXpGained] = useState(0);
  const [activeBadge, setActiveBadge] = useState<Badge | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);

  const handleCodeChange = useCallback(
    (newCode: string) => {
      setCode(newCode);
      onSaveCode(problem.day, newCode);
    },
    [problem.day, onSaveCode],
  );

  const handleRun = useCallback(() => {
    if (!code.trim()) return;

    setIsRunning(true);
    setError(null);
    setResult(null);

    // Small delay for UX feedback
    setTimeout(() => {
      try {
        const userResults = executeQuery(code);
        const answerResults = executeQuery(problem.answerQuery);
        const validation = validateQuery(userResults, answerResults);

        setResult(validation);

        const { xpGained, newBadges } = onRecordAttempt(
          problem.day,
          validation.score,
          problem.difficulty,
          code,
          showHint,
        );

        if (validation.score >= 80 && xpGained > 0) {
          setLastXpGained(xpGained);
          setShowModal(true);
        }

        if (newBadges.length > 0) {
          setActiveBadge(newBadges[0]);
          setTimeout(() => setActiveBadge(null), 3000);
        }
      } catch (err) {
        setError(String(err instanceof Error ? err.message : err));
      }
      setIsRunning(false);
    }, 100);
  }, [code, problem, executeQuery, onRecordAttempt, showHint]);

  const handleHintToggle = () => {
    if (!showHint) {
      onMarkHintUsed(problem.day);
    }
    setShowHint(!showHint);
  };

  const difficultyLabel: Record<Difficulty, string> = {
    basic: '기초',
    intermediate: '중급',
    advanced: '고급',
  };

  return (
    <div className="problem-view">
      <div className="problem-header">
        <div className="problem-title-area">
          <h2>Day {problem.day}: {problem.title}</h2>
          <span className={`problem-difficulty ${problem.difficulty}`}>
            {difficultyLabel[problem.difficulty]}
          </span>
          {progress?.solved && (
            <span className="score-badge perfect" style={{ fontSize: 11 }}>
              ✓ 해결 ({progress.bestScore}점)
            </span>
          )}
        </div>
        <div className="problem-actions">
          <button
            className="btn btn-secondary"
            onClick={() => setShowAnswer(!showAnswer)}
          >
            {showAnswer ? '정답 숨기기' : '정답 보기'}
          </button>
          <button className="btn btn-secondary" onClick={() => setCode(problem.starterCode || '')}>
            초기화
          </button>
        </div>
      </div>

      <div className="split-pane">
        <div className="pane-left">
          <div className="problem-description">
            <h3>비즈니스 맥락</h3>
            <p>{problem.context}</p>

            <h3>테이블 스키마</h3>
            <ul className="schema-list">
              {problem.schema.map((s, i) => (
                <li key={i}>
                  <strong>{s.table}</strong>: {s.columns.join(', ')}
                </li>
              ))}
            </ul>

            <h3>질문</h3>
            <p>{problem.question}</p>

            {problem.hints.length > 0 && (
              <>
                <button className="hint-toggle" onClick={handleHintToggle}>
                  {showHint ? '힌트 숨기기 ▲' : '힌트 보기 ▼'} {showHint ? '' : '(XP ×0.7)'}
                </button>
                {showHint && (
                  <div className="hint-content">
                    {problem.hints.map((h, i) => (
                      <div key={i}>• {h}</div>
                    ))}
                  </div>
                )}
              </>
            )}

            {showAnswer && (
              <>
                <h3>정답 쿼리</h3>
                <pre
                  style={{
                    background: 'var(--bg-primary)',
                    padding: 12,
                    borderRadius: 'var(--radius-sm)',
                    fontSize: 12,
                    fontFamily: 'var(--font-mono)',
                    overflowX: 'auto',
                    whiteSpace: 'pre-wrap',
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--border)',
                  }}
                >
                  {problem.answerQuery}
                </pre>
                {problem.explanation && (
                  <>
                    <h3>해설</h3>
                    <p>{problem.explanation}</p>
                  </>
                )}
              </>
            )}
          </div>
        </div>

        <div className="pane-right">
          <SQLEditor value={code} onChange={handleCodeChange} onRun={handleRun} />
          <ResultsPanel
            result={result}
            error={error}
            isRunning={isRunning}
            xpGained={result && result.score >= 80 ? lastXpGained : null}
          />
        </div>
      </div>

      <LevelUpModal
        show={showModal}
        score={result?.score ?? 0}
        xpGained={lastXpGained}
        problemTitle={`Day ${problem.day}: ${problem.title}`}
        onClose={() => setShowModal(false)}
      />
      <BadgeNotification badge={activeBadge} />
    </div>
  );
}
