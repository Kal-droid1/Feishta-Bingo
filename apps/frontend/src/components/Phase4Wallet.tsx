import { useState, useCallback } from 'react';
import type { User } from '../types';

interface Phase4WalletProps {
  user: User;
  onBack: () => void;
}

type Screen = 'wallet' | 'deposit' | 'withdraw';
type PayMethod = 'telebirr' | 'cbe';

interface PendingTransaction {
  id: number;
  type: 'DEPOSIT' | 'WITHDRAWAL';
  amount: number;
  method: 'TELEBIRR' | 'CBE';
  reference?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
}

interface TransactionHistory {
  id: number;
  type: 'DEPOSIT' | 'WITHDRAWAL';
  amount: number;
  method: 'TELEBIRR' | 'CBE';
  reference?: string;
  status: 'APPROVED' | 'REJECTED';
  createdAt: string;
}

const depositInfo = {
  telebirr: { phone: '0991538407', display: '0991 538 407', name: 'Kaleab Girma' },
  cbe:      { phone: '1000123456789', display: '1000 1234 56789', name: 'Kaleab Girma' },
};

/* ─── Shared micro-components ─── */

function LiveBadge() {
  return (
    <div className="wallet-live-badge">
      <span className="wallet-live-dot animate-pulse" />
      <span className="wallet-live-text">Live</span>
    </div>
  );
}

function BalancePill({ amount }: { amount: number }) {
  return (
    <div className="wallet-balance-pill">
      {amount} ETB
    </div>
  );
}

function TopBar({ title, onBack, showBadge, balance }: { title: string; onBack: () => void; showBadge?: boolean; balance?: number }) {
  return (
    <div className="wallet-topbar">
      <button onClick={onBack} className="wallet-back-btn">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="m15 18-6-6 6-6"/>
        </svg>
      </button>
      <span className="wallet-topbar-title">{title}</span>
      {showBadge && <><LiveBadge /><BalancePill amount={balance ?? 0} /></>}
    </div>
  );
}

function EmptyState({ icon, title, sub }: { icon: string; title: string; sub: string }) {
  return (
    <div className="wallet-empty-state">
      <span className="wallet-empty-icon">{icon}</span>
      <p className="wallet-empty-title">{title}</p>
      <p className="wallet-empty-sub">{sub}</p>
    </div>
  );
}

