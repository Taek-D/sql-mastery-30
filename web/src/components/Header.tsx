import { getLevelInfo, getXpProgress, getTierColor } from '../services/gamification';

interface HeaderProps {
  xp: number;
  totalSolved: number;
  streak: number;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
}

export function Header({ xp, totalSolved, streak, sidebarOpen, onToggleSidebar }: HeaderProps) {
  const level = getLevelInfo(xp);
  const { current, next, progress } = getXpProgress(xp);
  const tierColor = getTierColor(level.tier);

  return (
    <header className="header">
      <button className="header-toggle" onClick={onToggleSidebar} title="Toggle sidebar">
        {sidebarOpen ? '◀' : '▶'}
      </button>

      <div className="header-logo">
        <span>🎯</span>
        SQL Mastery 30
      </div>

      <div
        className="level-badge"
        style={{ background: `${tierColor}20`, color: tierColor, border: `1px solid ${tierColor}40` }}
      >
        Lv.{level.level} {level.name}
      </div>

      <div className="header-xp">
        <div className="xp-bar-container">
          <div
            className="xp-bar-fill"
            style={{
              width: `${progress * 100}%`,
              background: `linear-gradient(90deg, ${tierColor}, ${tierColor}cc)`,
            }}
          />
        </div>
        <span className="xp-label">
          {current} / {next} XP
        </span>
      </div>

      <div className="header-stats">
        <div className="stat-item">
          ✅ <span className="stat-value">{totalSolved}</span>/30
        </div>
        {streak > 0 && (
          <div className="stat-item">
            🔥 <span className="stat-value">{streak}</span>일
          </div>
        )}
        <div className="stat-item">
          ⭐ <span className="stat-value">{xp.toLocaleString()}</span> XP
        </div>
      </div>
    </header>
  );
}
