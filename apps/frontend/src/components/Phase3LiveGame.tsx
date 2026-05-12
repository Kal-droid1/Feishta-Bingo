import { useState, useEffect, useCallback, useRef } from 'react';
import type { Room, User } from '../types';

// ── Types ────────────────────────────────────────────────────────
interface BingoCard {
  id: number;
  grid: (number | 'FREE')[][];
}

interface WinResult {
  type: 'horizontal' | 'vertical' | 'diagonal' | 'corners';
  cells: [number, number][];
  cardIndex: number;
}

interface WinnerData {
  telegramId: string;
  username: string;
  winType: string;
  cells: [number, number][];
  cardId: number;
}

interface Phase3LiveGameProps {
  room: Room;
  user: User;
  selectedCardIds: number[];
  onGameEnd: (winnings: number) => void;
  onBackToLobby: () => void;
  voiceEnabled: boolean;
  onToggleVoice: () => void;
  darkMode: boolean;
  onToggleDark: () => void;
}

// ── 75-Ball Generator (Identical to Server logic) ────────────────
function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function getUniqueNumbers(rand: () => number, min: number, max: number, count: number): number[] {
  const nums = new Set<number>();
  while (nums.size < count) nums.add(Math.floor(rand() * (max - min + 1)) + min);
  return Array.from(nums);
}

function generateBingoCard(seed: number): BingoCard {
  const rand = mulberry32(seed);
  const B = getUniqueNumbers(rand, 1, 15, 5);
  const I = getUniqueNumbers(rand, 16, 30, 5);
  const N = getUniqueNumbers(rand, 31, 45, 5);
  const G = getUniqueNumbers(rand, 46, 60, 5);
  const O = getUniqueNumbers(rand, 61, 75, 5);

  const columns = [B, I, N, G, O];
  const grid: (number | 'FREE')[][] = [];

  for (let row = 0; row < 5; row++) {
    const rowData: (number | 'FREE')[] = [];
    for (let col = 0; col < 5; col++) {
      if (row === 2 && col === 2) rowData.push('FREE');
      else rowData.push(columns[col][row]);
    }
    grid.push(rowData);
  }

  return { id: seed, grid };
}

function getColumnLabel(num: number): string {
  if (num <= 15) return 'B';
  if (num <= 30) return 'I';
  if (num <= 45) return 'N';
  if (num <= 60) return 'G';
  return 'O';
}

function checkWin(card: BingoCard, dabbed: boolean[][], cardIndex: number): WinResult | null {
  // 5 horizontal rows
  for (let row = 0; row < 5; row++) {
    if (dabbed[row].every(Boolean)) return { type: 'horizontal', cells: [0, 1, 2, 3, 4].map((col) => [row, col]), cardIndex };
  }
  // 5 vertical columns
  for (let col = 0; col < 5; col++) {
    if ([0, 1, 2, 3, 4].every((row) => dabbed[row][col])) return { type: 'vertical', cells: [0, 1, 2, 3, 4].map((row) => [row, col]), cardIndex };
  }
  // 2 diagonals
  if ([0, 1, 2, 3, 4].every((i) => dabbed[i][i])) return { type: 'diagonal', cells: [0, 1, 2, 3, 4].map((i) => [i, i]), cardIndex };
  if ([0, 1, 2, 3, 4].every((i) => dabbed[i][4 - i])) return { type: 'diagonal', cells: [0, 1, 2, 3, 4].map((i) => [i, 4 - i]), cardIndex };
  // 4 corners (top-left, top-right, bottom-left, bottom-right)
  if (dabbed[0][0] && dabbed[0][4] && dabbed[4][0] && dabbed[4][4]) {
    return { type: 'corners', cells: [[0, 0], [0, 4], [4, 0], [4, 4]], cardIndex };
  }
  return null;
}

