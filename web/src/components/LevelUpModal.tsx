import type { Badge } from '../services/gamification';

interface LevelUpModalProps {
  show: boolean;
  score: number;
  xpGained: number;
  problemTitle: string;
  onClose: () => void;
}

export function LevelUpModal({ show, score, xpGained, problemTitle, onClose }: LevelUpModalProps) {
  if (!show) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-icon">
          {score === 100 ? '🏆' : score >= 80 ? '🎉' : '💪'}
        </div>
        <h2>{score === 100 ? '완벽합니다!' : score >= 80 ? '정답!' : '잘했어요!'}</h2>
        <p>{problemTitle}</p>
        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>점수: {score}/100</p>
        <div className="modal-xp">+{xpGained} XP</div>
        <button className="btn btn-primary" onClick={onClose}>
          계속하기
        </button>
      </div>
    </div>
  );
}

interface BadgeNotificationProps {
  badge: Badge | null;
}

export function BadgeNotification({ badge }: BadgeNotificationProps) {
  if (!badge) return null;

  return (
    <div className="badge-notification">
      <span className="badge-icon">{badge.icon}</span>
      <div className="badge-text">
        <h4>배지 획득!</h4>
        <p>{badge.name} — {badge.description}</p>
      </div>
    </div>
  );
}
