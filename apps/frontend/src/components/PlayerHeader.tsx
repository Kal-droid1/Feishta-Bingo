import type { User } from '../types';

interface PlayerHeaderProps {
  user: User;
}

export function PlayerHeader({ user }: PlayerHeaderProps) {
  const displayName = user.firstName || user.username || `Player`;
  const initials = displayName.slice(0, 2).toUpperCase();
  const username = user.username ? `@${user.username}` : null;

  return (
    <header className="player-header" id="player-header">
      <div className="player-header__top">
        {/* Avatar */}
        <div className="avatar-wrapper">
          <div className="avatar-ring">
            <div className="avatar" id="player-avatar">
              {user.photoUrl ? (
                <img src={user.photoUrl} alt={displayName} />
              ) : (
                initials
              )}
            </div>
          </div>
          <div className="avatar-status" aria-label="Online" />
        </div>

        {/* Player Info */}
        <div className="player-info">
          <h1 className="player-name" id="player-name">{displayName}</h1>
          {username && (
            <p className="player-username" id="player-username">{username}</p>
          )}
        </div>

        {/* Balance */}
        <div className="balance-pill" id="player-balance">
          <span className="balance-label">Balance</span>
          <span className="balance-value">
            {user.balance.toLocaleString()}
            <span className="balance-currency">ETB</span>
          </span>
        </div>
      </div>

      {/* Stats Row */}
      <div className="stats-row">
        <div className="stat-chip" id="stat-total-games">
          <div className="stat-value">{user.totalGames ?? 0}</div>
          <div className="stat-label">Games</div>
        </div>
        <div className="stat-chip" id="stat-win-rate">
          <div className="stat-value">{user.winRate ?? 0}%</div>
          <div className="stat-label">Win Rate</div>
        </div>
        <div className="stat-chip" id="stat-best-streak">
          <div className="stat-value">{user.bestStreak ?? 0}</div>
          <div className="stat-label">Daily Streak</div>
        </div>
      </div>
    </header>
  );
}

/* ── Skeleton ──────────────────────────────────────────────────── */
export function PlayerHeaderSkeleton() {
  return (
    <div className="loading-header-skeleton">
      <div className="player-header__top">
        <div className="skeleton" style={{ width: 56, height: 56, borderRadius: '50%' }} />
        <div style={{ flex: 1 }}>
          <div className="skeleton" style={{ width: '60%', height: 16, marginBottom: 6 }} />
          <div className="skeleton" style={{ width: '40%', height: 12 }} />
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="skeleton" style={{ width: 40, height: 10, marginBottom: 6, marginLeft: 'auto' }} />
          <div className="skeleton" style={{ width: 70, height: 22 }} />
        </div>
      </div>
      <div className="stats-row" style={{ marginTop: 16 }}>
        {[1, 2, 3].map(i => (
          <div className="stat-chip" key={i}>
            <div className="skeleton" style={{ width: 28, height: 16, margin: '0 auto 4px' }} />
            <div className="skeleton" style={{ width: 40, height: 10, margin: '0 auto' }} />
          </div>
        ))}
      </div>
    </div>
  );
}
