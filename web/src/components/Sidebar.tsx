import type { Problem } from '../data/problems';
import type { ProblemProgress } from '../hooks/useProgress';

interface SidebarProps {
  problems: Problem[];
  activeProblem: number | null;
  onSelectProblem: (dayNum: number) => void;
  getProblemProgress: (dayNum: number) => ProblemProgress | undefined;
}

export function Sidebar({ problems, activeProblem, onSelectProblem, getProblemProgress }: SidebarProps) {
  const basicProblems = problems.filter((p) => p.difficulty === 'basic');
  const intermediateProblems = problems.filter((p) => p.difficulty === 'intermediate');
  const advancedProblems = problems.filter((p) => p.difficulty === 'advanced');

  const renderProblemItem = (problem: Problem) => {
    const progress = getProblemProgress(problem.day);
    const isActive = activeProblem === problem.day;
    const isSolved = progress?.solved ?? false;
    const bestScore = progress?.bestScore ?? 0;

    let statusIcon: string;
    if (!isSolved) {
      statusIcon = '○';
    } else if (bestScore === 100) {
      statusIcon = '★';
    } else {
      statusIcon = '✓';
    }

    const difficultyDots = problem.difficulty === 'basic' ? 1 : problem.difficulty === 'intermediate' ? 2 : 3;

    return (
      <div
        key={problem.day}
        className={`problem-item ${isActive ? 'active' : ''} ${isSolved ? 'completed' : ''}`}
        onClick={() => onSelectProblem(problem.day)}
      >
        <span className="status-icon">{statusIcon}</span>
        <span className="day-num">D{problem.day}</span>
        <span className="title">{problem.title}</span>
        <div className="difficulty-dots">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className={`difficulty-dot ${i >= difficultyDots ? 'empty' : ''}`}
            />
          ))}
        </div>
      </div>
    );
  };

  return (
    <aside className="sidebar">
      {basicProblems.length > 0 && (
        <>
          <div className="sidebar-section">기초 (Basic)</div>
          {basicProblems.map(renderProblemItem)}
        </>
      )}
      {intermediateProblems.length > 0 && (
        <>
          <div className="sidebar-section">중급 (Intermediate)</div>
          {intermediateProblems.map(renderProblemItem)}
        </>
      )}
      {advancedProblems.length > 0 && (
        <>
          <div className="sidebar-section">고급 (Advanced)</div>
          {advancedProblems.map(renderProblemItem)}
        </>
      )}
    </aside>
  );
}