// ── Component ────────────────────────────────────────────────────
export function Phase3LiveGame({ room, user, selectedCardIds, onGameEnd, onBackToLobby, voiceEnabled, onToggleVoice, darkMode, onToggleDark }: Phase3LiveGameProps) {
  const [cards] = useState<BingoCard[]>(selectedCardIds.map(generateBingoCard));
  const myId = String(user.telegramId);

  // Global State exactly matching server
  const [status, setStatus] = useState<'lobby' | 'game'>('lobby');
  const [timeLeft, setTimeLeft] = useState(45);
  
  // High-precision Local Engine State
  const [calledNumbers, setCalledNumbers] = useState<number[]>([]);
  const [currentCall, setCurrentCall] = useState<number | null>(null);
  
  // Synced from server
  const [prizePool, setPrizePool] = useState(0);
  const [playersCount, setPlayersCount] = useState(0);
  const [globalWinner, setGlobalWinner] = useState<WinnerData | null>(null);

  // Math sync
  const drawOrderRef = useRef<number[]>([]);
  const gameStartedAtRef = useRef<number>(0);
  const serverOffsetRef = useRef<number>(0);
  const drawIntervalRef = useRef<number>(3500);

  // Local UI State
  const [autoDab, setAutoDab] = useState(true);
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  
  const [dabbedState, setDabbedState] = useState<boolean[][][]>(() =>
    cards.map((card) => card.grid.map((row) => row.map((cell) => cell === 'FREE')))
  );

  const [winResult, setWinResult] = useState<WinResult | null>(null);
  const [bingoAvailable, setBingoAvailable] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const lastSpokenRef = useRef<number | null>(null);
  const voicesLoadedRef = useRef(false);

  // ── Mobile-safe voice engine ──────────────────────────────────
  // Pre-load voices and handle mobile Telegram WebView
  useEffect(() => {
    if (!window.speechSynthesis) return;
    
    const loadVoices = () => {
      const v = window.speechSynthesis.getVoices();
      if (v.length > 0) voicesLoadedRef.current = true;
    };
    
    // Initial load
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    // Keep-alive fix for mobile WebView (reduced frequency to avoid battery drain)
    const keepAlive = setInterval(() => {
      if (window.speechSynthesis.speaking) return;
      // Gentle resume/pause to keep audio context alive
      try {
        window.speechSynthesis.pause();
        window.speechSynthesis.resume();
      } catch (e) {
        // Ignore errors on mobile
      }
    }, 15000); // Reduced from 10s to 15s

    return () => {
      clearInterval(keepAlive);
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  // Mobile audio initialization helper
  const initializeMobileAudio = useCallback(() => {
    if (!window.speechSynthesis || voicesLoadedRef.current) return;
    
    // Create a silent utterance to prime the audio system on mobile
    const dummyUtterance = new SpeechSynthesisUtterance('');
    dummyUtterance.volume = 0;
    dummyUtterance.rate = 10;
    try {
      window.speechSynthesis.speak(dummyUtterance);
      voicesLoadedRef.current = true;
    } catch (e) {
      // Ignore errors
    }
  }, []);

  // Enhanced voice toggle with mobile initialization
  const handleVoiceToggle = useCallback(() => {
    // Initialize mobile audio on first user interaction
    if (!voicesLoadedRef.current && voiceEnabled === false) {
      initializeMobileAudio();
    }
    onToggleVoice();
  }, [voiceEnabled, onToggleVoice, initializeMobileAudio]);

  const speakNumber = useCallback((num: number) => {
    if (!voiceEnabled) return;
    if (!window.speechSynthesis) return;
    if (lastSpokenRef.current === num) return;
    lastSpokenRef.current = num;

    window.speechSynthesis.cancel();

    const letter = getColumnLabel(num);
    const utter = new SpeechSynthesisUtterance(`${letter} ${num}`);
    utter.rate = 0.82;
    utter.pitch = 1.1;
    utter.volume = 1;

    // Mobile compatibility: use any available voice
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(v => v.lang.startsWith('en')) || voices[0];
    if (preferred) utter.voice = preferred;

    // Mobile WebView fix: ensure speech synthesis is properly initialized
    try {
      // For mobile Telegram WebView, we need to ensure proper initialization
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
      }
      
      // Small delay to ensure mobile WebView is ready
      setTimeout(() => {
        window.speechSynthesis.speak(utter);
      }, 100);
    } catch (error) {
      console.log('Voice synthesis error (mobile):', error);
    }
  }, [voiceEnabled]);

  // 1. High-Frequency Local Ball Dropper (Zero Lag)
  useEffect(() => {
    if (status !== 'game' || globalWinner || showCelebration) return;

    let animationFrameId: number;
    const updateBalls = () => {
      const now = Date.now();
      const serverNow = now + serverOffsetRef.current;
      const elapsedGameMs = serverNow - gameStartedAtRef.current;
      
      const expectedDrawIndex = Math.max(0, Math.min(75, Math.floor(elapsedGameMs / drawIntervalRef.current)));
      
      setCalledNumbers(prev => {
        if (prev.length === expectedDrawIndex) return prev;
        const next = drawOrderRef.current.slice(0, expectedDrawIndex);
        if (expectedDrawIndex > 0) {
          const newCall = drawOrderRef.current[expectedDrawIndex - 1];
          setCurrentCall(newCall);
          speakNumber(newCall);
        }
        return next;
      });
      
      animationFrameId = requestAnimationFrame(updateBalls);
    };

    updateBalls();
    return () => cancelAnimationFrame(animationFrameId);
  }, [status, globalWinner, showCelebration, speakNumber]);

  // 2. Poll Server State (For Wins and Transitions)
  useEffect(() => {
    let hasSeenGame = false;

    const poll = async () => {
      try {
        const res = await fetch(`/api/rooms/${room.id}/state?telegramId=${myId}`);
        if (!res.ok) return;
        const data = await res.json();

        if (data.status === 'game') {
          hasSeenGame = true;
          setStatus('game');
          setPrizePool(data.prizePool);
          setPlayersCount(data.playersCount);
          setGlobalWinner(data.winnerData || null);

          // Update sync math
          if (drawOrderRef.current.length === 0) {
            drawOrderRef.current = data.drawOrder;
            gameStartedAtRef.current = data.gameStartedAt;
            serverOffsetRef.current = data.serverNow - Date.now();
            drawIntervalRef.current = data.drawIntervalMs || 3500;
          }
        } else if (data.status === 'lobby') {
          if (hasSeenGame) {
            // The game ended and server reset to lobby! Kick everyone out to phase 1.
            onBackToLobby();
          } else {
            setStatus('lobby');
            setTimeLeft(data.timeLeft);
            setPrizePool(data.prizePool);
            setPlayersCount(data.playersCount);
          }
        }
      } catch (_) {}
    };

    poll();
    const interval = setInterval(poll, 1500); // Only need to poll slowly now!
    return () => clearInterval(interval);
  }, [room.id, myId, onBackToLobby]);

  // 3. Auto-Dabbing Logic
  useEffect(() => {
    if (!currentCall || !autoDab || status !== 'game') return;

    setDabbedState((prev) => {
      const next = prev.map((cardDabs, ci) => {
        const card = cards[ci];
        return cardDabs.map((row, ri) =>
          row.map((val, colIdx) => {
            if (val) return true;
            return card.grid[ri][colIdx] === currentCall;
          })
        );
      });
      return next;
    });
  }, [currentCall, autoDab, status, cards]);

  // 4. Win Checking Logic
  useEffect(() => {
    if (status !== 'game' || showCelebration || globalWinner) return;

    for (let ci = 0; ci < cards.length; ci++) {
      const result = checkWin(cards[ci], dabbedState[ci], ci);
      if (result) {
        if (autoDab) {
          triggerWin(result);
        } else {
          setBingoAvailable(true);
          setWinResult(result);
        }
        return;
      }
    }
  }, [dabbedState, status, showCelebration, globalWinner, autoDab, cards]);

  // 5. Claim Win against Backend
  const triggerWin = useCallback(async (result: WinResult) => {
    const updateIsClaiming = useCallback(() => {
      setIsClaiming(true);
    }, []);

    if (isClaiming || globalWinner) return;
    updateIsClaiming();

    try {
      const res = await fetch('/api/game/claim-win', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegramId: myId,
          username: user.username || user.firstName,
          roomId: room.id,
          cardId: cards[result.cardIndex].id,
          winType: result.type,
          cells: result.cells,
          prize: prizePool,
        }),
      });

      if (res.ok) {
        setWinResult(result);
        setShowCelebration(true);
        window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success');
      }
    } catch (e) {
      console.error('Win claim failed', e);
    } finally {
      setIsClaiming(false);
    }
  }, [isClaiming, globalWinner, myId, user, room.id, cards, prizePool]);

  const handleBingoClaim = () => {
    if (!bingoAvailable || !winResult) {
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('error');
      return;
    }
    triggerWin(winResult);
  };

  const handleManualDab = useCallback((cardIndex: number, row: number, col: number) => {
    if (autoDab || status !== 'game' || showCelebration) return;
    const cell = cards[cardIndex].grid[row][col];
    if (cell === 'FREE') return;
    if (!calledNumbers.includes(cell as number)) return;

    window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light');
    setDabbedState((prev) => {
      const next = prev.map((c) => c.map((r) => [...r]));
      next[cardIndex][row][col] = true;
      return next;
    });
  }, [autoDab, status, showCelebration, cards, calledNumbers]);

  const recentCalls = [...calledNumbers].reverse().slice(0, 5);
  const activeCard = cards[activeCardIndex];
  const activeCardDabbed = dabbedState[activeCardIndex];

  return (
    <div className="phase3-live-container relative">
      {/* ── Waiting Lobby Overlay ── */}
      {status === 'lobby' && !showCelebration && !globalWinner && (
        <div className="absolute inset-0 z-50 phase2-container" style={{ background: 'var(--cream-bg)', padding: '16px' }}>
          {/* FIX 4: Simplified Dashboard - Only back button and room badge */}
          <div className="dashboard-panel" style={{ animation: 'content-enter 0.4s ease-out both' }}>
            <div className="dashboard-top">
              <button className="back-btn" onClick={onBackToLobby}>← Lobby</button>
              <div className="room-badge">
                <span className="room-icon">{room.icon}</span> {room.name}
              </div>
            </div>
          </div>

          {/* ── Beautiful Modern Countdown UI ── */}
          <div className="countdown-container" style={{ 
            flex: 1, 
            display: 'flex', 
            flexDirection: 'column', 
            justifyContent: 'center', 
            alignItems: 'center', 
            textAlign: 'center',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            margin: '16px',
            borderRadius: '24px',
            padding: '32px',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 20px 40px rgba(0,0,0,0.1)'
          }}>
            {/* Animated background orbs */}
            <div style={{
              position: 'absolute',
              top: '-50px',
              right: '-50px',
              width: '100px',
              height: '100px',
              background: 'rgba(255,255,255,0.1)',
              borderRadius: '50%',
              animation: 'float 6s ease-in-out infinite'
            }} />
            <div style={{
              position: 'absolute',
              bottom: '-30px',
              left: '-30px',
              width: '80px',
              height: '80px',
              background: 'rgba(255,255,255,0.08)',
              borderRadius: '50%',
              animation: 'float 8s ease-in-out infinite reverse'
            }} />

            {/* Countdown Timer */}
            <div style={{ 
              position: 'relative',
              zIndex: 2,
              marginBottom: '24px' 
            }}>
              <div style={{
                fontFamily: 'Montserrat, sans-serif',
                fontSize: '72px',
                fontWeight: 900,
                color: '#ffffff',
                lineHeight: 1,
                textShadow: '0 4px 20px rgba(0,0,0,0.3)',
                animation: timeLeft <= 10 ? 'urgent-pulse 1s ease-in-out infinite' : 'gentle-pulse 3s ease-in-out infinite',
                background: timeLeft <= 10 ? 
                  'linear-gradient(45deg, #ff6b6b, #feca57)' : 
                  'linear-gradient(45deg, #ffffff, #f8f9fa)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}>
                {timeLeft.toString().padStart(2, '0')}
              </div>
              <div style={{ 
                fontSize: '14px', 
                color: 'rgba(255,255,255,0.9)', 
                marginTop: '8px', 
                fontWeight: 600,
                textShadow: '0 2px 4px rgba(0,0,0,0.2)'
              }}>
                {timeLeft <= 10 ? '🚀 Get Ready!' : '⏳ Game Starting'}
              </div>
            </div>

            {/* Modern Stats Cards */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '12px',
              width: '100%',
              maxWidth: '300px',
              position: 'relative',
              zIndex: 2
            }}>
              {/* Players Card */}
              <div style={{
                background: 'rgba(255,255,255,0.15)',
                backdropFilter: 'blur(10px)',
                borderRadius: '16px',
                padding: '16px',
                textAlign: 'center',
                border: '1px solid rgba(255,255,255,0.2)',
                transition: 'transform 0.3s ease'
              }}>
                <div style={{
                  fontSize: '28px',
                  fontWeight: 800,
                  color: '#4ade80',
                  marginBottom: '4px',
                  textShadow: '0 2px 4px rgba(0,0,0,0.2)'
                }}>
                  {playersCount}
                </div>
                <div style={{
                  fontSize: '11px',
                  color: 'rgba(255,255,255,0.8)',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Players
                </div>
              </div>

              {/* Prize Card */}
              <div style={{
                background: 'rgba(255,255,255,0.15)',
                backdropFilter: 'blur(10px)',
                borderRadius: '16px',
                padding: '16px',
                textAlign: 'center',
                border: '1px solid rgba(255,255,255,0.2)',
                transition: 'transform 0.3s ease'
              }}>
                <div style={{
                  fontSize: '28px',
                  fontWeight: 800,
                  color: '#fbbf24',
                  marginBottom: '4px',
                  textShadow: '0 2px 4px rgba(0,0,0,0.2)'
                }}>
                  {prizePool}
                </div>
                <div style={{
                  fontSize: '11px',
                  color: 'rgba(255,255,255,0.8)',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  ETB Prize
                </div>
              </div>

              {/* Entry Card */}
              <div style={{
                background: 'rgba(255,255,255,0.15)',
                backdropFilter: 'blur(10px)',
                borderRadius: '16px',
                padding: '16px',
                textAlign: 'center',
                border: '1px solid rgba(255,255,255,0.2)',
                transition: 'transform 0.3s ease'
              }}>
                <div style={{
                  fontSize: '28px',
                  fontWeight: 800,
                  color: '#ffffff',
                  marginBottom: '4px',
                  textShadow: '0 2px 4px rgba(0,0,0,0.2)'
                }}>
                  {room.fee}
                </div>
                <div style={{
                  fontSize: '11px',
                  color: 'rgba(255,255,255,0.8)',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Entry
                </div>
              </div>
            </div>

            {/* Progress Ring */}
            <div style={{
              position: 'relative',
              width: '120px',
              height: '120px',
              marginTop: '24px',
              zIndex: 2
            }}>
              <svg style={{
                position: 'absolute',
                top: 0,
                left: 0,
                transform: 'rotate(-90deg)'
              }} width="120" height="120">
                <circle
                  cx="60"
                  cy="60"
                  r="54"
                  stroke="rgba(255,255,255,0.2)"
                  strokeWidth="8"
                  fill="none"
                />
                <circle
                  cx="60"
                  cy="60"
                  r="54"
                  stroke="url(#gradient)"
                  strokeWidth="8"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 54}`}
                  strokeDashoffset={`${2 * Math.PI * 54 * (1 - timeLeft / 45)}`}
                  strokeLinecap="round"
                  style={{
                    transition: 'stroke-dashoffset 1s ease-in-out'
                  }}
                />
                <defs>
                  <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#4ade80" />
                    <stop offset="100%" stopColor="#fbbf24" />
                  </linearGradient>
                </defs>
              </svg>
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center'
              }}>
                <div style={{
                  fontSize: '24px',
                  fontWeight: 800,
                  color: '#ffffff'
                }}>
                  {Math.round((timeLeft / 45) * 100)}%
                </div>
                <div style={{
                  fontSize: '10px',
                  color: 'rgba(255,255,255,0.7)',
                  fontWeight: 600
                }}>
                  READY
                </div>
              </div>
            </div>
          </div>

          {/* Add custom animations */}
          <style jsx>{`
            @keyframes float {
              0%, 100% { transform: translateY(0px) rotate(0deg); }
              50% { transform: translateY(-20px) rotate(180deg); }
            }
            @keyframes gentle-pulse {
              0%, 100% { transform: scale(1); opacity: 1; }
              50% { transform: scale(1.05); opacity: 0.9; }
            }
            @keyframes urgent-pulse {
              0%, 100% { transform: scale(1); opacity: 1; }
              50% { transform: scale(1.1); opacity: 0.8; }
            }
          `}</style>
        </div>
      )}

      {/* ── Header: Back + Stat Pills + Voice Toggle ── */}
      <header className="live-header">
        <button className="live-back-btn" onClick={onBackToLobby}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </button>

        {/* Stats row inside header — larger & levelled */}
        <div className="live-stats-bar">
        <div className="live-stat-pill">
        <span className="live-stat-label">PRIZE</span>
        <span className="live-stat-val">{prizePool} ETB</span>
        </div>
        <div className="live-stat-pill">
        <span className="live-stat-label">PLAYERS</span>
        <span className="live-stat-val">{playersCount}</span>
        </div>
        <div className="live-stat-pill">
        <span className="live-stat-label">ENTRY</span>
        <span className="live-stat-val">{room.fee} ETB</span>
        </div>
        <div className="live-stat-pill" style={{ borderRight: 'none' }}>
        <span className="live-stat-label">BALLS</span>
        <span className="live-stat-val">{calledNumbers.length}/75</span>
        </div>
        </div>
        
        {/* Voice & Settings */}
        <div className="flex gap-1 items-center">
          <button
            className="live-sound-btn"
            onClick={handleVoiceToggle}
            title={voiceEnabled ? 'Mute voice' : 'Unmute voice'}
            style={{ opacity: voiceEnabled ? 1 : 0.4 }}
          >
            {voiceEnabled ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>
            )}
          </button>
        </div>
      </header>

      {/* ── Main Split ── */}
      <div className="live-main-split">
        {/* Left Panel */}
        <div className="live-left-panel">
          <div className="caller-section">
            <div className="caller-section-title">CURRENT CALL 🔔</div>
            <div className={`caller-orb ${currentCall ? 'caller-orb--active' : ''}`}>
              {currentCall ? (
                <>
                  <div className="caller-letter">{getColumnLabel(currentCall)}</div>
                  <div className="caller-number">{currentCall}</div>
                </>
              ) : (
                <div className="caller-waiting">...</div>
              )}
            </div>
          </div>

          <div className="recent-section">
            <div className="caller-section-title">RECENT</div>
            <div className="recent-row">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className={`recent-bubble ${recentCalls[i] ? 'recent-bubble--filled' : ''}`}>
                  {recentCalls[i] || ''}
                </div>
              ))}
            </div>
          </div>

          <div className="board-section">
            <div className="caller-section-title">BOARD</div>
            <div className="board-grid">
              {Array.from({ length: 75 }, (_, i) => i + 1).map((num) => {
                const isCalled = calledNumbers.includes(num);
                return (
                  <div key={num} className={`board-cell ${isCalled ? 'board-cell--called' : ''}`}>
                    {num}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Panel */}
        <div className="live-right-panel">
          {cards.length > 0 ? (
            <>
              <div className="card-tabs">
                {cards.map((card, i) => (
                  <button
                    key={card.id}
                    className={`card-tab ${activeCardIndex === i ? 'card-tab--active' : ''}`}
                    onClick={() => setActiveCardIndex(i)}
                  >
                    CARD #{card.id}
                  </button>
                ))}
              </div>

              <div className="card-container">
                <div className="card-header">
                  <div className="card-title">CARD #{activeCard?.id}</div>
                  <label className="card-auto-toggle">
                    <span className="auto-label">AUTO</span>
                    <input
                      type="checkbox"
                      checked={autoDab}
                      onChange={(e) => setAutoDab(e.target.checked)}
                    />
                    <span className="auto-slider"></span>
                  </label>
                </div>

                <div className="card-bingo-header">
                  <span style={{ color: '#3B82F6' }}>B</span>
                  <span style={{ color: '#EF4444' }}>I</span>
                  <span style={{ color: '#8B5CF6' }}>N</span>
                  <span style={{ color: '#10B981' }}>G</span>
                  <span style={{ color: '#F97316' }}>O</span>
                </div>

                <div className="card-grid">
                  {activeCard?.grid.map((row, ri) =>
                    row.map((cell, ci) => {
                      const isDabbed = activeCardDabbed?.[ri]?.[ci];
                      const isFree = cell === 'FREE';
                      const isWin = showCelebration && winResult?.cardIndex === activeCardIndex && winResult.cells.some(([wr, wc]) => wr === ri && wc === ci);
                      const isCalled = isFree ? false : calledNumbers.includes(cell as number);
                      const isHint = !autoDab && isCalled && !isDabbed && !isFree;
                      
                      return (
                        <div
                          key={`${ri}-${ci}`}
                          onClick={() => handleManualDab(activeCardIndex, ri, ci)}
                          className={`card-cell ${isDabbed ? 'card-cell--dabbed' : ''} ${isWin ? 'card-cell--win' : ''} ${isFree ? 'card-cell--free' : ''} ${isHint ? 'card-cell--hint' : ''}`}
                        >
                          {isFree ? 'FREE' : cell}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full bg-[var(--cream-surface)] border border-[var(--border)] rounded-2xl p-8 text-center shadow-[var(--shadow-sm)]">
              <span className="text-4xl mb-4">👀</span>
              <h2 className="text-[var(--text-main)] font-extrabold text-xl mb-2 font-['Montserrat']">SPECTATOR MODE</h2>
              <p className="text-[var(--text-muted)] text-sm">You didn't buy cards for this round. Watch the game unfold globally!</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Footer - Only show during actual game, not countdown ── */}
      {cards.length > 0 && status === 'game' && calledNumbers.length > 0 && (
        <div className="bingo-footer">
          <button 
            className={`bingo-action-btn ${bingoAvailable ? 'bingo-action-btn--active' : ''}`} 
            onClick={handleBingoClaim}
            disabled={!bingoAvailable || isClaiming}
          >
            {isClaiming ? 'Claiming...' : 'B I N G O'}
          </button>
        </div>
      )}

      {/* ── Global Winner Overlay (Someone else won) ── */}
      {globalWinner && globalWinner.telegramId !== myId && !showCelebration && (
        <div className="celebration-overlay">
          <div className="celebration-card" style={{ background: '#1A1A1A', border: '2px solid #F5A623' }}>
            <div className="celebration-emoji">🏁</div>
            <h2 className="celebration-title" style={{ color: '#F5A623', fontSize: '1.8rem' }}>GAME OVER</h2>
            <p className="celebration-subtitle">
              <strong>{globalWinner.username}</strong> yelled BINGO first!
            </p>
            
            <div className="flex flex-col items-center mt-6 mb-6">
              <span className="text-sm text-gray-400 mb-2">Winning Pattern: {globalWinner.winType.toUpperCase()}</span>
              {/* Render Mini Winning Pattern Grid */}
              <div className="grid grid-cols-5 gap-1 bg-[#111] p-2 rounded-lg border border-[#333]">
                {Array.from({ length: 25 }).map((_, i) => {
                  const r = Math.floor(i / 5);
                  const c = i % 5;
                  const isWinCell = globalWinner.cells.some(([wr, wc]) => wr === r && wc === c);
                  return (
                    <div 
                      key={i} 
                      className={`w-4 h-4 rounded-sm ${isWinCell ? 'bg-[#34D17A] shadow-[0_0_8px_#34D17A]' : 'bg-[#222]'}`}
                    />
                  );
                })}
              </div>
            </div>

            <button className="celebration-btn" style={{ background: '#333' }} onClick={onBackToLobby}>
              Returning to Lobby...
            </button>
          </div>
        </div>
      )}

      {/* ── Local Winner Overlay (I won) ── */}
      {showCelebration && (
        <div className="celebration-overlay">
          <div className="celebration-card">
            <div className="celebration-emoji">🏆</div>
            <h2 className="celebration-title">BINGO!</h2>
            <p className="celebration-subtitle">
              You won with a <strong>{winResult?.type}</strong> line!
            </p>
            <div className="celebration-prize">
              <span className="prize-label">Prize Won</span>
              <span className="prize-value">+{prizePool} ETB</span>
            </div>
            <button
              className="celebration-btn"
              onClick={() => onGameEnd(prizePool)}
            >
              Collect & Return
            </button>
            <p className="celebration-sync">✓ Balance updated securely</p>
          </div>
        </div>
      )}
    </div>
  );
}
