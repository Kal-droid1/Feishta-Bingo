import { useState, useEffect, useCallback } from 'react';
import { PlayerHeader, PlayerHeaderSkeleton } from './components/PlayerHeader';
import { RoomCard, RoomCardSkeleton } from './components/RoomCard';
import { ToastContainer } from './components/Toast';
import { Phase2CardSelection } from './components/Phase2CardSelection';
import { Phase3LiveGame } from './components/Phase3LiveGame';
import { Phase4Wallet } from './components/Phase4Wallet';
import { Phase5Profile } from './components/Phase5Profile';
import { ROOMS } from './data/rooms';
import type { AuthState, Room, User } from './types';
import type { ToastData } from './components/Toast';

// ── Telegram WebApp global type ──────────────────────────────────
declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        ready: () => void;
        expand: () => void;
        close: () => void;
        initData: string;
        initDataUnsafe: {
          user?: {
            id: number;
            first_name?: string;
            last_name?: string;
            username?: string;
            photo_url?: string;
          };
        };
        themeParams: {
          bg_color?: string;
          text_color?: string;
          hint_color?: string;
          link_color?: string;
          button_color?: string;
          button_text_color?: string;
        };
        colorScheme: 'light' | 'dark';
        HapticFeedback: {
          impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
          notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
        };
      };
    };
  }
}

// ── Helpers ──────────────────────────────────────────────────────
let toastIdCounter = 0;
function createToastId(): string {
  return `toast-${++toastIdCounter}-${Date.now()}`;
}

