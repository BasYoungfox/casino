'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useBalance } from '@/components/providers/BalanceProvider';
import { useMobile } from '@/lib/useMobile';

const playSound = (src: string, volume = 1) => {
  try { const a = new Audio(src); a.volume = volume; a.play(); } catch { /* ignore */ }
};
const MIN_BET = 0.5;
const MAX_BET = 1000;
const GRID_SIZE = 25;

type Phase = 'betting' | 'waiting' | 'active' | 'exploded' | 'cashed_out';
type TileState = 'hidden' | 'pending' | 'safe' | 'mine_hit' | 'mine_other';

function EuroBadge({ size = 14 }: { size?: number }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: size, height: size, fontSize: size * 0.8, fontWeight: 800,
      color: 'rgba(255,255,255,0.55)', flexShrink: 0,
    }}>€</span>
  );
}

const MINES_STYLES = `
  @keyframes grid-shake {
    0%,100% { transform: translate(0,0); }
    15%     { transform: translate(-8px, 4px); }
    30%     { transform: translate(8px, -4px); }
    45%     { transform: translate(-6px, 2px); }
    60%     { transform: translate(6px, -2px); }
    75%     { transform: translate(-3px, 1px); }
    90%     { transform: translate(3px, -1px); }
  }
  @keyframes img-float {
    0%,100% { transform: translateY(0); }
    50% { transform: translateY(-3px); }
  }
`;

function Tile({ state, onClick, disabled, gameActive }: {
  state: TileState; onClick: () => void; disabled: boolean; gameActive: boolean;
}) {
  const isHidden = state === 'hidden';
  const isMine = state === 'mine_hit' || state === 'mine_other';
  const isSafe = state === 'safe';
  const isGameOverReveal = state === 'mine_other';

  let statusClass = '';
  let content: React.ReactNode = null;

  if (isSafe || state === 'mine_hit') {
    statusClass = `revealed ${isMine ? 'bomb-tile' : 'gem-tile'}`;
    content = isMine ? (
      <>
        <img src="/images/mines/bomb.svg" alt="Bomb" className="reveal-anim" />
        <img src="/images/mines/bomb_effect.gif" alt="Explosion" className="bomb-effect" />
      </>
    ) : (
      <img src="/images/mines/diamond.svg" alt="Gem" className="reveal-anim" />
    );
  } else if (isGameOverReveal) {
    statusClass = `revealed game-over-reveal`;
    content = <img src="/images/mines/bomb.svg" alt="Bomb" style={{ filter: 'grayscale(100%) opacity(0.5)' }} />;
  } else if (!gameActive && isHidden) {
    statusClass = `revealed game-over-reveal`;
    content = <img src="/images/mines/diamond.svg" alt="Gem" style={{ filter: 'grayscale(100%) opacity(0.5)' }} />;
  }

  return (
    <button
      className={`mine-tile ${statusClass} ${(!gameActive || (state !== 'hidden' && state !== 'pending')) ? 'inactive' : ''}`}
      onClick={onClick}
      disabled={disabled || (state !== 'hidden' && state !== 'pending')}
    >
      <div className="mine-tile-inner">{content}</div>
    </button>
  );
}

