import type { User } from '../types';

interface Phase5ProfileProps {
  user: User;
  onBack: () => void;
}

export function Phase5Profile({ user, onBack }: Phase5ProfileProps) {
  const displayName = user.firstName || user.username || `Player`;
  const initials = displayName.slice(0, 2).toUpperCase();
  const username = user.username ? `@${user.username}` : null;
  
  // Extra features / Derived Stats
  const games = user.totalGames || 0;
  let vipTier = { name: 'Bronze', color: 'var(--text-muted)' };
  if (games >= 100) vipTier = { name: 'Diamond 💎', color: 'var(--gold)' };
  else if (games >= 50) vipTier = { name: 'Gold 🏆', color: 'var(--gold)' };
  else if (games >= 15) vipTier = { name: 'Silver 🥈', color: 'var(--text-main)' };

  // Mock total earnings (since we don't track total historical winnings explicitly right now)
  const totalEarnings = Math.round(games * ((user.winRate || 0) / 100) * 150);

  return (
    <div className="profile-container">
      {/* Header */}
      <header className="profile-header">
        <button onClick={onBack} className="profile-back-btn">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </button>
        <h1 className="profile-title">My Profile</h1>
      </header>

      {/* Profile Card */}
      <div className="profile-card">
        <div className="profile-card-glow" />
        
        <div className="profile-avatar-wrapper">
          {user.photoUrl ? (
            <img src={user.photoUrl} alt={displayName} className="profile-avatar-img" />
          ) : (
            <div className="profile-avatar-initials">{initials}</div>
          )}
        </div>

        <div className="flex items-center justify-center gap-2 mb-1">
          <h2 className="profile-name m-0">{displayName}</h2>
          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border" style={{ color: vipTier.color, borderColor: vipTier.color }}>
            {vipTier.name}
          </span>
        </div>
        {username && <p className="profile-username">{username}</p>}

        <div className="profile-balance-badge">
          <span className="profile-balance-label">Total Balance</span>
          <span className="profile-balance-val">
            {user.balance.toLocaleString()} <span className="profile-balance-currency">ETB</span>
          </span>
        </div>
      </div>

      {/* Lifetime Stats */}
      <h3 className="profile-section-title">Lifetime Statistics</h3>
      
      <div className="profile-stats-grid">
        <div className="profile-stat-box">
          <span className="profile-stat-label">Games Played</span>
          <span className="profile-stat-val text-main">{user.totalGames ?? 0}</span>
        </div>
        
        <div className="profile-stat-box">
          <span className="profile-stat-label">Win Rate</span>
          <span className="profile-stat-val text-green">{user.winRate ?? 0}%</span>
        </div>
        
        <div className="profile-stat-box">
          <span className="profile-stat-label">Daily Play Streak</span>
          <div className="profile-stat-val text-gold">🔥 {user.bestStreak ?? 0}</div>
        </div>
        
        <div className="profile-stat-box">
          <span className="profile-stat-label">Total Earnings</span>
          <div className="profile-stat-val text-main" style={{ fontSize: '24px' }}>{totalEarnings.toLocaleString()} <span className="text-xs text-[var(--gold)]">ETB</span></div>
        </div>
      </div>
      
      {/* Account Info */}
      <h3 className="profile-section-title">Account Info</h3>
      <div className="profile-info-list">
        <div className="profile-info-item border-bottom">
          <span className="profile-info-label">Telegram ID</span>
          <span className="profile-info-val text-main">{user.telegramId}</span>
        </div>
        <div className="profile-info-item border-bottom">
          <span className="profile-info-label">Account Status</span>
          <span className="profile-info-val text-green">Active</span>
        </div>
        <div className="profile-info-item">
          <span className="profile-info-label">Member Since</span>
          <span className="profile-info-val text-main">May 2026</span>
        </div>
      </div>
      
    </div>
  );
}