/* ─── WalletScreen ─── */
function WalletScreen({ balance, pendingTx, history, onDeposit, onWithdraw, onBack }: { balance: number; pendingTx: PendingTransaction | null; history: TransactionHistory[]; onDeposit: () => void; onWithdraw: () => void; onBack: () => void }) {
  return (
    <div className="wallet-screen flex flex-col h-full">
      {/* Top bar */}
      <div className="wallet-topbar">
        <button onClick={onBack} className="wallet-back-btn">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </button>
        <span className="text-xl">💰</span>
        <span className="wallet-topbar-title">Wallet</span>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 pb-[50vh]">
        {/* Balance Hero */}
        <div className="wallet-hero">
          <div className="wallet-hero-glow" />
          <p className="wallet-hero-label">Current Net Balance</p>
          <p className="wallet-hero-amount">
            {balance} <span className="wallet-hero-currency">ETB</span>
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="wallet-hero-box">
              <p className="wallet-box-val">{balance} ETB</p>
              <p className="wallet-box-label">Game Wallet</p>
              <p className="wallet-box-sub">Available for betting</p>
            </div>
            <div className="wallet-hero-box">
              <p className="wallet-box-val text-gold">0 ETB</p>
              <p className="wallet-box-label">Bonus Wallet</p>
              <p className="wallet-box-sub">Cannot withdraw</p>
            </div>
          </div>
        </div>

        {pendingTx ? (
          <div className="wallet-card border-gold">
            <span className="text-3xl mb-2 block text-center">⏳</span>
            <p className="text-sm font-bold text-center text-gold">Transaction Pending</p>
            <p className="text-xs mt-1 text-center text-muted">
              Your {pendingTx.type.toLowerCase()} of {pendingTx.amount} ETB is being reviewed by an admin.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <button onClick={onDeposit} className="wallet-action-btn bg-green">
              <div className="wallet-action-icon bg-green-dark">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12l7 7 7-7"/></svg>
              </div>
              <span className="wallet-action-label text-green-text">Deposit</span>
            </button>
            <button onClick={onWithdraw} className="wallet-action-btn bg-red">
              <div className="wallet-action-icon bg-red-dark">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
              </div>
              <span className="wallet-action-label text-red-text">Withdraw</span>
            </button>
          </div>
        )}

        {/* Transaction History */}
        <div>
          <p className="wallet-section-title">Transaction history</p>
          <div className="wallet-card">
            {history.length === 0 ? (
              <EmptyState icon="📋" title="No transactions yet" sub="Your history will appear here" />
            ) : (
              <div className="space-y-3">
                {history.map((tx: TransactionHistory) => (
                  <div key={tx.id} className="flex items-center justify-between py-2 border-b border-[#2d1624] last:border-0 last:pb-0">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${tx.type === 'DEPOSIT' ? 'bg-[var(--green-glow)] text-[var(--green)]' : 'bg-[var(--red-glow)] text-[var(--red)]'}`}>
                        {tx.type === 'DEPOSIT' ? '↓' : '↑'}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-[var(--text-main)] capitalize">{tx.type.toLowerCase()}</p>
                        <p className="text-xs text-[var(--text-muted)]">{new Date(tx.createdAt).toLocaleDateString()} • {tx.status}</p>
                      </div>
                    </div>
                    <div className={`font-bold ${tx.type === 'DEPOSIT' ? 'text-[var(--green)]' : 'text-[var(--text-main)]'}`}>
                      {tx.type === 'DEPOSIT' ? '+' : '-'}{tx.amount} ETB
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── DepositScreen ─── */
function DepositScreen({ user, balance, onBack, onSuccess, onError }: { user: User; balance: number; onBack: () => void; onSuccess: () => void; onError: (msg: string) => void }) {
  const [method, setMethod] = useState<PayMethod>('telebirr');
  const [amount, setAmount] = useState('');
  const [sms, setSms] = useState('');
  const [copied, setCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const info = depositInfo[method];

  const handleFocus = (e: React.FocusEvent<HTMLElement>) => {
    setTimeout(() => {
      e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 300);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(info.phone);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleConfirm = async () => {
    if (!amount.trim() || !sms.trim()) return;
    const numAmount = Number(amount);
    if (numAmount < 10) {
      onError('Minimum deposit is 10 ETB');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/wallet/deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegramId: user.telegramId,
          amount: numAmount,
          method: method.toUpperCase(),
          reference: sms.trim()
        })
      });
      const data = await res.json();
      if (res.ok) {
        onSuccess();
      } else {
        onError(data.error || 'Transaction failed');
      }
    } catch {
      onError('Network error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="wallet-screen flex flex-col h-full">
      <TopBar title="Deposit Money" onBack={onBack} showBadge balance={balance} />
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 pb-[50vh]">

        {/* Payment Method Toggle */}
        <div className="grid grid-cols-2 gap-3">
          {(['telebirr', 'cbe'] as PayMethod[]).map(m => {
            const selected = method === m;
            return (
              <button key={m} onClick={() => setMethod(m)} className={`wallet-method-btn ${selected ? 'selected' : ''}`}>
                <div className="wallet-method-icon">
                  <span className="text-lg">{m === 'telebirr' ? '📱' : '🏦'}</span>
                </div>
                <div className="text-left">
                  <p className="wallet-method-name">{m === 'telebirr' ? 'Telebirr' : 'CBE Birr'}</p>
                  <p className="wallet-method-sub">{selected ? 'Selected' : m === 'telebirr' ? 'Mobile money' : 'Bank transfer'}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Step 1 */}
        <div className="wallet-card border-green">
          <p className="wallet-step-title text-green">
            Step 1 — Send money to this {method === 'telebirr' ? 'Telebirr' : 'CBE Birr'} account
          </p>

          <div className="wallet-copy-box">
            <p className="wallet-copy-number">{info.display}</p>
            <button onClick={handleCopy} className={`wallet-copy-btn ${copied ? 'copied' : ''}`}>
              {copied ? '✓ Copied!' : 'Copy'}
            </button>
          </div>

          <p className="wallet-account-name">
            Account name: <span>{info.name}</span>
          </p>

          <div className="space-y-2">
            {['Send money to the number above', 'Copy the confirmation SMS you receive and paste it below'].map((s, i) => (
              <div key={i} className="wallet-instruction-row">
                <span className="text-green">→</span>
                <span>{i + 1}. {s}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Step 2 */}
        <div className="wallet-card">
          <p className="wallet-step-title">Step 2 — Paste and confirm</p>
          <input
            type="number"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            onFocus={handleFocus}
            placeholder="Amount (ETB)"
            className="wallet-input mb-2"
          />
          <textarea
            rows={3}
            value={sms}
            onChange={e => setSms(e.target.value)}
            onFocus={handleFocus}
            placeholder="Example: TXN12345678 or paste the full confirmation message..."
            className="wallet-input resize-none"
          />
          <button onClick={handleConfirm} disabled={!sms.trim() || !amount.trim() || isSubmitting} className="wallet-submit-btn bg-green">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            {isSubmitting ? 'Verifying...' : 'Confirm Deposit'}
          </button>
          <p className="wallet-support-text">
            For issues contact <span>@FeshtaBingoobot_support</span>
          </p>
        </div>
      </div>
    </div>
  );
}

/* ─── WithdrawScreen ─── */
function WithdrawScreen({ user, balance, totalGames, onBack, onSuccess, onError }: { user: User; balance: number; totalGames: number; onBack: () => void; onSuccess: () => void; onError: (msg: string) => void }) {
  const gamesNeeded = Math.max(0, 5 - totalGames);
  const progress = Math.min((totalGames / 5) * 100, 100);
  const [amount, setAmount] = useState('');
  const [phone, setPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFocus = (e: React.FocusEvent<HTMLElement>) => {
    setTimeout(() => {
      e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 300);
  };

  const handleWithdraw = async () => {
    if (!amount.trim() || !phone.trim() || totalGames < 5) return;
    const numAmount = Number(amount);
    
    if (numAmount < 50) {
      onError('Minimum withdrawal is 50 ETB');
      return;
    }
    if (numAmount > balance) {
      onError('Insufficient balance');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/wallet/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegramId: user.telegramId,
          amount: numAmount,
          reference: phone.trim()
        })
      });
      const data = await res.json();
      if (res.ok) {
        onSuccess();
      } else {
        onError(data.error || 'Transaction failed');
      }
    } catch {
      onError('Network error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="wallet-screen flex flex-col h-full">
      <TopBar title="Withdraw Money" onBack={onBack} showBadge balance={balance} />
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 pb-[50vh]">

        {/* Balance Hero */}
        <div className="wallet-hero hero-red">
          <p className="wallet-hero-label">Available Balance</p>
          <p className="wallet-hero-amount">
            {balance} <span className="wallet-hero-currency">ETB</span>
          </p>
        </div>

        {/* Warning Card */}
        <div className="wallet-card border-gold">
          <div className="flex items-start gap-2">
            <span className="text-base text-gold">⭐</span>
            <div>
              <p className="text-sm font-bold text-gold">Play 5 Bingo games before withdrawing</p>
              <p className="text-xs mt-1 leading-relaxed text-muted">
                Play at least 5 Bingo games before your balance can be withdrawn. Only {gamesNeeded} more!
              </p>
            </div>
          </div>
          <div className="wallet-progress-bg">
            <div className="wallet-progress-fill" style={{ width: `${Math.max(progress, 2)}%` }} />
          </div>
          <div className="flex justify-between">
            <span className="wallet-progress-label">{totalGames} of 5 games played</span>
            <span className="wallet-progress-label">{Math.round(progress)}%</span>
          </div>
        </div>

        {/* How It Works & Form */}
        <div className="wallet-card">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-gold">ℹ️</span>
            <p className="text-sm font-bold text-gold">Withdraw Details</p>
          </div>
          
          <input
            type="number"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            onFocus={handleFocus}
            placeholder="Amount (ETB) - Min 50"
            className="wallet-input mb-2"
            disabled={totalGames < 5}
          />
          <input
            type="tel"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            onFocus={handleFocus}
            placeholder="Destination Phone Number"
            className="wallet-input mb-4"
            disabled={totalGames < 5}
          />
          <button onClick={handleWithdraw} disabled={!amount.trim() || !phone.trim() || totalGames < 5 || isSubmitting} className="wallet-submit-btn bg-red">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
            {isSubmitting ? 'Processing...' : 'Confirm Withdrawal'}
          </button>

          <div className="wallet-limits border-top pt-3">
            <span className="text-xs font-bold text-muted">Min: <span className="text-main">50 ETB</span></span>
            <span className="text-muted">·</span>
            <span className="text-xs font-bold text-muted">Max: <span className="text-main">1,000 ETB</span></span>
          </div>
        </div>

        {/* Game History */}
        <div>
          <p className="wallet-section-title">Game history</p>
          <div className="wallet-card">
            <EmptyState icon="🎮" title="No games played yet" sub="Play 5 games to unlock withdrawals" />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Export ─── */
export function Phase4Wallet({ user, onBack }: Phase4WalletProps) {
  const [screen, setScreen] = useState<Screen>('wallet');
  const [balance, setBalance] = useState(user.balance || 0);
  const [totalGames, setTotalGames] = useState(0);
  const [pendingTx, setPendingTx] = useState<PendingTransaction | null>(null);
  const [history, setHistory] = useState<TransactionHistory[]>([]);
  const [toast, setToast] = useState<{msg: string, isError: boolean} | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchStatus = useCallback(async () => {
    try {
      const [res, settingsRes] = await Promise.all([
        fetch(`/api/wallet/${user.telegramId}/status`),
        fetch('/api/settings/public')
      ]);
      
      if (settingsRes.ok) {
        const settings = await settingsRes.json();
        depositInfo.telebirr.phone = settings.telebirr_phone || depositInfo.telebirr.phone;
        depositInfo.telebirr.display = settings.telebirr_phone || depositInfo.telebirr.phone;
        depositInfo.telebirr.name = settings.telebirr_name || depositInfo.telebirr.name;
        
        depositInfo.cbe.phone = settings.cbe_account || depositInfo.cbe.phone;
        depositInfo.cbe.display = settings.cbe_account || depositInfo.cbe.phone;
        depositInfo.cbe.name = settings.cbe_name || depositInfo.cbe.name;
      }

      if (res.ok) {
        const data = await res.json();
        setBalance(data.balance);
        setTotalGames(data.totalGames);
        setPendingTx(data.pendingTransaction);
        setHistory(data.transactionHistory || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [user.telegramId]);

  // Initial fetch on mount
  fetchStatus();

  const showToast = (msg: string, isError = false) => {
    setToast({msg, isError});
    setTimeout(() => setToast(null), 3000);
  };

  const handleSuccess = () => {
    showToast('✅ Request submitted — awaiting verification');
    setScreen('wallet');
    fetchStatus(); // Refresh to show pending state
  };

  if (isLoading) {
    return <div className="wallet-container flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="wallet-container h-full flex flex-col">
      {/* Toast */}
      {toast && (
        <div className={`wallet-toast ${toast.isError ? 'error' : 'success'}`}>
          {toast.msg}
        </div>
      )}

      {screen === 'wallet' && (
        <WalletScreen
          balance={balance}
          pendingTx={pendingTx}
          history={history}
          onDeposit={() => setScreen('deposit')}
          onWithdraw={() => setScreen('withdraw')}
          onBack={onBack}
        />
      )}
      {screen === 'deposit' && (
        <DepositScreen
          user={user}
          balance={balance}
          onBack={() => setScreen('wallet')}
          onSuccess={handleSuccess}
          onError={(m) => showToast(m, true)}
        />
      )}
      {screen === 'withdraw' && (
        <WithdrawScreen
          user={user}
          balance={balance}
          totalGames={totalGames}
          onBack={() => setScreen('wallet')}
          onSuccess={handleSuccess}
          onError={(m) => showToast(m, true)}
        />
      )}
    </div>
  );
}