export default function MinesGame() {
  const { balance, refresh, addResult } = useBalance();

  const [bet, setBet] = useState(0);
  const [betInput, setBetInput] = useState('');
  const inputFocused = useRef(false);
  const gridRef = useRef<HTMLDivElement>(null);
  const [shaking, setShaking] = useState(false);
  const [mineCount, setMineCount] = useState(3);
  const [phase, setPhase] = useState<Phase>('betting');
  const [gameId, setGameId] = useState('');
  const [revealed, setRevealed] = useState<number[]>([]);
  const [minePositions, setMinePositions] = useState<number[]>([]);
  const [hitMineIdx, setHitMineIdx] = useState<number | null>(null);
  const [justRevealedIdx, setJustRevealedIdx] = useState<number | null>(null);
  const [multiplier, setMultiplier] = useState(1);
  const [safeReveals, setSafeReveals] = useState(0);
  const [payout, setPayout] = useState(0);
  const [pendingTiles, setPendingTiles] = useState<Set<number>>(new Set());
  const gameAbortedRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState('');

  const isBetting = phase === 'betting';
  const isActive = phase === 'active';
  const isWaiting = phase === 'waiting';
  const isDone = phase === 'exploded' || phase === 'cashed_out';
  const safeTilesTotal = GRID_SIZE - mineCount;
  const safeRemaining = safeTilesTotal - safeReveals;
  const canDeal = bet >= MIN_BET && balance >= bet;
  const canCashout = isActive && safeReveals >= 1 && pendingTiles.size === 0;

  useEffect(() => {
    if (!inputFocused.current) setBetInput(bet > 0 ? bet.toFixed(2) : '');
  }, [bet]);

  useEffect(() => {
    if (justRevealedIdx === null) return;
    const t = setTimeout(() => setJustRevealedIdx(null), 180);
    return () => clearTimeout(t);
  }, [justRevealedIdx]);

  useEffect(() => {
    if (!isDone) return;
    const t = setTimeout(() => setPhase('betting'), 200);
    return () => clearTimeout(t);
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  const halveBet = () => { if (bet > 0) setBet(parseFloat(Math.max(MIN_BET, bet / 2).toFixed(2))); };
  const doubleBetVal = () => setBet(parseFloat(Math.min(MAX_BET, bet > 0 ? bet * 2 : MIN_BET).toFixed(2)));

  const getTileState = useCallback((i: number): TileState => {
    if (revealed.includes(i)) return 'safe';
    if (pendingTiles.has(i)) return 'pending';
    if (minePositions.length > 0) {
      if (i === hitMineIdx) return 'mine_hit';
      if (minePositions.includes(i)) return 'mine_other';
    }
    return 'hidden';
  }, [revealed, pendingTiles, minePositions, hitMineIdx]);

  const startGame = async () => {
    if (bet < MIN_BET) return setError(`Minimum inzet is €${MIN_BET}`);
    if (bet > balance) return setError('Onvoldoende saldo');
    playSound('/bet.wav');
    gameAbortedRef.current = false;
    setRevealed([]); setMinePositions([]); setHitMineIdx(null); setPendingTiles(new Set());
    setSafeReveals(0); setMultiplier(1); setPayout(0);
    setPhase('waiting'); setError(null); setStatusMsg('Starten…');
    try {
      const res = await fetch('/api/mines/bet', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: bet, minesCount: mineCount }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setGameId(data.gameId);
      setPhase('active'); setStatusMsg('');
      refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Mislukt'); setPhase('betting'); setStatusMsg('');
    }
  };

  const handleTileClick = async (index: number) => {
    if (!isActive || pendingTiles.has(index) || revealed.includes(index) || gameAbortedRef.current) return;
    setPendingTiles(prev => new Set(prev).add(index));
    try {
      const res = await fetch(`/api/mines/games/${gameId}/reveal`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tile: index }),
      });
      const data = await res.json();
      if (gameAbortedRef.current) return;
      if (data.busted) {
        gameAbortedRef.current = true;
        setPendingTiles(new Set());
        playSound('/mine.wav', 0.7);
        setShaking(true); setTimeout(() => setShaking(false), 450);
        setHitMineIdx(index); setMinePositions(data.minePositions);
        setPhase('exploded'); setStatusMsg('');
        addResult({ game: 'Mines', result: 'lose', amount: bet, profit: -bet, timestamp: Date.now() });
        refresh();
      } else if (data.safe) {
        setPendingTiles(prev => { const n = new Set(prev); n.delete(index); return n; });
        playSound('/ding.mp3', 0.6);
        setRevealed(prev => [...prev, index]);
        setJustRevealedIdx(index);
        setMultiplier(data.multiplier);
        setSafeReveals(data.picks);
        if (data.autoCashedOut) {
          playSound('/cashout.mp3', 0.7);
          setMinePositions(data.minePositions);
          setPayout(data.payout); setPhase('cashed_out'); setStatusMsg('');
          addResult({ game: 'Mines', result: 'win', amount: bet, profit: data.payout - bet, timestamp: Date.now() });
          refresh();
        }
      }
    } catch {
      setPendingTiles(prev => { const n = new Set(prev); n.delete(index); return n; });
    }
  };

  const handleCashout = async () => {
    if (!canCashout) return;
    setPhase('waiting'); setStatusMsg('Uitbetalen…');
    try {
      const res = await fetch(`/api/mines/games/${gameId}/cashout`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) { setError(data.error); setPhase('active'); setStatusMsg(''); return; }
      playSound('/cashout.mp3', 0.7);
      setMinePositions(data.minePositions);
      setPayout(data.payout); setPhase('cashed_out'); setStatusMsg('');
      addResult({ game: 'Mines', result: 'win', amount: bet, profit: data.payout - bet, timestamp: Date.now() });
      refresh();
    } catch { setError('Cashout mislukt'); setPhase('active'); setStatusMsg(''); }
  };

  const reset = (keepBet = true) => {
    setPhase('betting'); setGameId('');
    setRevealed([]); setMinePositions([]); setHitMineIdx(null); setPendingTiles(new Set());
    setSafeReveals(0); setMultiplier(1); setPayout(0);
    setError(null); setStatusMsg('');
    if (!keepBet) { setBet(0); setBetInput(''); }
  };

  useMobile();
  const resultColor = phase === 'cashed_out' ? '#4ade80' : '#f87171';
  const resultMsg =
    phase === 'cashed_out' ? `CASHED OUT  +€${(payout - bet).toFixed(2)}` :
    phase === 'exploded' ? `MIJN GERAAKT  −€${bet.toFixed(2)}` : '';

  const SideBtn = ({ label, onClick, disabled }: { label: string; onClick?: () => void; disabled?: boolean }) => (
    <button onClick={onClick} disabled={disabled} style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '13px 14px', borderRadius: 7, border: 'none',
      background: disabled ? 'rgba(255,255,255,0.03)' : 'rgba(34,197,94,0.15)',
      color: disabled ? 'rgba(255,255,255,0.2)' : '#4ade80',
      cursor: disabled ? 'default' : 'pointer',
      fontSize: 14, fontWeight: 700, transition: 'background 0.1s',
      outline: 'none', width: '100%',
    }}> {label} </button>
  );

  const labelStyle: React.CSSProperties = {
    fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.35)',
    marginBottom: 6, letterSpacing: '0.06em', textTransform: 'uppercase',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#0f1923' }}>
      <style>{MINES_STYLES}</style>
      <div className="game-container">
        {/* ── LINKER INZETPANEEL ── */}
        <div className="betting-panel" style={{ overflowY: 'auto' }}>
          <div>
            <div style={labelStyle}>Inzet</div>
            <div style={{ display: 'flex', alignItems: 'center', background: '#0e1c28', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 7, padding: '10px 12px', gap: 8 }}>
              <input
                type="number" min={0} max={MAX_BET} step={0.01} placeholder="0.00"
                value={betInput}
                onFocus={() => { inputFocused.current = true; setBetInput(bet > 0 ? bet.toFixed(2) : ''); }}
                onChange={e => {
                  const val = e.target.value; setBetInput(val);
                  const n = parseFloat(val);
                  setBet(!isNaN(n) && n >= 0 ? parseFloat(Math.min(MAX_BET, n).toFixed(2)) : 0);
                }}
                onBlur={() => { inputFocused.current = false; setBetInput(bet > 0 ? bet.toFixed(2) : ''); }}
                disabled={!isBetting}
                style={{ flex: 1, minWidth: 0, background: 'none', border: 'none', outline: 'none', color: '#fff', fontSize: 16, fontWeight: 500, MozAppearance: 'textfield' } as React.CSSProperties}
              />
              <EuroBadge size={18} />
              <button onClick={halveBet} disabled={!isBetting || bet <= 0} style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.55)', background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 5, padding: '4px 7px', cursor: 'pointer', opacity: (!isBetting || bet <= 0) ? 0.3 : 1, flexShrink: 0 }}>½</button>
              <button onClick={doubleBetVal} disabled={!isBetting} style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.55)', background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 5, padding: '4px 7px', cursor: 'pointer', opacity: !isBetting ? 0.3 : 1, flexShrink: 0 }}>2×</button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div>
              <div style={labelStyle}>Mijnen</div>
              <div style={{ display: 'flex', alignItems: 'center', height: 44, background: '#0e1c28', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 7, overflow: 'hidden' }}>
                <button onClick={() => isBetting && setMineCount(m => Math.max(1, m - 1))} disabled={!isBetting || mineCount <= 1}
                  style={{ padding: '0 12px', height: '100%', border: 'none', background: 'none', color: (!isBetting || mineCount <= 1) ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.65)', fontSize: 16, lineHeight: 1, cursor: (!isBetting || mineCount <= 1) ? 'default' : 'pointer', fontFamily: 'inherit' }}>−</button>
                <div style={{ flex: 1, textAlign: 'center', fontSize: 15, fontWeight: 600, color: '#fff' }}>{mineCount}</div>
                <button onClick={() => isBetting && setMineCount(m => Math.min(24, m + 1))} disabled={!isBetting || mineCount >= 24}
                  style={{ padding: '0 12px', height: '100%', border: 'none', background: 'none', color: (!isBetting || mineCount >= 24) ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.65)', fontSize: 16, lineHeight: 1, cursor: (!isBetting || mineCount >= 24) ? 'default' : 'pointer', fontFamily: 'inherit' }}>+</button>
              </div>
            </div>
            <div>
              <div style={labelStyle}>Gems</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 44, background: '#0e1c28', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 7 }}>
                <span style={{ fontSize: 15, fontWeight: 600, color: '#fff' }}>{isActive ? safeRemaining : safeTilesTotal}</span>
              </div>
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
              <div style={labelStyle}>Totale winst ({multiplier.toFixed(2)}×)</div>
              <div style={{ fontSize: 11, fontWeight: 600, color: isDone ? resultColor : 'rgba(255,255,255,0.35)' }}>
                {isDone ? (phase === 'cashed_out' ? `+€${(payout - bet).toFixed(2)}` : `−€${bet.toFixed(2)}`) : '—'}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', background: '#0e1c28', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 7, padding: '10px 12px', gap: 8 }}>
              <span style={{ flex: 1, fontSize: 16, fontWeight: 500, color: canCashout ? '#4ade80' : isDone ? resultColor : 'rgba(255,255,255,0.4)' }}>
                {canCashout ? `€${(bet * multiplier).toFixed(2)}` :
                 phase === 'cashed_out' ? `€${payout.toFixed(2)}` :
                 phase === 'exploded' ? '€0.00' : '€0.00'}
              </span>
              <EuroBadge size={18} />
            </div>
          </div>

          {isActive && (
            <SideBtn label={canCashout ? 'Cash Out' : 'Onthul eerst een tegel'} onClick={handleCashout} disabled={!canCashout} />
          )}
          {isBetting && (
            <button className="bet-button" onClick={startGame} disabled={!canDeal}>
              {bet < MIN_BET ? `Min €${MIN_BET}` : 'Speel'}
            </button>
          )}
          {isWaiting && <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: '13px 0' }}>{statusMsg || 'Bezig…'}</div>}

          {isDone && resultMsg && (
            <div style={{ fontSize: 13, fontWeight: 700, color: resultColor, textAlign: 'center', letterSpacing: '0.05em', padding: '4px 0' }}>{resultMsg}</div>
          )}
          {error && <div style={{ fontSize: 11, color: '#f87171', textAlign: 'center', lineHeight: 1.5 }}>{error}</div>}

          <div style={{ flex: 1 }} />
        </div>

        {/* ── RECHTER GRID ── */}
        <div className="mines-display-wrapper">
          <div className="mines-display">
            <div className="mines-grid" ref={gridRef} style={{ animation: shaking ? 'grid-shake 0.45s ease forwards' : 'none' }}>
              {Array.from({ length: GRID_SIZE }, (_, i) => (
                <Tile
                  key={i}
                  state={getTileState(i)}
                  onClick={() => handleTileClick(i)}
                  disabled={!isActive}
                  gameActive={isActive}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
