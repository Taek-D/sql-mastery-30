import type { Problem } from '../data/problems';
import type { ProblemProgress } from '../hooks/useProgress';
import { X } from 'lucide-react';

interface SidebarProps {
  problems: Problem[];
  activeProblem: number | null;
  onSelectProblem: (dayNum: number) => void;
  getProblemProgress: (dayNum: number) => ProblemProgress | undefined;
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({
  problems,
  activeProblem,
  onSelectProblem,
  getProblemProgress,
  isOpen,
  onClose,
}: SidebarProps) {
  const basicProblems = problems.filter((p) => p.difficulty === 'basic');
  const intermediateProblems = problems.filter((p) => p.difficulty === 'intermediate');
  const advancedProblems = problems.filter((p) => p.difficulty === 'advanced');

  const handleProblemClick = (dayNum: number) => {
    onSelectProblem(dayNum);
    if (window.innerWidth <= 768) {
      onClose();
    }
  };

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

    const difficultyDots =
      problem.difficulty === 'basic' ? 1 : problem.difficulty === 'intermediate' ? 2 : 3;

    return (
      <div
        key={problem.day}
        className={`problem-item ${isActive ? 'active' : ''} ${isSolved ? 'completed' : ''}`}
        onClick={() => handleProblemClick(problem.day)}
      >
        <div className="problem-info">
          <span className="status-icon">{statusIcon}</span>
          <span className="day-num">D{problem.day}</span>
          <span className="title text-truncate">{problem.title}</span>
        </div>
        <div className="difficulty-dots">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className={`difficulty-dot ${i >= difficultyDots ? 'empty' : ''}`} />
          ))}
        </div>
      </div>
    );
  };

  return (
    <>
      <div className={`sidebar-overlay ${isOpen ? 'open' : ''}`} onClick={onClose} />
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header mobile-only">
          <h3>Problems</h3>
          <button className="btn-icon" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <div className="sidebar-content">
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
        </div>
      </aside>
    </>
  );
}
