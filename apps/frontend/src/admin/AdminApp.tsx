import './admin.css';
import { useState, useEffect } from 'react';
import { 
  LayoutDashboard, Users, Settings, Wallet, 
  Search, Moon, Sun, Download, CheckCircle, 
  XCircle, Filter, Save, LogOut, Shield, User, ScrollText, Eye, EyeOff
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';

type AdminTab = 'dashboard' | 'transactions' | 'users' | 'config' | 'staff' | 'profile' | 'logs' | 'games';

function RoomAdminCard({ room, onOverride, hideSensitiveData }: { room: any, onOverride: (roomId: string, overrides: any, msg?: string) => void, hideSensitiveData: boolean }) {
  const [multiplier, setMultiplier] = useState(room.state.botMultiplier?.toString() || room.config.botMultiplier?.toString() || '4');
  const [ratio, setRatio] = useState(room.config.steeringRatio?.toString() || '65');
  const [topUp, setTopUp] = useState('');

  const queued = room.state.queuedOverrides || {};
  const isForceBotWin = queued.forceWin === 'BOT WIN';
  const isForceRealWin = queued.forceWin === 'REAL WIN';

  const isEnded = !!room.state.winnerData;
  const isGame = room.state.status === 'game' && !isEnded;
  const isLobby = room.state.status === 'lobby';

  // Live bot estimate during lobby
  const liveMultiplier = Math.max(2, Math.min(8, Number(multiplier) || 4));
  const liveJoined = room.state.realPlayersCount || 0;
  const estimatedMaxBots = liveJoined * liveMultiplier;
  const estimatedMinBots = liveJoined;

  return (
    <div className="admin-panel" style={{position: 'relative', overflow: 'hidden', border: isGame ? '1px solid var(--admin-success)' : isEnded ? '1px solid var(--admin-primary)' : '1px solid var(--admin-surface-border)'}}>
      {isGame && <div style={{position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: 'var(--admin-success)', animation: 'pulse 2s infinite'}} />}
      
      <div className="admin-flex admin-flex-between" style={{marginBottom: '1rem'}}>
        <h3 className="admin-panel-title" style={{margin: 0}}>{room.id.toUpperCase()}</h3>
        <span className={`admin-badge ${isGame ? 'admin-badge-success' : isEnded ? 'admin-badge-primary' : 'admin-badge-warning'}`}>
          {isEnded ? 'ENDED' : room.state.status.toUpperCase()}
        </span>
      </div>

      <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', marginBottom: '1rem', fontSize: '0.8rem'}}>
      <div style={{background: 'var(--cream-surface-hover)', padding: '0.75rem', borderRadius: '0.5rem'}}>
      <div style={{color: 'var(--admin-text-muted)', marginBottom: '0.25rem', fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 600}}>Total Players</div>
      <div style={{fontSize: '1.1rem', color: 'var(--admin-primary)', fontWeight: 800}}>{room.state.displayedTotal}</div>
      <div style={{fontWeight: 600, fontSize: '0.7rem', color: 'var(--text-muted)'}}>R: {room.state.realPlayersCount} | B: {room.state.botCount}</div>
      </div>
      <div style={{background: 'var(--cream-surface-hover)', padding: '0.75rem', borderRadius: '0.5rem', borderLeft: '3px solid var(--admin-warning)', position: 'relative'}}>
        <div style={{color: 'var(--admin-text-muted)', marginBottom: '0.25rem', fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 600}}>Prize</div>
        <div style={{fontSize: '1.1rem', color: 'var(--admin-warning)', fontWeight: 800, filter: hideSensitiveData ? 'blur(4px)' : 'none', userSelect: hideSensitiveData ? 'none' : 'auto'}}>
          {hideSensitiveData ? '••••' : `${room.state.prizeAmount} `}<span style={{fontSize: '0.65rem'}}>ETB</span>
        </div>
        <div style={{fontWeight: 600, fontSize: '0.7rem', color: 'var(--text-muted)', filter: hideSensitiveData ? 'blur(4px)' : 'none', userSelect: hideSensitiveData ? 'none' : 'auto'}}>
          Total: {hideSensitiveData ? '•••' : Math.floor(room.state.prizeAmount / 0.8)} | Cut: {hideSensitiveData ? '•••' : Math.floor(room.state.prizeAmount / 0.8 * 0.2)} (20%)
        </div>
      </div>
      {/* House Pot with color indicator */}
      {(() => {
        const housePot = room.state.housePot || 0;
        const prizeThreshold = room.state.prizeThreshold || 1;
        const ratio = housePot / prizeThreshold;
        const isLobby = room.state.status === 'lobby';
        
        // FIX 5: Color logic - ONLY during lobby session
        // - No lobby running: neutral/white color (no judgment)
        // - Lobby active:
        //   * 🔴 Red = pot below 50% of prize
        //   * 🟡 Yellow = pot between 50% and 100% of prize
        //   * 🟢 Green = pot equal to or above prize amount
        let potColor = '#9ca3af'; // neutral gray (no session)
        let potStatus = '⚪ Idle';
        
        if (isLobby) {
          if (ratio >= 1) {
            potColor = '#22c55e'; // green
            potStatus = '🟢 Real Win OK';
          } else if (ratio >= 0.5) {
            potColor = '#eab308'; // yellow
            potStatus = '🟡 Getting Close';
          } else {
            potColor = '#ef4444'; // red
            potStatus = '🔴 Below Minimum';
          }
        }
        
        return (
          <div style={{background: 'var(--cream-surface-hover)', padding: '0.75rem', borderRadius: '0.5rem', borderLeft: `3px solid ${potColor}`, position: 'relative'}}>
            <div style={{color: 'var(--admin-text-muted)', marginBottom: '0.25rem', fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 600}}>House Pot</div>
            <div style={{fontSize: '1.1rem', color: isLobby ? potColor : 'var(--admin-text)', fontWeight: 800, filter: hideSensitiveData ? 'blur(4px)' : 'none', userSelect: hideSensitiveData ? 'none' : 'auto'}}>
              {hideSensitiveData ? '••••' : `${housePot} `}<span style={{fontSize: '0.65rem'}}>ETB</span>
            </div>
            <div style={{fontWeight: 600, fontSize: '0.7rem', color: isLobby ? potColor : 'var(--text-muted)', filter: hideSensitiveData ? 'blur(4px)' : 'none', userSelect: hideSensitiveData ? 'none' : 'auto'}}>
              {hideSensitiveData ? '•••' : potStatus}
            </div>
          </div>
        );
      })()}
      </div>

      {room.config.lastSessionData && (
        <div style={{
          marginBottom: '1.5rem', 
          padding: '0.75rem 1rem', background: 'var(--admin-surface-hover)', 
          borderRadius: '8px', fontSize: '0.8rem',
          border: '1px dashed var(--admin-surface-border)'
        }}>
          <div style={{fontSize: '0.7rem', color: 'var(--admin-text-muted)', fontWeight: 800, letterSpacing: '1px', marginBottom: '0.5rem', textTransform: 'uppercase'}}>Last Session Result</div>
          <div className="admin-flex admin-flex-between" style={{marginBottom: '0.25rem'}}>
            <span style={{color: 'var(--admin-text-muted)'}}>Outcome:</span>
            <span style={{fontWeight: 800, color: room.config.lastSessionData.type === 'BOT WIN' ? 'var(--admin-danger)' : 'var(--admin-success)'}}>{room.config.lastSessionData.type}</span>
          </div>
          {room.config.lastSessionData.type === 'BOT WIN' ? (
            <div className="admin-flex admin-flex-between">
              <span style={{color: 'var(--admin-text-muted)'}}>Platform Cut Taken (20%):</span>
              <span style={{fontWeight: 800, color: 'var(--admin-success)', filter: hideSensitiveData ? 'blur(4px)' : 'none', userSelect: hideSensitiveData ? 'none' : 'auto'}}>
                {hideSensitiveData ? '••••' : `+${room.config.lastSessionData.cut}`} ETB
              </span>
            </div>
          ) : (
            <div className="admin-flex admin-flex-between">
              <span style={{color: 'var(--admin-text-muted)'}}>Prize Paid Out:</span>
              <span style={{fontWeight: 800, color: 'var(--admin-danger)', filter: hideSensitiveData ? 'blur(4px)' : 'none', userSelect: hideSensitiveData ? 'none' : 'auto'}}>
                {hideSensitiveData ? '••••' : `-${room.config.lastSessionData.prizePaid}`} ETB
              </span>
            </div>
          )}
        </div>
      )}

      {isLobby && (
        <div style={{
          marginBottom: '1.5rem',
          background: 'linear-gradient(90deg, rgba(245, 158, 11, 0.08) 0%, transparent 100%)',
          borderLeft: '3px solid var(--admin-warning)',
          padding: '0.75rem 1rem',
          borderRadius: '0 8px 8px 0'
        }}>
          <div style={{fontSize: '0.75rem', color: 'var(--admin-warning)', fontWeight: 800, letterSpacing: '1px', marginBottom: '0.75rem'}}>LOBBY WAITING</div>
          <div className="admin-flex admin-flex-between" style={{fontSize: '0.875rem', marginBottom: '0.5rem'}}>
            <span style={{color: 'var(--admin-text-muted)'}}>Time Left:</span>
            <span style={{fontWeight: 700}}>{room.state.timeLeft}s</span>
          </div>
          <div className="admin-flex admin-flex-between" style={{fontSize: '0.875rem', marginBottom: '0.5rem'}}>
            <span style={{color: 'var(--admin-text-muted)'}}>Joined (R):</span>
            <span style={{fontWeight: 700, color: 'var(--admin-success)'}}>{liveJoined} real</span>
          </div>
          <div className="admin-flex admin-flex-between" style={{fontSize: '0.875rem'}}>
            <span style={{color: 'var(--admin-text-muted)'}}>Bot Estimate (×{liveMultiplier}):</span>
            <span style={{fontWeight: 700, color: 'var(--admin-primary)'}}>
              {liveJoined > 0 ? `${estimatedMinBots}–${estimatedMaxBots}` : 'Waiting for players...'}
            </span>
          </div>
        </div>
      )}

      {isGame && (
        <div style={{
          marginBottom: '1.5rem', 
          background: 'linear-gradient(90deg, rgba(16, 185, 129, 0.08) 0%, transparent 100%)',
          borderLeft: '3px solid var(--admin-success)', 
          padding: '0.75rem 1rem',
          borderRadius: '0 8px 8px 0'
        }}>
          <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.75rem'}}>
            <div style={{width: 8, height: 8, borderRadius: '50%', background: 'var(--admin-success)', boxShadow: '0 0 8px var(--admin-success)', animation: 'pulse 1.5s infinite'}}></div>
            <div style={{fontSize: '0.75rem', color: 'var(--admin-success)', fontWeight: 800, letterSpacing: '1px'}}>LIVE TELEMETRY</div>
          </div>
          <div className="admin-flex admin-flex-between" style={{fontSize: '0.875rem', marginBottom: '0.5rem'}}>
            <span style={{color: 'var(--admin-text-muted)'}}>Numbers Called:</span>
            <span style={{fontWeight: 700}}>
              {room.state.lastNumberCalled ? <span style={{color: 'var(--admin-primary)', marginRight: '4px'}}>Last: {room.state.lastNumberCalled}</span> : ''}
              ({room.state.numbersCalled} / 75)
            </span>
          </div>
          <div className="admin-flex admin-flex-between" style={{fontSize: '0.875rem', marginBottom: '0.5rem'}}>
            <span style={{color: 'var(--admin-text-muted)'}}>Steering Ratio:</span>
            <span style={{fontWeight: 700}}>{room.state.activeSteeringRatio}%</span>
          </div>
          <div className="admin-flex admin-flex-between" style={{fontSize: '0.875rem', marginBottom: '0.5rem'}}>
            <span style={{color: 'var(--admin-text-muted)'}}>Closest Real Player:</span>
            <span style={{fontWeight: 800, color: room.state.closestRealPlayerNeeds === 1 ? 'var(--admin-danger)' : 'var(--text-main)'}}>
              {room.state.realPlayersCount > 0 && room.state.closestRealPlayerNeeds !== null 
                ? `Needs ${room.state.closestRealPlayerNeeds} more` 
                : 'N/A'}
            </span>
          </div>
          <div className="admin-flex admin-flex-between" style={{fontSize: '0.875rem', marginBottom: '0.5rem'}}>
            <span style={{color: 'var(--admin-text-muted)'}}>Mode Locked To:</span>
            <span style={{fontWeight: 800, color: room.state.sessionMode === 'BOT WIN' ? 'var(--admin-danger)' : 'var(--admin-success)'}}>{room.state.sessionMode}</span>
          </div>
          <div className="admin-flex admin-flex-between" style={{fontSize: '0.875rem'}}>
            <span style={{color: 'var(--admin-text-muted)'}}>Bot Wins At:</span>
            <span style={{fontWeight: 700}}>{room.state.botWinAtBall >= 0 ? `Ball ${room.state.botWinAtBall + 1}` : 'N/A'}</span>
          </div>
        </div>
      )}

      {isEnded && (
        <div style={{
          marginBottom: '1.5rem', 
          background: 'linear-gradient(90deg, rgba(59, 130, 246, 0.08) 0%, transparent 100%)',
          borderLeft: '3px solid var(--admin-primary)', 
          padding: '0.75rem 1rem',
          borderRadius: '0 8px 8px 0'
        }}>
          <div style={{fontSize: '0.75rem', color: 'var(--admin-primary)', fontWeight: 800, letterSpacing: '1px', marginBottom: '0.75rem'}}>SESSION ENDED</div>
          <div className="admin-flex admin-flex-between" style={{fontSize: '0.875rem', marginBottom: '0.5rem'}}>
            <span style={{color: 'var(--admin-text-muted)'}}>Winner:</span>
            <span style={{fontWeight: 800, color: room.state.winnerType === 'BOT' ? 'var(--admin-danger)' : 'var(--admin-success)'}}>
               {room.state.winnerType} ({room.state.winnerData.username})
            </span>
          </div>
          <div className="admin-flex admin-flex-between" style={{fontSize: '0.875rem', marginBottom: '0.5rem'}}>
            <span style={{color: 'var(--admin-text-muted)'}}>Prize Claimed:</span>
            <span style={{fontWeight: 800}}>{room.state.prizeAmount} ETB</span>
          </div>
          <div className="admin-flex admin-flex-between" style={{fontSize: '0.875rem'}}>
            <span style={{color: 'var(--admin-text-muted)'}}>Next Session:</span>
            <span style={{fontWeight: 700, color: 'var(--admin-warning)'}}>Restarting shortly...</span>
          </div>
        </div>
      )}

      <div style={{borderTop: '1px solid var(--admin-surface-border)', paddingTop: '1rem', marginTop: '1rem'}}>
        <div style={{fontSize: '0.75rem', color: 'var(--admin-text-muted)', fontWeight: 700, marginBottom: '0.75rem'}}>OVERRIDE NEXT SESSION</div>

        <div style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>

          {/* Bot Multiplier — permanent room config */}
          <div className="admin-flex admin-align-center admin-gap-2">
            <label style={{fontSize: '0.75rem', fontWeight: 600, width: '110px'}}>Bot Multiplier ×</label>
            <input
              type="number" min="2" max="8" value={multiplier}
              onChange={e => setMultiplier(e.target.value)}
              className="admin-input" style={{width: 70, padding: '0.5rem'}}
            />
            <button
              className="admin-btn-sm admin-btn-outline"
              onClick={() => onOverride(room.id, { botMultiplier: Number(multiplier) }, `Multiplier set to ×${multiplier} for ${room.id}`)}
            >Set</button>
            <span style={{fontSize: '0.7rem', color: 'var(--admin-text-muted)', marginLeft: 'auto'}}>
              {liveJoined > 0 ? `Bots = rand(${liveJoined}–${estimatedMaxBots})` : 'Waiting for players...'}
            </span>
          </div>

          {/* Steering Ratio */}
          <div className="admin-flex admin-align-center admin-gap-2">
            <label style={{fontSize: '0.75rem', fontWeight: 600, width: '110px'}}>Steering Ratio %</label>
            <input type="number" min="0" max="100" value={ratio} onChange={e => setRatio(e.target.value)} className="admin-input" style={{width: 70, padding: '0.5rem'}} />
            <button
              className="admin-btn-sm admin-btn-outline"
              onClick={() => onOverride(room.id, { steeringRatio: Number(ratio) }, `Queued: Ratio set to ${ratio}%`)}
            >Apply</button>
            {queued.steeringRatio !== undefined && (
              <span style={{fontSize: '0.75rem', color: 'var(--admin-warning)', marginLeft: 'auto'}}>Queued: Ratio {queued.steeringRatio}%</span>
            )}
          </div>

          {/* Force Win */}
          <div className="admin-flex admin-gap-2" style={{alignItems: 'center'}}>
            <button
              className="admin-btn-sm"
              style={{flex: 1, border: '1px solid var(--admin-danger)', background: isForceBotWin ? 'var(--admin-danger)' : 'transparent', color: isForceBotWin ? '#fff' : 'var(--admin-danger)'}}
              onClick={() => onOverride(room.id, { forceWin: isForceBotWin ? null : 'BOT WIN' }, isForceBotWin ? undefined : 'Queued: Force Bot Win')}
            >Force Bot Win</button>
            <button
              className="admin-btn-sm"
              style={{flex: 1, border: '1px solid var(--admin-success)', background: isForceRealWin ? 'var(--admin-success)' : 'transparent', color: isForceRealWin ? '#fff' : 'var(--admin-success)'}}
              onClick={() => onOverride(room.id, { forceWin: isForceRealWin ? null : 'REAL WIN' }, isForceRealWin ? undefined : 'Queued: Force Real Win')}
            >Force Real Win</button>
          </div>
          {queued.forceWin && (
            <div style={{fontSize: '0.75rem', color: 'var(--admin-warning)', textAlign: 'center'}}>
              Queued: {queued.forceWin === 'BOT WIN' ? 'Force Bot Win' : 'Force Real Win'}
            </div>
          )}

          {/* House Pot Top Up */}
          <div className="admin-flex admin-align-center admin-gap-2" style={{borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1rem'}}>
            <label style={{fontSize: '0.75rem', fontWeight: 600, width: '110px'}}>Top Up Pot (ETB)</label>
            <input type="number" value={topUp} onChange={e => setTopUp(e.target.value)} className="admin-input" style={{width: 90, padding: '0.5rem'}} />
            <button
              className="admin-btn-sm admin-btn-outline"
              style={{borderColor: 'var(--admin-warning)', color: 'var(--admin-warning)'}}
              onClick={() => {
                if (topUp) {
                  onOverride(room.id, { topUpPot: Number(topUp) }, `Pot topped up: +${topUp} ETB`);
                  setTopUp('');
                }
              }}
            >Top Up</button>
          </div>
        </div>
      </div>

      <div style={{borderTop: '1px solid var(--admin-surface-border)', paddingTop: '1rem', marginTop: '1rem'}}>
        <div style={{fontSize: '0.75rem', color: 'var(--admin-text-muted)', fontWeight: 700, marginBottom: '0.75rem'}}>SESSION HISTORY (LAST 10)</div>
        {(!room.config.history || room.config.history.length === 0) ? (
          <div style={{fontSize: '0.8rem', color: 'var(--admin-text-muted)', textAlign: 'center', padding: '1rem 0'}}>No sessions played yet</div>
        ) : (
          <div style={{display: 'flex', flexDirection: 'column', gap: '0.5rem'}}>
            {room.config.history.map((h: any, i: number) => (
              <div key={i} style={{
                fontSize: '0.75rem', 
                padding: '0.5rem 0.75rem', 
                borderRadius: '6px', 
                background: h.type === 'BOT WIN' ? 'rgba(239, 68, 68, 0.05)' : 'rgba(16, 185, 129, 0.05)',
                borderLeft: h.type === 'BOT WIN' ? '2px solid var(--admin-danger)' : '2px solid var(--admin-success)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <span style={{fontWeight: 800, color: 'var(--admin-text-muted)', marginRight: '8px'}}>Game {h.gameId}</span>
                  <span style={{color: h.type === 'BOT WIN' ? 'var(--admin-danger)' : 'var(--admin-success)', fontWeight: 800}}>
                    {h.type === 'BOT WIN' ? 'Bot Won' : 'Real Player Won'}
                  </span>
                </div>
                <div style={{textAlign: 'right'}}>
                  {h.type === 'BOT WIN' 
                    ? <div style={{color: 'var(--admin-text-muted)'}}>Cut: <span style={{fontWeight: 800, color: 'var(--admin-success)'}}>+{h.cut} ETB</span></div> 
                    : <div style={{color: 'var(--admin-text-muted)'}}>Prize Paid: <span style={{fontWeight: 800, color: 'var(--admin-danger)'}}>-{h.prizePaid} ETB</span></div>
                  }
                  <div style={{color: 'var(--admin-text-muted)', marginTop: '2px'}}>Pot: <span style={{fontWeight: 800, color: 'var(--admin-warning)'}}>{h.potAfter} ETB</span></div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}

export function AdminApp() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('adminToken'));
  const [role, setRole] = useState<string>(localStorage.getItem('adminRole') || 'MODERATOR');
  const [username, setUsername] = useState(localStorage.getItem('adminUsername') || '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [theme, setTheme] = useState<'dark' | 'light'>(() => localStorage.getItem('adminTheme') as 'dark' | 'light' || 'dark');
  const [selectedRoomId, setSelectedRoomId] = useState<string>('');
  const [hideSensitiveData, setHideSensitiveData] = useState<boolean>(false);
  
  // Data states
  const [pendingTxs, setPendingTxs] = useState<any[]>([]);
  const [allTxs, setAllTxs] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [txSearchQuery, setTxSearchQuery] = useState('');
  const [txFilter, setTxFilter] = useState({ type: 'ALL', status: 'ALL' });
  const [timeFilter, setTimeFilter] = useState('TODAY');
  const [settings, setSettings] = useState<any>({});
  const [analytics, setAnalytics] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [logsFilter, setLogsFilter] = useState('ALL');
  const [botsData, setBotsData] = useState<any>(null);
  const [toast, setToast] = useState<{msg: string, type: 'success' | 'error'} | null>(null);

  // New Staff form state
  const [newStaffUser, setNewStaffUser] = useState('');
  const [newStaffPass, setNewStaffPass] = useState('');

  // Password change state
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    localStorage.setItem('adminTheme', theme);
    document.body.classList.add('admin-mode');
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    return () => {
      document.body.classList.remove('admin-mode');
    };
  }, [theme]);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('adminToken', data.token);
        localStorage.setItem('adminRole', data.role);
        localStorage.setItem('adminUsername', data.username);
        setToken(data.token);
        setRole(data.role);
        setUsername(data.username);
        showToast('Logged in successfully');
      } else {
        setError(data.error || 'Login failed');
      }
    } catch {
      setError('Network error');
    }
  };

  const handleLogout = () => {
    if (!confirm('Are you sure you want to terminate this admin session?')) return;
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminRole');
    localStorage.removeItem('adminUsername');
    setToken(null);
    setRole('MODERATOR');
    // Force page refresh to ensure clean logout state
    window.location.reload();
  };

  const authFetch = async (url: string, options: any = {}) => {
    const res = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${token}`
      }
    });
    if (res.status === 401) {
      handleLogout();
      throw new Error('Unauthorized');
    }
    if (res.status === 403) {
      throw new Error('Forbidden');
    }
    return res;
  };

  // --- Data Fetchers ---
  const fetchPendingTxs = async () => {
    try {
      const res = await authFetch('/api/admin/transactions/pending');
      setPendingTxs(await res.json());
    } catch {}
  };

  const fetchAllTxs = async () => {
    try {
      const params = new URLSearchParams({
        type: txFilter.type,
        status: txFilter.status,
        q: txSearchQuery
      });
      const res = await authFetch(`/api/admin/transactions?${params.toString()}`);
      setAllTxs(await res.json());
    } catch {}
  };

  const searchUsers = async (q: string = '') => {
    try {
      const res = await authFetch(`/api/admin/users/search?q=${q}`);
      setUsers(await res.json());
    } catch {}
  };

  const fetchSettings = async () => {
    if (role !== 'SUPER_ADMIN') return;
    try {
      const res = await authFetch('/api/admin/settings');
      setSettings(await res.json());
    } catch {}
  };

  const fetchStaff = async () => {
    if (role !== 'SUPER_ADMIN') return;
    try {
      const res = await authFetch('/api/admin/staff');
      setStaff(await res.json());
    } catch {}
  };

  const fetchAnalytics = async () => {
    try {
      const res = await authFetch(`/api/admin/analytics?range=${timeFilter}`);
      setAnalytics(await res.json());
    } catch {}
  };

  const fetchLogs = async () => {
    try {
      const res = await authFetch('/api/admin/logs');
      const data = await res.json();
      setLogs(Array.isArray(data) ? data : []);
    } catch {}
  };

  const fetchBotsData = async () => {
    if (role !== 'SUPER_ADMIN') return;
    try {
      const res = await authFetch('/api/admin/bots');
      setBotsData(await res.json());
    } catch {}
  };

  useEffect(() => {
    if (token) {
      if (activeTab === 'dashboard') {
        fetchAnalytics();
        fetchPendingTxs();
      }
      if (activeTab === 'transactions') fetchAllTxs();
      if (activeTab === 'users') searchUsers(searchQuery);
      if (activeTab === 'config') fetchSettings();
      if (activeTab === 'staff') fetchStaff();
      if (activeTab === 'logs') fetchLogs();
      if (activeTab === 'games') fetchBotsData();
    }
  }, [token, activeTab, txFilter, timeFilter]);

  // Periodic polling for games tab
  useEffect(() => {
    if (token && activeTab === 'games' && role === 'SUPER_ADMIN') {
      const interval = setInterval(fetchBotsData, 2000);
      return () => clearInterval(interval);
    }
  }, [token, activeTab, role]);

  // --- Handlers ---
  const handleTxAction = async (id: number, action: 'approve' | 'reject') => {
    if (!confirm(`Are you sure you want to ${action} this transaction?`)) return;
    try {
      const res = await authFetch(`/api/admin/transactions/${id}/${action}`, { method: 'POST' });
      if (res.ok) {
        showToast(`Transaction ${action}d successfully`);
        fetchPendingTxs();
        if (activeTab === 'transactions') fetchAllTxs();
      } else {
        const data = await res.json();
        showToast(data.error || `Error: ${data.error}`, 'error');
      }
    } catch (e) {
      showToast('Network error', 'error');
    }
  };

  const handleAdjustBalance = async (id: number, amount: number) => {
    try {
      const res = await authFetch(`/api/admin/users/${id}/adjust-balance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount })
      });
      if (res.ok) {
        showToast(`Balance adjusted by ${amount}`);
        searchUsers(searchQuery);
      }
    } catch (e) { }
  };

  const handleToggleBan = async (id: number) => {
    if (!confirm('Toggle ban for this user?')) return;
    try {
      const res = await authFetch(`/api/admin/users/${id}/toggle-ban`, { method: 'POST' });
      if (res.ok) {
        showToast('User ban status updated');
        searchUsers(searchQuery);
      }
    } catch (e) { }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await authFetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      if (res.ok) {
        showToast('Settings saved successfully!');
      } else {
        showToast('Failed to save settings', 'error');
      }
    } catch (e) {
      showToast('Network error', 'error');
    }
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await authFetch('/api/admin/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: newStaffUser, password: newStaffPass, role: 'STAFF' })
      });
      if (res.ok) {
        showToast('Staff created successfully');
        setNewStaffUser('');
        setNewStaffPass('');
        fetchStaff();
      } else {
        showToast('Failed to create staff', 'error');
      }
    } catch (e) {
      showToast('Network error', 'error');
    }
  };

  const handleDeleteStaff = async (id: number) => {
    if (!confirm('Delete this admin?')) return;
    try {
      const res = await authFetch(`/api/admin/staff/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Staff deleted');
        fetchStaff();
      }
    } catch (e) { }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await authFetch('/api/admin/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldPassword, newPassword })
      });
      if (res.ok) {
        showToast('Password updated');
        setOldPassword('');
        setNewPassword('');
      } else {
        const d = await res.json();
        showToast(d.error || 'Failed to change password', 'error');
      }
    } catch (e) {
      showToast('Network error', 'error');
    }
  };

  const exportCSV = () => {
    if (!allTxs.length) return showToast('No transactions to export', 'error');
    
    const headers = ['ID', 'Type', 'Amount', 'Status', 'Method', 'Reference', 'User', 'Phone', 'Date'];
    const rows = allTxs.map(tx => [
      tx.id, tx.type, tx.amount, tx.status, tx.method || 'N/A', tx.reference || 'N/A', 
      `${tx.user?.firstName || ''} (@${tx.user?.username || ''})`,
      tx.user?.phone || 'N/A',
      new Date(tx.createdAt).toLocaleString()
    ]);
    
    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n" 
      + rows.map(e => e.join(",")).join("\n");
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `transactions_export_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Export downloaded successfully');
  };

  // --- Bot Handlers ---
  const handleGlobalBotUpdate = async (updates: any) => {
    try {
      const res = await authFetch('/api/admin/bots/global', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (res.ok) {
        showToast('Global bot settings updated');
        fetchBotsData();
      }
    } catch (e) {}
  };

  const handleRoomOverride = async (roomId: string, overrides: any, msg?: string) => {
    try {
      const res = await authFetch(`/api/admin/bots/room/${roomId}/override`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(overrides)
      });
      if (res.ok) {
        showToast(msg || `Override queued for ${roomId}`);
        fetchBotsData();
      }
    } catch (e) {}
  };

  // --- UI Renders ---
  if (!token) {
    return (
      <div className="admin-login-container">
        <div className="admin-ambient-bg">
          <div className="admin-ambient-blob-1" />
          <div className="admin-ambient-blob-2" />
        </div>

        <button 
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} 
          className="admin-theme-toggle"
        >
          {theme === 'dark' ? <Sun size={20} color="#f59e0b" /> : <Moon size={20} color="#1e293b" />}
        </button>

        <div className="admin-login-card">
          <div className="admin-login-logo admin-heading-font" style={{background: 'linear-gradient(135deg, #f59e0b, #d97706)'}}>👑</div>
          <h1 className="admin-title">Nexus Administration</h1>
          <p className="admin-subtitle" style={{marginBottom: '2rem'}}>
            Master Account & Tier 2 Staff Authentication
          </p>
          
          {error && <div className="admin-error-msg">{error}</div>}
          
          <form onSubmit={handleLogin}>
            <div className="admin-form-group">
              <label className="admin-label">Username</label>
              <input 
                type="text" 
                placeholder="Enter master or staff username" 
                value={username} 
                onChange={e => setUsername(e.target.value)}
                className="admin-input"
              />
            </div>
            <div className="admin-form-group">
              <label className="admin-label">Password</label>
              <input 
                type="password" 
                placeholder="Enter your password" 
                value={password} 
                onChange={e => setPassword(e.target.value)}
                className="admin-input"
              />
            </div>
            <button type="submit" className="admin-btn">
              Authenticate
            </button>
          </form>
        </div>
      </div>
    );
  }

  const navItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Overview' },
    { id: 'transactions', icon: Wallet, label: 'Ledger' },
    { id: 'users', icon: Users, label: 'Directory' },
  ];
  if (role === 'SUPER_ADMIN') {
    navItems.push({ id: 'games', icon: LayoutDashboard, label: 'Live Games & Bots' });
    navItems.push({ id: 'config', icon: Settings, label: 'System Config' });
    navItems.push({ id: 'staff', icon: Shield, label: 'Staff Mgmt' });
    navItems.push({ id: 'logs', icon: ScrollText, label: 'Audit Log' });
  }
  navItems.push({ id: 'profile', icon: User, label: 'My Profile' });

  return (
    <div className="admin-app-wrapper">
      <div className="admin-ambient-bg">
        <div className="admin-ambient-blob-1" />
        <div className="admin-ambient-blob-2" />
      </div>

      {toast && (
        <div className={`admin-toast ${toast.type === 'success' ? 'admin-toast-success' : 'admin-toast-error'}`}>
          {toast.type === 'success' ? <CheckCircle size={24} color="var(--admin-success)" /> : <XCircle size={24} color="var(--admin-danger)" />}
          <span style={{fontWeight: 600}}>{toast.msg}</span>
        </div>
      )}

      {/* Sidebar */}
      <div className="admin-sidebar">
        <div className="admin-brand">
          <div className="admin-brand-logo admin-heading-font">ፌ</div>
          <h1 className="admin-brand-name">Nexus</h1>
        </div>
        
        <nav className="admin-nav">
          {navItems.map(tab => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id as AdminTab)}
                className={`admin-nav-item ${isActive ? 'active' : ''}`}
              >
                <Icon size={20} />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </nav>
        
        <div style={{marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--admin-surface-border)'}}>
          <div style={{display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', padding: '0.75rem', background: 'var(--admin-bg)', borderRadius: '0.75rem', border: '1px solid var(--admin-surface-border)'}}>
            <div style={{width: 38, height: 38, borderRadius: '50%', background: role === 'SUPER_ADMIN' ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'linear-gradient(135deg, var(--admin-primary), #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: '1rem', flexShrink: 0}}>
              {role === 'SUPER_ADMIN' ? '👑' : username[0]?.toUpperCase()}
            </div>
            <div style={{overflow: 'hidden'}}>
              <div style={{fontWeight: 700, fontSize: '0.875rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>{username}</div>
              <div style={{fontSize: '0.7rem', color: role === 'SUPER_ADMIN' ? '#f59e0b' : 'var(--admin-primary)', fontWeight: 600}}>{role === 'SUPER_ADMIN' ? '👑 Master Account' : '⚡ Tier 2 Staff'}</div>
            </div>
          </div>
          <button onClick={handleLogout} className="admin-nav-item" style={{color: 'var(--admin-danger)', width: '100%'}}>
            <LogOut size={20} />
            Terminate Session
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="admin-main">
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem'}}>
          <header>
            <h2 className="admin-title" style={{textTransform: 'capitalize'}}>{activeTab}</h2>
          </header>

          <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
            <button 
              onClick={() => setHideSensitiveData(!hideSensitiveData)}
              title={hideSensitiveData ? 'Show sensitive numbers' : 'Hide sensitive numbers'}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0.5rem',
                borderRadius: '8px',
                border: '1px solid var(--admin-surface-border)',
                background: 'var(--admin-surface)',
                color: 'var(--admin-text)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--admin-surface-hover)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--admin-surface)'; }}
            >
              {hideSensitiveData ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
            <button 
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} 
              className="admin-theme-toggle"
              style={{position: 'static'}}
              title="Toggle theme"
            >
              {theme === 'dark' ? <Sun size={20} color="#f59e0b" /> : <Moon size={20} color="#1e293b" />}
            </button>
            <button
              onClick={handleLogout}
              title="Terminate Session"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                border: '1px solid var(--admin-danger)',
                background: 'transparent',
                color: 'var(--admin-danger)',
                cursor: 'pointer',
                fontSize: '0.8rem',
                fontWeight: 700,
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.1)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>
        </div>
        
        {/* DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div>
            <div className="admin-flex admin-flex-between admin-align-center" style={{marginBottom: '1.5rem'}}>
              <h3 style={{margin: 0}}>Financial Overview</h3>
              <div className="admin-flex admin-gap-2">
                {['TODAY', 'YESTERDAY', 'THIS_WEEK', 'THIS_MONTH'].map(filter => (
                  <button 
                    key={filter} 
                    onClick={() => setTimeFilter(filter)}
                    className="admin-btn"
                    style={{
                      background: timeFilter === filter ? 'var(--admin-primary)' : 'transparent',
                      color: timeFilter === filter ? 'white' : 'var(--admin-text)',
                      border: `1px solid ${timeFilter === filter ? 'transparent' : 'var(--admin-surface-border)'}`,
                      padding: '0.5rem 1rem',
                      fontSize: '0.875rem',
                      width: 'auto'
                    }}
                  >
                    {filter.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            {analytics && (
              <>
                <div className="admin-grid-4">
                  <div className="admin-stat-card">
                    <p className="admin-stat-label">Net Profit (20% House Cut)</p>
                    <p className="admin-stat-value" style={{color: 'var(--admin-success)'}}>{analytics.netProfit} ETB</p>
                  </div>
                  <div className="admin-stat-card">
                    <p className="admin-stat-label">Escrow (Unpaid Winnings / User Balances)</p>
                    <p className="admin-stat-value" style={{color: '#a855f7'}}>{analytics.totalUserBalances} ETB</p>
                  </div>
                  <div className="admin-stat-card">
                    <p className="admin-stat-label">Deposits ({timeFilter.replace('_', ' ')})</p>
                    <p className="admin-stat-value" style={{color: 'var(--admin-primary)'}}>{analytics.periodDeposits} ETB</p>
                  </div>
                  <div className="admin-stat-card">
                    <p className="admin-stat-label">Total Users</p>
                    <p className="admin-stat-value" style={{color: 'var(--admin-warning)'}}>{analytics.totalUsers}</p>
                  </div>
                </div>

                <div className="admin-panel">
                  <h3 className="admin-panel-title">Revenue & Growth Trend (Last 7 Days)</h3>
                  <div style={{height: 300, width: '100%'}}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={analytics.chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--admin-surface-border)" />
                        <XAxis dataKey="date" stroke="var(--admin-text-muted)" />
                        <YAxis yAxisId="left" stroke="var(--admin-success)" />
                        <YAxis yAxisId="right" orientation="right" stroke="var(--admin-primary)" />
                        <Tooltip contentStyle={{background: 'var(--admin-surface)', border: '1px solid var(--admin-surface-border)', borderRadius: '8px'}} />
                        <Line yAxisId="left" type="monotone" dataKey="revenue" stroke="var(--admin-success)" strokeWidth={3} name="Revenue (ETB)" />
                        <Line yAxisId="right" type="monotone" dataKey="users" stroke="var(--admin-primary)" strokeWidth={3} name="New Users" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Room Breakdown */}
                {analytics.roomBreakdown && (
                  <div className="admin-panel">
                    <h3 className="admin-panel-title">Platform Profit by Room</h3>
                    <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem'}}>
                      {Object.entries(analytics.roomBreakdown).map(([roomId, data]: [string, any]) => (
                        <div key={roomId} style={{
                          padding: '1rem',
                          background: 'var(--admin-surface-hover)',
                          borderRadius: '8px',
                          border: '1px solid var(--admin-surface-border)'
                        }}>
                          <div style={{fontSize: '0.75rem', color: 'var(--admin-text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem'}}>
                            {roomId.replace('room-', 'Room ')} ({data.entryFee} ETB)
                          </div>
                          <div style={{fontSize: '1.5rem', fontWeight: 800, color: 'var(--admin-success)'}}>
                            {data.platformProfit} ETB
                          </div>
                          <div style={{fontSize: '0.75rem', color: 'var(--admin-text-muted)', marginTop: '0.25rem'}}>
                            House Pot: {data.housePot} ETB
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            <div className="admin-grid-2">
              {/* Pending Deposits */}
              <div className="admin-panel">
                <h3 className="admin-panel-title">
                  <div style={{width: 12, height: 12, borderRadius: '50%', background: 'var(--admin-success)', boxShadow: '0 0 10px var(--admin-success)'}} />
                  Pending Deposits
                </h3>
                <div className="admin-list">
                  {pendingTxs.filter(t => t.type === 'DEPOSIT').length === 0 ? (
                    <div style={{padding: '3rem', textAlign: 'center', color: 'var(--admin-text-muted)'}}>
                      <CheckCircle size={48} style={{opacity: 0.2, marginBottom: '1rem'}} />
                      <p>All caught up!</p>
                    </div>
                  ) : (
                    pendingTxs.filter(t => t.type === 'DEPOSIT').map(tx => (
                      <div key={tx.id} className="admin-list-item">
                        <div className="admin-list-header">
                          <div>
                            <div style={{fontWeight: 800, fontSize: '1.125rem'}}>{tx.user.firstName}</div>
                            <div style={{fontSize: '0.875rem', color: 'var(--admin-text-muted)'}}>@{tx.user.username}</div>
                          </div>
                          <span className="admin-badge admin-badge-success">+{tx.amount} ETB</span>
                        </div>
                        <div style={{fontSize: '0.875rem', padding: '0.75rem', borderRadius: '0.5rem', background: 'rgba(0,0,0,0.1)', fontFamily: 'monospace'}}>
                          {tx.method}: <span style={{color: 'var(--admin-success)', fontWeight: 700}}>{tx.reference}</span>
                        </div>
                        <div className="admin-actions">
                          {role === 'SUPER_ADMIN' ? (
                            <>
                              <button onClick={() => handleTxAction(tx.id, 'approve')} className="admin-btn-sm admin-btn-success" style={{flex: 1}}>Approve</button>
                              <button onClick={() => handleTxAction(tx.id, 'reject')} className="admin-btn-sm admin-btn-danger" style={{flex: 1}}>Reject</button>
                            </>
                          ) : (
                            <span style={{fontSize: '0.75rem', color: 'var(--admin-text-muted)'}}>View Only</span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Pending Withdrawals */}
              <div className="admin-panel">
                <h3 className="admin-panel-title">
                  <div style={{width: 12, height: 12, borderRadius: '50%', background: 'var(--admin-warning)', boxShadow: '0 0 10px var(--admin-warning)'}} />
                  Pending Withdrawals
                </h3>
                <div className="admin-list">
                  {pendingTxs.filter(t => t.type === 'WITHDRAWAL').length === 0 ? (
                    <div style={{padding: '3rem', textAlign: 'center', color: 'var(--admin-text-muted)'}}>
                      <CheckCircle size={48} style={{opacity: 0.2, marginBottom: '1rem'}} />
                      <p>All caught up!</p>
                    </div>
                  ) : (
                    pendingTxs.filter(t => t.type === 'WITHDRAWAL').map(tx => {
                      const isOverdrawn = tx.amount > tx.user.balance;
                      return (
                        <div key={tx.id} className="admin-list-item" style={isOverdrawn ? {borderColor: 'var(--admin-warning)'} : {}}>
                          <div className="admin-list-header">
                            <div>
                              <div style={{fontWeight: 800, fontSize: '1.125rem'}}>{tx.user.firstName}</div>
                              <div style={{fontSize: '0.875rem', color: 'var(--admin-text-muted)'}}>Bal: <span style={isOverdrawn ? {color: 'var(--admin-warning)', fontWeight: 700} : {}}>{tx.user.balance} ETB</span></div>
                            </div>
                            <span className="admin-badge admin-badge-warning">-{tx.amount} ETB</span>
                          </div>
                          <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', padding: '0.75rem', borderRadius: '0.5rem', background: 'rgba(0,0,0,0.1)', fontFamily: 'monospace'}}>
                            <span>Phone: <span style={{color: 'var(--admin-warning)', fontWeight: 700}}>{tx.reference}</span></span>
                            <span>Games: {tx.user.totalGames}</span>
                          </div>
                          {isOverdrawn && <p style={{fontSize: '0.875rem', color: 'var(--admin-warning)', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem'}}><XCircle size={16}/> Insufficient funds</p>}
                          <div className="admin-actions">
                            {role === 'SUPER_ADMIN' ? (
                              <>
                                <button onClick={() => handleTxAction(tx.id, 'approve')} disabled={isOverdrawn} className="admin-btn-sm admin-btn-success" style={{flex: 1, opacity: isOverdrawn ? 0.3 : 1}}>Approve</button>
                                <button onClick={() => handleTxAction(tx.id, 'reject')} className="admin-btn-sm admin-btn-danger" style={{flex: 1}}>Reject</button>
                              </>
                            ) : (
                              <span style={{fontSize: '0.75rem', color: 'var(--admin-text-muted)'}}>View Only</span>
                            )}
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TRANSACTIONS */}
        {activeTab === 'transactions' && (
          <div>
            <div className="admin-panel admin-flex admin-flex-between admin-align-center" style={{padding: '1rem 1.5rem', position: 'sticky', top: '2rem', zIndex: 20}}>
              <div className="admin-search-bar" style={{margin: 0, flex: 1}}>
                <div className="admin-search-input-wrapper">
                  <Search size={20} />
                  <input 
                    type="text" 
                    placeholder="Search by user, ID, phone..." 
                    value={txSearchQuery}
                    onChange={e => setTxSearchQuery(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && fetchAllTxs()}
                    className="admin-input"
                  />
                </div>
                <div className="admin-flex admin-gap-2">
                  <select 
                    value={txFilter.type} 
                    onChange={e => setTxFilter({...txFilter, type: e.target.value})}
                    className="admin-input"
                    style={{width: 'auto'}}
                  >
                    <option value="ALL">All Types</option>
                    <option value="DEPOSIT">Deposits</option>
                    <option value="WITHDRAWAL">Withdrawals</option>
                  </select>
                  <select 
                    value={txFilter.status} 
                    onChange={e => setTxFilter({...txFilter, status: e.target.value})}
                    className="admin-input"
                    style={{width: 'auto'}}
                  >
                    <option value="ALL">All Status</option>
                    <option value="PENDING">Pending</option>
                    <option value="APPROVED">Approved</option>
                    <option value="REJECTED">Rejected</option>
                  </select>
                  <button onClick={fetchAllTxs} className="admin-btn" style={{width: 'auto', padding: '0.5rem 1rem'}}>
                    <Filter size={20} />
                  </button>
                  <button onClick={exportCSV} className="admin-btn" style={{width: 'auto', padding: '0.5rem 1.5rem', marginLeft: '1rem', background: '#10b981'}}>
                    <Download size={20} /> Export
                  </button>
                </div>
              </div>
            </div>

            <div className="admin-panel admin-table-wrapper" style={{padding: 0}}>
              <table className="admin-table">
                <thead style={{background: 'rgba(0,0,0,0.02)'}}>
                  <tr>
                    <th>Date</th>
                    <th>User</th>
                    <th>Type</th>
                    <th>Amount</th>
                    <th>Method/Ref</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {allTxs.map(tx => (
                    <tr key={tx.id}>
                      <td style={{fontSize: '0.875rem', color: 'var(--admin-text-muted)'}}>{new Date(tx.createdAt).toLocaleString()}</td>
                      <td>
                        <div style={{fontWeight: 700}}>{tx.user?.firstName}</div>
                        <div style={{fontSize: '0.75rem', color: 'var(--admin-text-muted)'}}>@{tx.user?.username} • Phone: {tx.user?.phone || 'N/A'}</div>
                      </td>
                      <td style={{fontWeight: 700}}>
                        {tx.type === 'DEPOSIT' 
                          ? <span style={{color: 'var(--admin-success)', display: 'flex', alignItems: 'center', gap: '0.5rem'}}><div style={{width: 8, height: 8, borderRadius: '50%', background: 'currentColor'}}/> Deposit</span> 
                          : <span style={{color: 'var(--admin-warning)', display: 'flex', alignItems: 'center', gap: '0.5rem'}}><div style={{width: 8, height: 8, borderRadius: '50%', background: 'currentColor'}}/> Withdraw</span>}
                      </td>
                      <td className="admin-heading-font" style={{fontSize: '1.25rem'}}>{tx.amount} ETB</td>
                      <td style={{fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--admin-text-muted)'}}>
                        {tx.method || 'N/A'}<br/>
                        <span style={{opacity: 0.7}}>{tx.reference}</span>
                      </td>
                      <td>
                        <span className={`admin-badge ${
                          tx.status === 'APPROVED' ? 'admin-badge-success' : 
                          tx.status === 'REJECTED' ? 'admin-badge-danger' : 
                          'admin-badge-warning'
                        }`}>
                          {tx.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {allTxs.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{padding: '3rem', textAlign: 'center', color: 'var(--admin-text-muted)'}}>No transactions found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* USERS - Compact Directory */}
        {activeTab === 'users' && (
          <div>
            <div className="admin-panel admin-flex admin-gap-4" style={{padding: '1.5rem', position: 'sticky', top: '2rem', zIndex: 20}}>
              <div className="admin-search-input-wrapper">
                <Search size={20} />
                <input 
                  type="text" 
                  placeholder="Search username, ID, name, phone..." 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && searchUsers(searchQuery)}
                  className="admin-input"
                />
              </div>
              <button onClick={() => searchUsers(searchQuery)} className="admin-btn" style={{width: 'auto', padding: '0 2rem'}}>Search</button>
            </div>
            
            <div className="admin-panel admin-table-wrapper" style={{padding: 0}}>
              <table className="admin-table">
                <thead style={{background: 'rgba(0,0,0,0.02)'}}>
                  <tr>
                    <th>User</th>
                    <th>Contact</th>
                    <th>Balance</th>
                    <th>Games</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} style={{opacity: u.isBanned ? 0.6 : 1}}>
                      <td>
                        <div className="admin-flex admin-align-center admin-gap-4">
                          <div style={{width: 36, height: 36, borderRadius: 8, background: 'var(--admin-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold'}}>{u.firstName?.charAt(0) || '?'}</div>
                          <div>
                            <div style={{fontWeight: 700}}>{u.firstName} {u.lastName}</div>
                            <div style={{fontSize: '0.75rem', color: 'var(--admin-text-muted)'}}>@{u.username} • ID: {u.telegramId}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{fontSize: '0.875rem'}}>{u.phone || 'N/A'}</td>
                      <td className="admin-heading-font" style={{color: 'var(--admin-success)'}}>{u.balance} ETB</td>
                      <td style={{fontWeight: 700}}>{u.totalGames}</td>
                      <td>
                        {u.isBanned ? <span className="admin-badge admin-badge-danger">Suspended</span> : <span className="admin-badge admin-badge-success">Active</span>}
                      </td>
                      <td>
                        <div className="admin-flex admin-gap-2">
                          <button onClick={() => handleAdjustBalance(u.id, 50)} className="admin-btn-sm admin-btn-outline" style={{color: 'var(--admin-success)', borderColor: 'var(--admin-success)'}}>+50</button>
                          <button onClick={() => handleAdjustBalance(u.id, -50)} className="admin-btn-sm admin-btn-outline" style={{color: 'var(--admin-warning)', borderColor: 'var(--admin-warning)'}}>-50</button>
                          <button onClick={() => handleToggleBan(u.id)} className="admin-btn-sm admin-btn-outline" style={{color: u.isBanned ? 'var(--admin-success)' : 'var(--admin-danger)'}}>
                            {u.isBanned ? 'Unban' : 'Ban'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{padding: '3rem', textAlign: 'center', color: 'var(--admin-text-muted)'}}>No users found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* GAMES & BOTS MANAGEMENT */}
        {activeTab === 'games' && role === 'SUPER_ADMIN' && botsData && (
          <div className="admin-grid-1" style={{gap: '1.5rem'}}>
            <div className="admin-panel admin-flex admin-flex-between admin-align-center" style={{background: 'linear-gradient(135deg, rgba(245,158,11,0.1), rgba(217,119,6,0.1))', borderColor: 'var(--admin-warning)'}}>
              <div>
                <h3 className="admin-panel-title" style={{color: 'var(--admin-warning)', marginBottom: '0.5rem'}}>Global Engine Controls</h3>
                <p style={{fontSize: '0.875rem', color: 'var(--admin-text-muted)'}}>Manage the global bot steering engine.</p>
              </div>
              <div className="admin-flex admin-gap-4">
                <div style={{display: 'flex', flexDirection: 'column', gap: '0.5rem'}}>
                  <label style={{fontSize: '0.75rem', fontWeight: 700}}>Enable All Bots</label>
                  <label className="toggle-switch">
                    <input 
                      type="checkbox" 
                      checked={botsData.global.globalBotsEnabled} 
                      onChange={e => handleGlobalBotUpdate({ enabled: e.target.checked })} 
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
                <div style={{display: 'flex', flexDirection: 'column', gap: '0.5rem'}}>
                  <label style={{fontSize: '0.75rem', fontWeight: 700}}>Default Steering (65%)</label>
                  <input 
                    type="number" 
                    value={botsData.global.globalSteeringRatio} 
                    onChange={e => handleGlobalBotUpdate({ steeringRatio: Number(e.target.value) })}
                    className="admin-input" 
                    style={{width: '100px'}}
                  />
                </div>
                <div style={{display: 'flex', flexDirection: 'column', gap: '0.5rem'}}>
                  <label style={{fontSize: '0.75rem', fontWeight: 700}}>Emergency</label>
                  <button 
                    onClick={() => { if(confirm('STOP all games and reset rooms?')) handleGlobalBotUpdate({ stopGames: true }) }} 
                    className="admin-btn-sm admin-btn-danger"
                  >
                    STOP GAMES
                  </button>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
              {botsData.rooms.map((room: any) => (
                <button 
                  key={room.id}
                  onClick={() => setSelectedRoomId(room.id)}
                  style={{
                    padding: '0.75rem 2rem',
                    borderRadius: '8px',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    border: (!selectedRoomId ? botsData.rooms[0].id === room.id : selectedRoomId === room.id) ? '1px solid var(--admin-primary)' : '1px solid var(--admin-surface-border)',
                    background: (!selectedRoomId ? botsData.rooms[0].id === room.id : selectedRoomId === room.id) ? 'var(--admin-primary)' : 'var(--admin-surface)',
                    color: (!selectedRoomId ? botsData.rooms[0].id === room.id : selectedRoomId === room.id) ? 'white' : 'var(--admin-text-muted)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: (!selectedRoomId ? botsData.rooms[0].id === room.id : selectedRoomId === room.id) ? '0 4px 12px rgba(59, 130, 246, 0.3)' : 'none',
                    flex: '1 1 auto',
                    textAlign: 'center'
                  }}
                >
                  {room.id.replace('room-', 'Room ')}
                </button>
              ))}
            </div>

            <div style={{maxWidth: '800px', margin: '0 auto', width: '100%'}}>
              {botsData.rooms
                .filter((r: any) => (!selectedRoomId && r.id === botsData.rooms[0].id) || r.id === selectedRoomId)
                .map((room: any) => (
                  <RoomAdminCard key={room.id} room={room} onOverride={handleRoomOverride} hideSensitiveData={hideSensitiveData} />
                ))}
            </div>
          </div>
        )}
        {activeTab === 'staff' && role === 'SUPER_ADMIN' && (
          <div className="admin-grid-2">
            <div className="admin-panel">
              <h3 className="admin-panel-title">Add New Staff</h3>
              <form onSubmit={handleCreateStaff}>
                <div className="admin-form-group">
                  <label className="admin-label">Username</label>
                  <input type="text" value={newStaffUser} onChange={e=>setNewStaffUser(e.target.value)} className="admin-input" required />
                </div>
                <div className="admin-form-group">
                  <label className="admin-label">Password</label>
                  <input type="password" value={newStaffPass} onChange={e=>setNewStaffPass(e.target.value)} className="admin-input" required />
                </div>
                <div className="admin-form-group">
                  <label className="admin-label">Role</label>
                  <div style={{padding: '0.875rem 1rem', background: 'var(--admin-bg)', border: '1px solid var(--admin-surface-border)', borderRadius: '0.75rem', fontSize: '0.875rem', color: 'var(--admin-primary)', fontWeight: 700}}>
                    ⚡ Tier 2 Staff — Full operational access, no admin management
                  </div>
                </div>
                <input type="hidden" value="STAFF" />
                <button type="submit" className="admin-btn">Create Account</button>
              </form>
            </div>

            <div className="admin-panel admin-table-wrapper" style={{padding: 0}}>
              <div style={{padding: '1.5rem', borderBottom: '1px solid var(--admin-surface-border)'}}>
                <h3 style={{margin: 0}}>Active Staff Members</h3>
              </div>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Username</th>
                    <th>Role</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {staff.map(s => (
                    <tr key={s.id}>
                      <td>
                        <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                          <div style={{width: 30, height: 30, borderRadius: '50%', background: s.role === 'SUPER_ADMIN' ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'linear-gradient(135deg, var(--admin-primary), #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: '0.875rem'}}>
                            {s.role === 'SUPER_ADMIN' ? '👑' : s.username[0]?.toUpperCase()}
                          </div>
                          <span style={{fontWeight: 700}}>{s.username}</span>
                        </div>
                      </td>
                      <td>
                        <span className={`admin-badge ${s.role === 'SUPER_ADMIN' ? 'admin-badge-warning' : 'admin-badge-success'}`}>
                          {s.role.replace('_', ' ')}
                        </span>
                      </td>
                      <td>
                        {s.username !== username && (
                          <button onClick={() => handleDeleteStaff(s.id)} className="admin-btn-sm admin-btn-danger">Revoke</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* CONFIGURATION */}
        {activeTab === 'config' && role === 'SUPER_ADMIN' && (
          <form onSubmit={handleSaveSettings}>
            <div className="admin-panel">
              <h3 className="admin-panel-title">
                <Wallet size={24} className="icon" />
                Payment Gateways
              </h3>
              
              <div className="admin-grid-2">
                <div style={{background: 'rgba(99, 102, 241, 0.05)', border: '1px solid rgba(99, 102, 241, 0.2)', padding: '1.5rem', borderRadius: '1rem'}}>
                  <h4 style={{margin: '0 0 1.5rem 0', color: 'var(--admin-primary)', fontSize: '1.125rem'}}>Telebirr Integration</h4>
                  <div className="admin-form-group">
                    <label className="admin-label">Phone Number</label>
                    <input type="text" value={settings.telebirr_phone || ''} onChange={e => setSettings({...settings, telebirr_phone: e.target.value})} className="admin-input" />
                  </div>
                  <div className="admin-form-group" style={{marginBottom: 0}}>
                    <label className="admin-label">Account Name</label>
                    <input type="text" value={settings.telebirr_name || ''} onChange={e => setSettings({...settings, telebirr_name: e.target.value})} className="admin-input" />
                  </div>
                </div>

                <div style={{background: 'rgba(168, 85, 247, 0.05)', border: '1px solid rgba(168, 85, 247, 0.2)', padding: '1.5rem', borderRadius: '1rem'}}>
                  <h4 style={{margin: '0 0 1.5rem 0', color: '#a855f7', fontSize: '1.125rem'}}>CBE Integration</h4>
                  <div className="admin-form-group">
                    <label className="admin-label">Account Number</label>
                    <input type="text" value={settings.cbe_account || ''} onChange={e => setSettings({...settings, cbe_account: e.target.value})} className="admin-input" />
                  </div>
                  <div className="admin-form-group" style={{marginBottom: 0}}>
                    <label className="admin-label">Account Name</label>
                    <input type="text" value={settings.cbe_name || ''} onChange={e => setSettings({...settings, cbe_name: e.target.value})} className="admin-input" />
                  </div>
                </div>
              </div>
            </div>

            <div className="admin-panel">
              <h3 className="admin-panel-title">
                <Settings size={24} className="icon" style={{color: 'var(--admin-text-muted)'}} />
                Game Rules & Economics
              </h3>
              
              <div style={{display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '1.5rem'}}>
                <div className="admin-form-group" style={{marginBottom: 0}}>
                  <label className="admin-label">Room 1 Entry (ETB)</label>
                  <input type="number" value={settings.room1_fee || ''} onChange={e => setSettings({...settings, room1_fee: e.target.value})} className="admin-input" />
                </div>
                <div className="admin-form-group" style={{marginBottom: 0}}>
                  <label className="admin-label">Room 2 Entry (ETB)</label>
                  <input type="number" value={settings.room2_fee || ''} onChange={e => setSettings({...settings, room2_fee: e.target.value})} className="admin-input" />
                </div>
                <div className="admin-form-group" style={{marginBottom: 0}}>
                  <label className="admin-label">Room 3 Entry (ETB)</label>
                  <input type="number" value={settings.room3_fee || ''} onChange={e => setSettings({...settings, room3_fee: e.target.value})} className="admin-input" />
                </div>
              </div>

              <div style={{display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--admin-surface-border)'}}>
                <div className="admin-form-group" style={{marginBottom: 0}}>
                  <label className="admin-label">House Cut (%)</label>
                  <input type="number" value={settings.house_cut || ''} onChange={e => setSettings({...settings, house_cut: e.target.value})} className="admin-input" />
                </div>
                <div className="admin-form-group" style={{marginBottom: 0}}>
                  <label className="admin-label">Minimum Deposit (ETB)</label>
                  <input type="number" value={settings.min_deposit || ''} onChange={e => setSettings({...settings, min_deposit: e.target.value})} className="admin-input" />
                </div>
              </div>
            </div>

            <button type="submit" className="admin-btn" style={{padding: '1.25rem', fontSize: '1.125rem'}}>
              <Save size={24} /> Deploy Configuration
            </button>
          </form>
        )}
        
        {/* PROFILE */}
        {activeTab === 'profile' && (
          <div style={{display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: 540}}>
            {/* Account Info */}
            <div className="admin-panel">
              <h3 className="admin-panel-title">
                <User size={20} style={{color: 'var(--admin-primary)'}} />
                Account Info
              </h3>
              <div style={{display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: 'var(--admin-bg)', borderRadius: '0.75rem', border: '1px solid var(--admin-surface-border)'}}>
                <div style={{width: 56, height: 56, borderRadius: '50%', background: role === 'SUPER_ADMIN' ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'linear-gradient(135deg, var(--admin-primary), var(--admin-success))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 800, color: 'white', flexShrink: 0}}>
                  {role === 'SUPER_ADMIN' ? '👑' : username[0]?.toUpperCase()}
                </div>
                <div>
                  <div style={{fontWeight: 700, fontSize: '1rem'}}>{username}</div>
                  <div style={{fontSize: '0.8rem', marginTop: 4}}>
                    <span style={{padding: '2px 10px', borderRadius: 100, background: role === 'SUPER_ADMIN' ? 'rgba(245,158,11,0.15)' : 'rgba(99,102,241,0.15)', color: role === 'SUPER_ADMIN' ? '#f59e0b' : '#818cf8', fontWeight: 700}}>
                      {role === 'SUPER_ADMIN' ? '👑 Master Account' : '⚡ Tier 2 Staff'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Change Password */}
            <div className="admin-panel">
              <h3 className="admin-panel-title" style={{marginBottom: '1.5rem'}}>🔐 Change Password</h3>
              <form onSubmit={handleChangePassword}>
                <div className="admin-form-group">
                  <label className="admin-label">Current Password</label>
                  <input type="password" value={oldPassword} onChange={e=>setOldPassword(e.target.value)} className="admin-input" required placeholder="Enter current password" />
                </div>
                <div className="admin-form-group">
                  <label className="admin-label">New Password</label>
                  <input type="password" value={newPassword} onChange={e=>setNewPassword(e.target.value)} className="admin-input" required placeholder="Enter new password (min 8 chars)" />
                </div>
                <button type="submit" className="admin-btn">Update Security Credentials</button>
              </form>
            </div>
          </div>
        )}

        {/* AUDIT LOG */}
        {activeTab === 'logs' && (
          <div>
            {/* Header */}
            <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem'}}>
              <div>
                <h3 style={{margin: 0, fontSize: '1.25rem', fontWeight: 700}}>Staff Activity Feed</h3>
                <p style={{margin: '4px 0 0', color: 'var(--admin-text-muted)', fontSize: '0.875rem'}}>Real-time log of every admin decision and action</p>
              </div>
              <button onClick={fetchLogs} className="admin-btn" style={{width: 'auto', padding: '0.5rem 1.25rem', fontSize: '0.875rem'}}>
                ↻ Refresh
              </button>
            </div>

            {/* Filter Bar */}
            <div style={{display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap'}}>
              {['ALL', 'Approved', 'Rejected', 'Adjusted Balance', 'Suspended', 'Unbanned', 'Settings', 'Staff'].map(f => (
                <button
                  key={f}
                  onClick={() => setLogsFilter(f)}
                  style={{
                    padding: '0.4rem 1rem',
                    borderRadius: 100,
                    border: '1px solid var(--admin-surface-border)',
                    background: logsFilter === f ? 'var(--admin-primary)' : 'var(--admin-surface)',
                    color: logsFilter === f ? 'white' : 'var(--admin-text-muted)',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    transition: 'all 0.15s'
                  }}
                >
                  {f}
                </button>
              ))}
            </div>

            {/* Log Table */}
            <div className="admin-panel" style={{padding: 0, overflow: 'hidden'}}>
              <div style={{overflowX: 'auto'}}>
                <table style={{width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem'}}>
                  <thead>
                    <tr style={{background: 'var(--admin-bg)', borderBottom: '1px solid var(--admin-surface-border)'}}>
                      <th style={{padding: '1rem 1.25rem', textAlign: 'left', fontWeight: 700, color: 'var(--admin-text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap'}}>Admin</th>
                      <th style={{padding: '1rem 1.25rem', textAlign: 'left', fontWeight: 700, color: 'var(--admin-text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em'}}>Action</th>
                      <th style={{padding: '1rem 1.25rem', textAlign: 'left', fontWeight: 700, color: 'var(--admin-text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em'}}>Target</th>
                      <th style={{padding: '1rem 1.25rem', textAlign: 'right', fontWeight: 700, color: 'var(--admin-text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap'}}>Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs
                      .filter(log => logsFilter === 'ALL' || log.action?.toLowerCase().includes(logsFilter.toLowerCase()))
                      .map((log) => {
                        const isApprove = log.action?.includes('Approved');
                        const isReject = log.action?.includes('Rejected');
                        const isSuspend = log.action?.includes('Suspended');
                        const isUnban = log.action?.includes('Unbanned');
                        const isSettings = log.action?.includes('Settings');
                        
                        let actionColor = 'var(--admin-text)';
                        let actionBg = 'transparent';
                        let actionIcon = '📋';
                        
                        if (isApprove) { actionColor = 'var(--admin-success)'; actionBg = 'rgba(16,185,129,0.1)'; actionIcon = '✅'; }
                        else if (isReject) { actionColor = 'var(--admin-danger)'; actionBg = 'rgba(239,68,68,0.1)'; actionIcon = '❌'; }
                        else if (isSuspend) { actionColor = 'var(--admin-warning)'; actionBg = 'rgba(245,158,11,0.1)'; actionIcon = '⛔'; }
                        else if (isUnban) { actionColor = '#818cf8'; actionBg = 'rgba(129,140,248,0.1)'; actionIcon = '✔️'; }
                        else if (isSettings) { actionColor = '#22d3ee'; actionBg = 'rgba(34,211,238,0.1)'; actionIcon = '⚙️'; }
                        
                        return (
                          <tr key={log.id} style={{borderBottom: '1px solid var(--admin-surface-border)', transition: 'background 0.15s'}}
                            onMouseEnter={e => (e.currentTarget.style.background = 'var(--admin-bg)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                          >
                            <td style={{padding: '0.875rem 1.25rem'}}>
                              <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                                <div style={{width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg, var(--admin-primary), var(--admin-success))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: '0.75rem', flexShrink: 0}}>
                                  {log.adminName?.[0]?.toUpperCase()}
                                </div>
                                <span style={{fontWeight: 600}}>{log.adminName}</span>
                              </div>
                            </td>
                            <td style={{padding: '0.875rem 1.25rem'}}>
                              <span style={{padding: '4px 10px', borderRadius: 100, background: actionBg, color: actionColor, fontWeight: 600, whiteSpace: 'nowrap'}}>
                                {actionIcon} {log.action}
                              </span>
                            </td>
                            <td style={{padding: '0.875rem 1.25rem', color: 'var(--admin-text-muted)', fontSize: '0.8rem', maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>
                              {log.target || '—'}
                            </td>
                            <td style={{padding: '0.875rem 1.25rem', textAlign: 'right', color: 'var(--admin-text-muted)', whiteSpace: 'nowrap', fontSize: '0.8rem'}}>
                              {new Date(log.createdAt).toLocaleString('en-GB', {dateStyle: 'medium', timeStyle: 'short'})}
                            </td>
                          </tr>
                        );
                      })
                    }
                    {logs.filter(log => logsFilter === 'ALL' || log.action?.toLowerCase().includes(logsFilter.toLowerCase())).length === 0 && (
                      <tr>
                        <td colSpan={4} style={{padding: '3rem', textAlign: 'center', color: 'var(--admin-text-muted)'}}>
                          <div style={{fontSize: '2rem', marginBottom: '0.5rem'}}>📋</div>
                          <div style={{fontWeight: 600}}>No log entries found</div>
                          <div style={{fontSize: '0.8rem', marginTop: '0.25rem'}}>Actions taken by staff will appear here</div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              
              {/* Stats footer */}
              <div style={{padding: '0.75rem 1.25rem', borderTop: '1px solid var(--admin-surface-border)', display: 'flex', gap: '1.5rem', background: 'var(--admin-bg)'}}>
                <span style={{fontSize: '0.8rem', color: 'var(--admin-text-muted)'}}>Total: <strong style={{color: 'var(--admin-text)'}}>{logs.length}</strong> entries</span>
                <span style={{fontSize: '0.8rem', color: 'var(--admin-success)'}}>✅ Approved: <strong>{logs.filter(l => l.action?.includes('Approved')).length}</strong></span>
                <span style={{fontSize: '0.8rem', color: 'var(--admin-danger)'}}>❌ Rejected: <strong>{logs.filter(l => l.action?.includes('Rejected')).length}</strong></span>
                <span style={{fontSize: '0.8rem', color: 'var(--admin-warning)'}}>⛔ Suspensions: <strong>{logs.filter(l => l.action?.includes('Suspended')).length}</strong></span>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

