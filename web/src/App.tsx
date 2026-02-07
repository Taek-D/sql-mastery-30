import { useState, useCallback } from 'react';
import { problems } from './data/problems';
import { useDatabase } from './hooks/useDatabase';
import { useProgress } from './hooks/useProgress';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { ProblemView } from './components/ProblemView';
import { BadgeNotification } from './components/LevelUpModal';

export function App() {
  const { isReady, isLoading, error: dbError, executeQuery } = useDatabase();
  const {
    xp,
    totalSolved,
    streak,
    getProblemProgress,
    recordAttempt,
    saveCode,
    markHintUsed,
    newBadges,
    clearNewBadges,
  } = useProgress();

  const [activeProblem, setActiveProblem] = useState<number | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleSelectProblem = useCallback((dayNum: number) => {
    setActiveProblem(dayNum);
  }, []);

  const currentProblem = activeProblem ? problems.find((p) => p.day === activeProblem) : null;

  if (isLoading) {
    return (
      <div className="loading-screen">
        <span style={{ fontSize: 48 }}>🎯</span>
        <h1>SQL Mastery 30</h1>
        <div className="spinner" />
        <p>데이터베이스를 초기화하는 중...</p>
      </div>
    );
  }

  if (dbError) {
    return (
      <div className="loading-screen">
        <span style={{ fontSize: 48 }}>⚠️</span>
        <h1>오류 발생</h1>
        <p style={{ color: 'var(--error)' }}>{dbError}</p>
        <p>모던 브라우저(Chrome, Firefox, Edge)에서 다시 시도해주세요.</p>
      </div>
    );
  }

  return (
    <div className={`app ${!sidebarOpen ? 'sidebar-collapsed' : ''}`}>
      <Header
        xp={xp}
        totalSolved={totalSolved}
        streak={streak}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
      />
      <Sidebar
        problems={problems}
        activeProblem={activeProblem}
        onSelectProblem={handleSelectProblem}
        getProblemProgress={getProblemProgress}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="main-content">
        {currentProblem && isReady ? (
          <ProblemView
            key={currentProblem.day}
            problem={currentProblem}
            progress={getProblemProgress(currentProblem.day)}
            executeQuery={executeQuery}
            onRecordAttempt={recordAttempt}
            onSaveCode={saveCode}
            onMarkHintUsed={markHintUsed}
          />
        ) : (
          <div className="welcome-screen">
            <span style={{ fontSize: 64 }}>🎯</span>
            <h2>SQL Mastery 30</h2>
            <p>
              30개의 실무 SQL 챌린지를 게임처럼 풀어보세요.
              브라우저에서 직접 SQL을 실행하고, XP를 모아 레벨업하세요!
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
              ← 왼쪽 사이드바에서 문제를 선택하세요
            </p>
            <button
              className="btn btn-primary start-btn"
              onClick={() => handleSelectProblem(1)}
            >
              Day 1부터 시작하기
            </button>
          </div>
        )}
      </div>

      {newBadges.length > 0 && (
        <div onClick={clearNewBadges}>
          <BadgeNotification badge={newBadges[0]} />
        </div>
      )}
    </div>
  );
}
