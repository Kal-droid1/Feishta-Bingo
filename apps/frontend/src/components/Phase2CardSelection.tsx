import { useState, useEffect, useRef } from 'react';
import type { Room, User } from '../types';

interface Phase2CardSelectionProps {
  room: Room;
  user: User;
  onJoinGame: (selectedCards: number[]) => void;
  onBackToLobby: () => void;
}

function mulberry32(a: number) {
  return function() {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function generateBingoCard(seed: number) {
  const rand = mulberry32(seed);
  const getUnique = (min: number, max: number, count: number) => {
    const nums = new Set<number>();
    while (nums.size < count) nums.add(Math.floor(rand() * (max - min + 1)) + min);
    return Array.from(nums);
  };
  return {
    B: getUnique(1, 15, 5),
    I: getUnique(16, 30, 5),
    N: getUnique(31, 45, 4),
    G: getUnique(46, 60, 5),
    O: getUnique(61, 75, 5),
  };
}

const ALL_CARDS = Array.from({ length: 400 }, (_, i) => i + 1);

export function Phase2CardSelection({ room, user, onJoinGame, onBackToLobby }: Phase2CardSelectionProps) {
  const myId = String(user.telegramId);

  // Global state exact mirrors from server (No local guessing to avoid flickering)
  const [allTaken, setAllTaken] = useState<number[]>([]);     // Includes EVERYONE's bought + clicked cards
  const [myReserved, setMyReserved] = useState<number[]>([]); // Cards I just clicked
  const [myBought, setMyBought] = useState<number[]>([]);     // Cards I successfully paid for
  
  const [timeLeft, setTimeLeft] = useState(45);
  const [prizePool, setPrizePool] = useState(0); 
  const [playersCount, setPlayersCount] = useState(0);
  const [seatsTaken, setSeatsTaken] = useState(0);
  const [, setCycleNumber] = useState(-1);

  const [previewCardId, setPreviewCardId] = useState<number | null>(null);
  const [isBuying, setIsBuying] = useState(false);
  const [roundEndMsg, setRoundEndMsg] = useState('');
  const [gameStatus, setGameStatus] = useState<'lobby' | 'game'>('lobby');
  
  // Optimistic UI lock to prevent double clicks during API call
  const [pendingAction, setPendingAction] = useState<number | null>(null);

  const hoverRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const myReservedRef = useRef<number[]>([]);
  
  // FIX 7: Track when user just clicked to prevent poll from overwriting optimistic update
  const justUpdatedRef = useRef<number>(0);
  const SKIP_POLL_AFTER_ACTION_MS = 500; // Ignore poll for 500ms after user action
  
  // Keep ref in sync with state for cleanup
  useEffect(() => {
    myReservedRef.current = myReserved;
  }, [myReserved]);

  // 1. Join room on mount
  useEffect(() => {
    fetch(`/api/rooms/${room.id}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fee: room.fee }),
    })
      .then(r => r.json())
      .then(data => {
        setTimeLeft(data.timeLeft ?? 45);
        setCycleNumber(data.cycleNumber ?? 0);
      })
      .catch(console.error);

    // On unmount, if I have reserved cards but didn't buy, release them
    return () => {
      // Use ref to get current value at unmount time
      myReservedRef.current.forEach(cardId => {
        fetch(`/api/rooms/${room.id}/deselect`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ telegramId: myId, cardId }),
        }).catch(() => {});
      });
    };
  }, [room.id, room.fee, myId]);

  // 2. Poll the absolute truth from the server every 1s
  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch(`/api/rooms/${room.id}/state?telegramId=${myId}`);
        if (!res.ok) return;
        const data = await res.json();

        const newCycle: number = data.cycleNumber ?? 0;

        // Detect round reset
        setCycleNumber(prev => {
          if (prev !== -1 && newCycle > prev) {
            setRoundEndMsg('🔄 New round starting! Select your cards.');
            setTimeout(() => setRoundEndMsg(''), 3000);
          }
          return newCycle;
        });

        // FIX 7: Don't overwrite optimistic updates if user just clicked (prevents flicker)
        const timeSinceLastAction = Date.now() - justUpdatedRef.current;
        const shouldSkipCardUpdate = timeSinceLastAction < SKIP_POLL_AFTER_ACTION_MS;
        
        // The server is the absolute source of truth for global state
        setAllTaken(data.allTaken || []);
        
        // Only update my cards if no recent user action (prevents flickering)
        if (!shouldSkipCardUpdate) {
          setMyReserved(data.myReserved || []);
          setMyBought(data.myBought || []);
        }
        
        // These stats instantly reflect every single click by any player globally
        setPrizePool(data.prizePool || 0);
        setPlayersCount(data.playersCount || 0);
        setSeatsTaken(data.seatsTaken || 0);
        setTimeLeft(data.timeLeft ?? 0);
        setGameStatus(data.status || 'lobby');

      } catch (_) {}
    };

    poll();
    const interval = setInterval(poll, 1000);
    return () => clearInterval(interval);
  }, [room.id, myId]);

  // 3. When timer hits 0 and I have bought cards → auto-enter game
  useEffect(() => {
    if (timeLeft === 0 && myBought.length > 0) {
      onJoinGame(myBought);
    }
  }, [timeLeft, myBought, onJoinGame]);

  // Handle Card Click (Instant Global Lock)
  const toggleCard = async (cardId: number) => {
    if (gameStatus === 'game') {
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('error');
      alert('A game is currently in progress! Please wait for the next round.');
      return;
    }
    
    if (pendingAction === cardId) return; // Prevent double clicks
    
    // If I already bought it, I can't undo it
    if (myBought.includes(cardId)) return;

    // If someone else took it (or reserved it)
    if (allTaken.includes(cardId) && !myReserved.includes(cardId)) {
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('error');
      return;
    }

    setPendingAction(cardId);
    // FIX 7: Mark that user just clicked to prevent poll from overwriting optimistic update
    justUpdatedRef.current = Date.now();

    if (myReserved.includes(cardId)) {
      // DESELECT
      // Optimistically remove from UI to feel instant
      setMyReserved(prev => prev.filter(c => c !== cardId));
      setAllTaken(prev => prev.filter(c => c !== cardId));
      
      try {
        await fetch(`/api/rooms/${room.id}/deselect`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ telegramId: myId, cardId }),
        });
      } catch (_) {}
    } else {
      // SELECT
      if (myReserved.length >= 2) {
        window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('warning');
        setPendingAction(null);
        return;
      }

      // Optimistically add to UI to feel instant
      setMyReserved(prev => [...prev, cardId]);
      setAllTaken(prev => [...prev, cardId]);
      // FIX 7: Mark that user just clicked (already set above, but refresh timestamp after optimistic update)
      justUpdatedRef.current = Date.now();
      window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light');

      try {
        const res = await fetch(`/api/rooms/${room.id}/select`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ telegramId: myId, cardId }),
        });
        if (!res.ok) {
          // Revert if someone beat us by a millisecond
          setMyReserved(prev => prev.filter(c => c !== cardId));
          const d = await res.json();
          alert(d.error || 'Card just taken by another player!');
        }
      } catch (_) {
        setMyReserved(prev => prev.filter(c => c !== cardId));
      }
    }
    
    setPendingAction(null);
  };

  // Confirm & Pay
  const handleBuy = async () => {
    if (myReserved.length === 0 || isBuying) return;
    setIsBuying(true);
    window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('heavy');

    try {
      const res = await fetch(`/api/rooms/${room.id}/buy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegramId: myId, cards: myReserved, fee: room.fee }),
      });
      const data = await res.json();

      if (res.ok) {
        // Navigate immediately!
        onJoinGame([...myBought, ...myReserved]);
      } else {
        alert(data.error || 'Failed to complete purchase.');
      }
    } catch (_) {
      alert('Network error. Please try again.');
    } finally {
      setIsBuying(false);
    }
  };

  // Hover preview
  const handlePointerEnter = (id: number) => {
    hoverRef.current = setTimeout(() => setPreviewCardId(id), 400);
  };
  const handlePointerLeave = () => {
    if (hoverRef.current) clearTimeout(hoverRef.current);
    setPreviewCardId(null);
  };

  const renderPreview = (id: number) => {
    const card = generateBingoCard(id);
    const cols = ['B', 'I', 'N', 'G', 'O'] as const;
    return (
      <div className="preview-tooltip">
        <div className="preview-header">CARD #{id.toString().padStart(3, '0')}</div>
        <div className="preview-grid">
          {cols.map(c => <div key={c} className="text-center font-bold text-[8px] text-white/50">{c}</div>)}
          {Array.from({ length: 5 }).map((_, row) =>
            cols.map(col => {
              if (col === 'N' && row === 2) return <div key={`${col}-${row}`} className="preview-cell preview-cell--free">FREE</div>;
              const nums = card[col];
              const idx = col === 'N' && row > 2 ? row - 1 : row;
              return <div key={`${col}-${row}`} className="preview-cell">{nums[idx]}</div>;
            })
          )}
        </div>
      </div>
    );
  };

  // Derived values
  const totalCost = myReserved.length * room.fee;
  const canAfford = user.balance >= totalCost;
  const availableSeats = 400 - allTaken.length;
  const isUrgent = timeLeft <= 10 && timeLeft > 0;
  const timerDisplay = `00:${timeLeft.toString().padStart(2, '0')}`;
  const hasPaid = myBought.length > 0;

  return (
    <div className="phase2-container">
      {/* Dashboard */}
      <div className="dashboard-panel">
        <div className="dashboard-top">
          <button className="back-btn" onClick={onBackToLobby}>← Lobby</button>
          <div className="room-badge">
            <span className="room-icon">{room.icon}</span> {room.name} · {room.fee} ETB/card
          </div>
        </div>

        {/* 4 stats - NOW GLOBALLY SYNCED INSTANTLY ON CLICKS */}
        <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
          <div className="metric-card">
            <span className="metric-label">Players</span>
            <span className="metric-value">{playersCount}</span>
          </div>
          <div className="metric-card">
            <span className="metric-label">Seats Taken</span>
            <span className="metric-value">{seatsTaken}</span>
          </div>
          <div className={`metric-card timer-card ${isUrgent ? 'urgent' : ''}`}>
            <span className="metric-label">Next Round</span>
            <span className={`metric-value ${isUrgent ? 'text-red' : ''}`}>{timerDisplay}</span>
          </div>
          <div className="metric-card prize-card">
            <span className="metric-label">Prize Pool</span>
            <span className="metric-value gold-text">{prizePool}<span className="text-xs"> ETB</span></span>
          </div>
        </div>

        {/* Status messages */}
        {roundEndMsg && (
          <div style={{ textAlign: 'center', padding: '6px', background: 'rgba(245,200,66,0.15)', borderRadius: '8px', marginTop: '6px', fontSize: '12px', color: '#F5C842', fontWeight: 'bold' }}>
            {roundEndMsg}
          </div>
        )}
        {hasPaid && gameStatus !== 'game' && (
          <div style={{ textAlign: 'center', padding: '6px', background: 'rgba(52,209,122,0.15)', borderRadius: '8px', marginTop: '6px', fontSize: '12px', color: '#34D17A', fontWeight: 'bold' }}>
            ✅ Cards bought! Game starts when timer hits 00:00
          </div>
        )}
        {gameStatus === 'game' && !hasPaid && (
          <div style={{ textAlign: 'center', padding: '6px', background: 'rgba(255,122,69,0.15)', borderRadius: '8px', marginTop: '6px', fontSize: '12px', color: '#FF7A45', fontWeight: 'bold' }}>
            👀 A game is currently in progress. You can spectate!
          </div>
        )}

        <div style={{ textAlign: 'center', fontSize: '10px', color: '#666', marginTop: '4px' }}>
          {availableSeats} available · {seatsTaken} taken by all players
        </div>
      </div>

      {/* Card Grid */}
      <div className="compact-grid-wrapper">
        <div className="compact-grid">
          {ALL_CARDS.map(cardId => {
            const isMine = myReserved.includes(cardId) || myBought.includes(cardId);
            const isTaken = allTaken.includes(cardId) && !isMine;
            const isPreviewing = previewCardId === cardId;

            // Simplified styling rules as requested
            let cls = 'compact-card--available';
            if (isTaken) cls = 'compact-card--taken';
            else if (isMine) cls = 'compact-card--selected';

            return (
              <div
                key={cardId}
                onPointerEnter={() => handlePointerEnter(cardId)}
                onPointerLeave={handlePointerLeave}
                onClick={() => !hasPaid && toggleCard(cardId)}
                className={`compact-card ${cls} ${myBought.includes(cardId) ? 'compact-card--bought' : ''}`}
                style={{ cursor: hasPaid ? 'default' : undefined }}
              >
                {cardId}
                {isPreviewing && !isTaken && renderPreview(cardId)}
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="action-footer">
        <div className="legend-row">
          <div className="legend-item"><div className="legend-dot legend-dot--available" /> Available</div>
          <div className="legend-item"><div className="legend-dot legend-dot--selected" /> Selected</div>
          <div className="legend-item"><div className="legend-dot legend-dot--taken" /> Taken</div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#999', margin: '4px 0 8px' }}>
          <span>Selected: {myReserved.length}/2 · Cost: {totalCost} ETB</span>
          <span>Balance: {user.balance} ETB</span>
        </div>

        {!canAfford && myReserved.length > 0 && (
          <p style={{ color: '#FF7A45', fontSize: '11px', textAlign: 'center', marginBottom: '6px' }}>
            ⚠️ Insufficient balance ({user.balance} ETB). Need {totalCost} ETB.
          </p>
        )}

        <button
          className="join-game-btn"
          disabled={isBuying || (hasPaid && gameStatus !== 'game') || (!hasPaid && gameStatus !== 'game' && (myReserved.length === 0 || !canAfford))}
          onClick={() => {
            if (gameStatus === 'game') {
              onJoinGame([]); // Spectate
            } else {
              handleBuy();
            }
          }}
        >
          {gameStatus === 'game'
            ? '👀 Spectate Game'
            : hasPaid
            ? `✅ Waiting for game... (${timerDisplay})`
            : isBuying
            ? 'Processing...'
            : myReserved.length === 0
            ? 'Tap a card to select'
            : `🎫 Confirm & Pay ${totalCost} ETB`}
        </button>
      </div>
    </div>
  );
}
