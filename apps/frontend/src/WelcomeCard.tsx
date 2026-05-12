
interface User {
  id: number;
  telegramId: string;
  firstName: string | null;
  username: string | null;
  balance: number;
}

interface WelcomeCardProps {
  user: User;
  isNew: boolean;
}

export function WelcomeCard({ user, isNew }: WelcomeCardProps) {
  const displayName = user.firstName || user.username || `User #${user.telegramId}`;
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <div className="welcome-card">
      {/* Glossy top sheen */}
      <div className="card-sheen" />

      {/* Avatar */}
      <div className="avatar-ring">
        <div className="avatar">{initials}</div>
      </div>

      {/* Badge */}
      {isNew && (
        <span className="new-badge">✦ New Member</span>
      )}

      {/* Name */}
      <h1 className="welcome-heading">
        Welcome{isNew ? '' : ' back'},<br />
        <span className="name-highlight">{displayName}</span>
      </h1>

      {/* Balance card */}
      <div className="balance-chip">
        <span className="balance-label">Balance</span>
        <span className="balance-amount">
          {user.balance.toLocaleString()}
          <span className="balance-currency"> Birr</span>
        </span>
      </div>

      {/* Footer tag */}
      <p className="card-footer">Feishta Bingo · Telegram Mini App</p>
    </div>
  );
}

/* ── Standalone loading / error states ───────────────────────── */
export function WelcomeCardSkeleton() {
  return (
    <div className="welcome-card animate-pulse">
      <div className="h-20 w-20 rounded-full bg-stone-200 mx-auto mb-6" />
      <div className="h-5 w-40 rounded bg-stone-200 mx-auto mb-3" />
      <div className="h-8 w-56 rounded bg-stone-200 mx-auto mb-8" />
      <div className="h-16 w-full rounded-2xl bg-stone-200" />
    </div>
  );
}

export function WelcomeCardError({ message }: { message: string }) {
  return (
    <div className="welcome-card text-center">
      <p className="text-2xl mb-2">⚠️</p>
      <p className="text-stone-500 font-medium">{message}</p>
    </div>
  );
}