// ── App ──────────────────────────────────────────────────────────
function App() {
  const [auth, setAuth] = useState<AuthState>({ status: 'loading' });
  const [toasts, setToasts] = useState<ToastData[]>([]);
  
  // Theme State
  const [theme, setTheme] = useState<'light' | 'dark' | 'sakura'>(() => {
    return (localStorage.getItem('feishta-theme') as 'light' | 'dark' | 'sakura') || 'dark';
  });

  // Voice Enabled
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('feishta-voice');
    return saved === null ? true : saved === 'true';
  });
  
  // Settings Overlay State
  const [showSettings, setShowSettings] = useState(false);

  // Apply data-theme to <html> whenever theme changes
  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', theme);
    }
    localStorage.setItem('feishta-theme', theme);
  }, [theme]);

  // Persist voice preference
  useEffect(() => {
    localStorage.setItem('feishta-voice', String(voiceEnabled));
  }, [voiceEnabled]);

  // Routing state
  const [currentPhase, setCurrentPhase] = useState<'lobby' | 'phase2' | 'phase3' | 'phase4' | 'profile'>('lobby');
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [selectedCardIds, setSelectedCardIds] = useState<number[]>([]);
  const [rooms, setRooms] = useState<Room[]>(ROOMS);

  // Toast management
  const addToast = useCallback((toast: Omit<ToastData, 'id'>) => {
    const newToast: ToastData = { ...toast, id: createToastId() };
    setToasts(prev => [...prev, newToast]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // ── Initialization & Auth ────────────────────────────────────
  useEffect(() => {
    async function initialize() {
      try {
        // 1. Initialize Telegram WebApp
        const tg = window.Telegram?.WebApp;
        if (tg) {
          tg.ready();
          tg.expand();
          // We intentionally do NOT apply Telegram dynamic theme variables here
          // to enforce the "creamy whitish" premium aesthetic.
        }

        // 2. Extract user data from Telegram SDK (with dev fallback)
        const tgUser = tg?.initDataUnsafe?.user;
        const telegramId = tgUser?.id ?? 99999;
        const firstName  = tgUser?.first_name ?? 'Dev';
        const lastName   = tgUser?.last_name ?? null;
        const username   = tgUser?.username ?? 'dev_user';
        const photoUrl   = tgUser?.photo_url ?? undefined;

        // 3. Authenticate with backend
        const res = await fetch('/api/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            telegramId: String(telegramId),
            firstName,
            lastName,
            username,
          }),
        });

        if (!res.ok) throw new Error(`Server error: ${res.status}`);

        const data = await res.json();

        // Merge Telegram photo + placeholder stats
        const user: User = {
          ...data.user,
          photoUrl,
          phone: data.user.phone ?? null,
          totalGames: data.user.totalGames ?? 0,
          winRate: data.user.winRate ?? 0,
          bestStreak: data.user.bestStreak ?? 0,
        };

        setAuth({ status: 'success', user, isNew: data.isNew });

        // Welcome toast for new users
        if (data.isNew) {
          addToast({
            type: 'success',
            icon: '🎉',
            title: 'Welcome to ፌሽታ ቢንጎ!',
            message: `You've received 100 ETB as a sign-up bonus.`,
            duration: 4000,
          });
        }
        // Fetch dynamic room config
        const settingsRes = await fetch('/api/settings/public');
        if (settingsRes.ok) {
          const settings = await settingsRes.json();
          setRooms(ROOMS.map(r => {
            if (r.id === 'room-5') return { ...r, fee: settings.room1_fee };
            if (r.id === 'room-10') return { ...r, fee: settings.room2_fee };
            if (r.id === 'room-50') return { ...r, fee: settings.room3_fee };
            return r;
          }));
        }

      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Connection failed.';
        setAuth({ status: 'error', message });
      }
    }

    initialize();
  }, [addToast]);

  // Refresh user data when returning to lobby
  useEffect(() => {
    if (currentPhase === 'lobby' && auth.status === 'success') {
      const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
      const telegramId = tgUser?.id ?? 99999;
      fetch(`/api/auth/me?telegramId=${telegramId}`)
        .then(res => res.json())
        .then(data => {
           if (data && typeof data.balance === 'number') {
             setAuth(prev => {
               if (prev.status === 'success') {
                 return { 
                   ...prev, 
                   user: { 
                     ...prev.user, 
                     balance: data.balance, 
                     totalGames: data.totalGames, 
                     winRate: data.winRate ?? prev.user.winRate,
                     bestStreak: data.bestStreak ?? prev.user.bestStreak,
                     isBanned: data.isBanned 
                   } 
                 };
               }
               return prev;
             });
           }
        });
    }
  }, [currentPhase, auth.status]);

  // ── Phase 1: Room Selection ──────────────────────────────────
  const handleRoomSelect = useCallback((room: Room) => {
    if (auth.status !== 'success') return;

    const tg = window.Telegram?.WebApp;
    const balance = auth.user.balance;

    if (balance < room.fee) {
      // ❌ Insufficient funds for even 1 card -> Spectator mode
      tg?.HapticFeedback?.notificationOccurred('warning');
      addToast({
        type: 'warning',
        icon: '👀',
        title: 'Spectator Mode',
        message: `Insufficient funds (${balance} ETB). You need at least ${room.fee} ETB for this room.`,
        duration: 4500,
      });
      // Optionally route to spectator view here
    } else {
      // ✅ Sufficient funds -> Move to Phase 2 (NO FEE DEDUCTED YET)
      tg?.HapticFeedback?.impactOccurred('medium');
      setSelectedRoom(room);
      setCurrentPhase('phase2');
    }
  }, [auth, addToast]);

  // ── Phase 2: Join Game ───────────────────────────────────────
  // NOTE: Balance is already deducted by the backend in Phase2CardSelection's /buy endpoint.
  // We just need to transition to Phase 3 and refresh the balance from server.
  const handleJoinGame = useCallback((selectedCards: number[]) => {
    if (auth.status !== 'success' || !selectedRoom) return;

    const totalCost = selectedCards.length * selectedRoom.fee;

    // Optimistically update local balance (backend already did it)
    setAuth(prev => {
      if (prev.status === 'success') {
        return {
          ...prev,
          user: { ...prev.user, balance: Math.max(0, prev.user.balance - totalCost) }
        };
      }
      return prev;
    });

    setSelectedCardIds(selectedCards);
    setCurrentPhase('phase3');

    addToast({
      type: 'success',
      icon: '🎫',
      title: 'Cards Reserved! Game Starting!',
      message: `${totalCost} ETB paid for ${selectedCards.length} card(s). Good luck!`,
      duration: 3000,
    });
  }, [auth, selectedRoom, addToast]);

  const handleBackToLobby = useCallback(() => {
    setSelectedRoom(null);
    setSelectedCardIds([]);
    setCurrentPhase('lobby');
  }, []);

  // ── Phase 3: Game End ────────────────────────────────────────
  const handleGameEnd = useCallback((winnings: number) => {
    if (winnings > 0) {
      setAuth(prev => {
        if (prev.status === 'success') {
          return {
            ...prev,
            user: { ...prev.user, balance: prev.user.balance + winnings }
          };
        }
        return prev;
      });
      addToast({
        type: 'success',
        icon: '🏆',
        title: 'Winnings Collected!',
        message: `+${winnings} ETB has been added to your balance.`,
        duration: 4000,
      });
    }
    handleBackToLobby();
  }, [addToast, handleBackToLobby]);

  // ── Retry handler ────────────────────────────────────────────
  const handleRetry = useCallback(() => {
    setAuth({ status: 'loading' });
    window.location.reload();
  }, []);

  // ── Render ───────────────────────────────────────────────────
  return (
    <div className="app-root pb-16">
      {/* Ambient orbs */}
      <div className="orb orb-1" />
      <div className="orb orb-2" />

      {/* Toasts */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      <main className="app-content h-full">
        {/* Loading State */}
        {auth.status === 'loading' && <LoadingSkeleton />}

        {/* Error State */}
        {auth.status === 'error' && (
          <ErrorView message={auth.message} onRetry={handleRetry} />
        )}

        {/* Success State — Router */}
        {auth.status === 'success' && (
          <>
            {currentPhase === 'lobby' && (
              <>
                <PlayerHeader user={auth.user} />

                <div className="section-header">
                  <h2 className="section-title">Choose a Room</h2>
                  <span className="section-badge">3 Open</span>
                </div>

                <div className="rooms-grid" id="rooms-grid">
                  {rooms.map(room => (
                    <RoomCard
                      key={room.id}
                      room={room}
                      onSelect={handleRoomSelect}
                    />
                  ))}
                </div>

                <footer className="app-footer">
                  <div className="app-footer__brand">ፌሽታ ቢንጎ</div>
                  <div className="app-footer__sub">Telegram Mini App</div>
                </footer>
              </>
            )}

            {currentPhase === 'phase2' && selectedRoom && (
              <Phase2CardSelection
                room={selectedRoom}
                user={auth.user}
                onJoinGame={handleJoinGame}
                onBackToLobby={handleBackToLobby}
              />
            )}

            {currentPhase === 'phase3' && selectedRoom && (
              <Phase3LiveGame
                room={selectedRoom}
                user={auth.user}
                selectedCardIds={selectedCardIds}
                onGameEnd={handleGameEnd}
                onBackToLobby={handleBackToLobby}
                voiceEnabled={voiceEnabled}
                onToggleVoice={() => setVoiceEnabled(v => !v)}
              />
            )}

            {currentPhase === 'phase4' && (
              <Phase4Wallet
                user={auth.user}
                onBack={handleBackToLobby}
              />
            )}

            {currentPhase === 'profile' && (
              <Phase5Profile
                user={auth.user}
                onBack={handleBackToLobby}
              />
            )}

            {/* Phone Registration Modal */}
            {!auth.user.phone && (
              <PhoneRegistrationModal
                telegramId={auth.user.telegramId}
                onSuccess={(phone) => setAuth(prev => prev.status === 'success' ? { ...prev, user: { ...prev.user, phone } } : prev)}
              />
            )}
          </>
        )}
      </main>

      {/* Bottom Navigation Bar — hidden in Phase 3 */}
      {auth.status === 'success' && currentPhase !== 'phase3' && (
        <nav className="bottom-nav">
          <button className={`nav-item ${currentPhase === 'lobby' || currentPhase === 'phase2' ? 'active' : ''}`} onClick={handleBackToLobby}>
            <span className="nav-item__icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z"/><path d="m3 9 2.45-4.9A2 2 0 0 1 7.24 3h9.52a2 2 0 0 1 1.8 1.1L21 9"/><path d="M12 3v6"/></svg>
            </span>
            <span className="nav-item__label">Rooms</span>
          </button>
          <button className={`nav-item ${currentPhase === 'phase4' ? 'active' : ''}`} onClick={() => setCurrentPhase('phase4')}>
            <span className="nav-item__icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>
            </span>
            <span className="nav-item__label">Wallet</span>
          </button>
          <button className="nav-item" onClick={() => setShowSettings(true)}>
            <span className="nav-item__icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
            </span>
            <span className="nav-item__label">Settings</span>
          </button>
          <button className={`nav-item ${currentPhase === 'profile' ? 'active' : ''}`} onClick={() => setCurrentPhase('profile')}>
            <span className="nav-item__icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            </span>
            <span className="nav-item__label">Profile</span>
          </button>
        </nav>
      )}

      {/* ── Global Settings Panel (Slide-up) ── */}
      {showSettings && (
        <div className="settings-overlay" onClick={() => setShowSettings(false)}>
          <div className="settings-panel" onClick={e => e.stopPropagation()}>
            <div className="settings-header">
              <h3 className="settings-title">App Settings</h3>
              <button className="settings-close" onClick={() => setShowSettings(false)}>×</button>
            </div>
            
            <div className="settings-list">
              <div className="setting-item">
                <div className="setting-info">
                  <div className="setting-name">App Theme</div>
                  <div className="setting-desc">Select your preferred visual style</div>
                </div>
              </div>
              
              <div className="flex gap-2 mb-4">
                <button 
                  className="flex-1 py-3 px-2 rounded-xl text-sm font-bold border"
                  style={{
                    background: theme === 'light' ? 'var(--gold)' : 'var(--cream-surface-hover)',
                    color: theme === 'light' ? '#fff' : 'var(--text-main)',
                    borderColor: theme === 'light' ? 'transparent' : 'var(--border)'
                  }}
                  onClick={() => setTheme('light')}
                >
                  ☀️ Cream
                </button>
                <button 
                  className="flex-1 py-3 px-2 rounded-xl text-sm font-bold border"
                  style={{
                    background: theme === 'dark' ? 'var(--gold)' : 'var(--cream-surface-hover)',
                    color: theme === 'dark' ? '#fff' : 'var(--text-main)',
                    borderColor: theme === 'dark' ? 'transparent' : 'var(--border)'
                  }}
                  onClick={() => setTheme('dark')}
                >
                  🌙 Slate
                </button>
                <button 
                  className="flex-1 py-3 px-2 rounded-xl text-sm font-bold border"
                  style={{
                    background: theme === 'sakura' ? 'var(--gold)' : 'var(--cream-surface-hover)',
                    color: theme === 'sakura' ? '#fff' : 'var(--text-main)',
                    borderColor: theme === 'sakura' ? 'transparent' : 'var(--border)'
                  }}
                  onClick={() => setTheme('sakura')}
                >
                  🌸 Sakura
                </button>
              </div>

              <div className="setting-item">
                <div className="setting-info">
                  <div className="setting-name">Voice Caller</div>
                  <div className="setting-desc">Announce called numbers automatically</div>
                </div>
                <label className="toggle-switch">
                  <input type="checkbox" checked={voiceEnabled} onChange={() => setVoiceEnabled(v => !v)} />
                  <span className="toggle-slider"></span>
                </label>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Loading Skeleton ──────────────────────────────────────────────
function LoadingSkeleton() {
  return (
    <div className="loading-container">
      <PlayerHeaderSkeleton />
      <div style={{ padding: '0 4px', marginBottom: 14, marginTop: 8 }}>
        <div className="skeleton" style={{ width: 120, height: 12 }} />
      </div>
      <div className="loading-rooms-skeleton">
        <RoomCardSkeleton />
        <RoomCardSkeleton />
        <RoomCardSkeleton />
      </div>
    </div>
  );
}

// ── Error View ───────────────────────────────────────────────────
function ErrorView({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="error-card" id="error-view">
      <div className="error-icon">😵‍💫</div>
      <h2 className="error-title">Connection Failed</h2>
      <p className="error-message">{message}</p>
      <button className="error-retry-btn" onClick={onRetry} id="retry-btn">
        🔄 Try Again
      </button>
    </div>
  );
}

// ── Phone Registration Modal ──────────────────────────────────────
function PhoneRegistrationModal({ telegramId, onSuccess }: { telegramId: string, onSuccess: (phone: string) => void }) {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.length < 9) {
      setError('Please enter a valid phone number');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegramId, phone })
      });
      if (res.ok) {
        onSuccess(phone);
      } else {
        setError('Failed to save phone number');
      }
    } catch {
      setError('Network error. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="settings-overlay">
      <div className="settings-panel" style={{ padding: '24px', textAlign: 'center' }}>
        <h3 className="settings-title" style={{ marginBottom: '8px' }}>Welcome to Feshta! 🎉</h3>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px' }}>
          Please enter your phone number. This will be used for Telebirr / CBE deposits and withdrawals.
        </p>
        {error && <p style={{ color: 'var(--red)', fontSize: '12px', marginBottom: '12px' }}>{error}</p>}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <input 
            type="tel" 
            placeholder="09..." 
            value={phone} 
            onChange={e => setPhone(e.target.value.replace(/[^0-9+]/g, ''))}
            style={{ 
              padding: '16px', borderRadius: '12px', border: '1px solid var(--border)', 
              background: 'var(--cream-bg)', color: 'var(--text-main)', fontSize: '16px',
              textAlign: 'center', fontWeight: 'bold'
            }}
            required 
          />
          <button 
            type="submit" 
            disabled={loading}
            style={{
              padding: '16px', borderRadius: '12px', border: 'none',
              background: 'linear-gradient(to right, var(--gold-dark), var(--gold))',
              color: '#fff', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer'
            }}
          >
            {loading ? 'Saving...' : 'Save & Continue'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default App;
