'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useBalance } from '@/components/providers/BalanceProvider';
import { multiplierAt, timeToReach } from '@/lib/crashMath';
import GameChart from './GameChart';

const MIN_BET = 0.5;
const MAX_BET = 1000;

const playSound = (src: string, volume = 1) => {
  try { const a = new Audio(src); a.volume = volume; a.play(); } catch { /* ignore */ }
};

function crashColor(x: number) {
  if (x < 1.5) return '#ef4444';
  if (x < 2) return '#f97316';
  if (x < 5) return '#60a5fa';
  return '#22c55e';
}

export default function CrashGame({ initialHistory = [] }: { initialHistory?: number[] }) {
  const { balance, refresh } = useBalance();

  const [bet, setBet] = useState(0);
  const [betInput, setBetInput] = useState('');
  const inputFocused = useRef(false);
  const [autoCashout, setAutoCashout] = useState('');
  const autoCashoutRef = useRef(0);
  const [phase, setPhase] = useState<'idle' | 'running' | 'ended'>('idle');
  const [outcome, setOutcome] = useState<'win' | 'crash' | null>(null);
  const [roundId, setRoundId] = useState<string | null>(null);
  const [displayMult, setDisplayMult] = useState(1);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [myCashout, setMyCashout] = useState<{ multiplier: number; payout: number } | null>(null);
  const [myBet, setMyBet] = useState<{ amount: number } | null>(null);
  const [history, setHistory] = useState<number[]>(initialHistory);
  const [placing, setPlacing] = useState(false);
  const [cashingOut, setCashingOut] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [error, setError] = useState('');

  const startTimeRef = useRef(0);
  const offsetRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const roundIdRef = useRef<string | null>(null);
  const cashingOutRef = useRef(false);
  const lastUpdateRef = useRef(0);
  const phaseRef = useRef<'idle' | 'running' | 'ended'>('idle');
  useEffect(() => { phaseRef.current = phase; }, [phase]);

  const running = phase === 'running';

  const stopLoops = useCallback(() => {
    if (rafRef.current !== null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    if (pollRef.current !== null) { clearInterval(pollRef.current); pollRef.current = null; }
  }, []);

  useEffect(() => () => stopLoops(), [stopLoops]);

  const settle = useCallback((kind: 'win' | 'crash', mult: number, payout: number) => {
    stopLoops();
    cashingOutRef.current = false;
    if (kind === 'win') playSound('/cashout.mp3', 0.7);
    else playSound('/mine-explosion.mp3', 0.7);
    roundIdRef.current = null;
    setOutcome(kind);
    setPhase('ended');
    setDisplayMult(mult);
    setElapsedTime(timeToReach(mult) / 1000);
    setHistory((h) => [mult, ...h].slice(0, 24));
    refresh();
  }, [stopLoops, refresh]);

  const startLoop = useCallback(() => {
    const tick = () => {
      const id = roundIdRef.current;
      if (id && phaseRef.current === 'running') {
        const serverNow = Date.now() + offsetRef.current;
        const elapsedMs = Math.max(0, serverNow - startTimeRef.current);
        const mult = multiplierAt(elapsedMs);
        const now = Date.now();
        if (now - lastUpdateRef.current > 33) {
          setDisplayMult(mult);
          setElapsedTime(elapsedMs / 1000);
          lastUpdateRef.current = now;
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const startPolling = useCallback((id: string) => {
    pollRef.current = setInterval(async () => {
      if (!roundIdRef.current) return;
      try {
        const res = await fetch(`/api/crash/rounds/${id}`);
        const data = await res.json();
        if (data.phase === 'crashed') {
          settle('crash', Number(data.multiplier), 0);
        } else if (data.phase === 'cashed_out') {
          settle('win', Number(data.multiplier), Number(data.payout) || 0);
          setMyCashout({ multiplier: Number(data.multiplier), payout: Number(data.payout) || 0 });
        } else if (data.phase === 'running') {
          // sync-anchor voor vloeiender animatie
          lastUpdateRef.current = Date.now();
        }
      } catch { /* ignore */ }
    }, 150);
  }, [settle]);

  const placeBet = async () => {
    setError(''); setStatusMsg('');
    if (bet < MIN_BET) return setError(`Minimum inzet is €${MIN_BET}`);
    if (bet > balance) return setError('Onvoldoende saldo');
    playSound('/bet.wav');
    setPlacing(true);
    try {
      const auto = autoCashoutRef.current > 1.01 ? autoCashoutRef.current : null;
      const res = await fetch('/api/crash/bet', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: bet, autoCashout: auto }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Inzet mislukt'); return; }
      const st = Date.parse(data.startTime);
      offsetRef.current = Date.parse(data.serverTime) - Date.now();
      startTimeRef.current = st;
      roundIdRef.current = data.roundId;
      setRoundId(data.roundId);
      setMyBet({ amount: bet });
      setMyCashout(null);
      setOutcome(null);
      setDisplayMult(1);
      setElapsedTime(0);
      lastUpdateRef.current = Date.now();
      setPhase('running');
      startLoop();
      startPolling(data.roundId);
      refresh();
    } catch {
      setError('Netwerkfout bij inzet.');
    } finally {
      setPlacing(false);
    }
  };

  const cashOut = async () => {
    const id = roundIdRef.current;
    if (!id || cashingOutRef.current) return;
    cashingOutRef.current = true;
    setCashingOut(true);
    stopLoops();
    try {
      const res = await fetch(`/api/crash/rounds/${id}/cashout`, { method: 'POST' });
      const data = await res.json();
      if (data.ok) {
        setMyCashout({ multiplier: Number(data.multiplier), payout: Number(data.payout) });
        settle('win', Number(data.multiplier), Number(data.payout));
      } else {
        settle('crash', Number(data.multiplier) || multRef(), 0);
      }
    } catch {
      setError('Netwerkfout bij cashout.');
      setPhase('running'); // probeer opnieuw
      startLoop();
      startPolling(id);
    } finally {
      setCashingOut(false);
    }
  };

  // multRef fallback: huidige displayMult via state is niet in closure; gebruik een ref-achtige via startTime
  function multRef() {
    const elapsedMs = Math.max(0, Date.now() + offsetRef.current - startTimeRef.current);
    return multiplierAt(elapsedMs);
  }

  useEffect(() => {
    if (!inputFocused.current) setBetInput(bet > 0 ? bet.toFixed(2) : '');
  }, [bet]);

  const halveBet = () => setBet(b => parseFloat(Math.max(MIN_BET, b / 2).toFixed(2)));
  const doubleBetVal = () => setBet(b => parseFloat(Math.min(MAX_BET, b > 0 ? b * 2 : MIN_BET).toFixed(2)));

  const canBet = !running && bet >= MIN_BET && balance >= bet;
  const canCashOut = running && !cashingOut;

  const chartPhase: 'waiting' | 'active' | 'crashed' =
    running ? 'active' : outcome === 'crash' ? 'crashed' : 'waiting';
  const iAmBetting = running && !!myBet && !myCashout;

  const labelStyle: React.CSSProperties = {
    fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.35)',
    marginBottom: 6, letterSpacing: '0.06em', textTransform: 'uppercase',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#0f1923' }}>
      <div className="game-container">
        {/* ── LINKER INZETPANEEL ── */}
        <div className="betting-panel" style={{ overflowY: 'auto' }}>
          <div>
            <div style={labelStyle}>Inzet</div>
            <div style={{ display: 'flex', alignItems: 'center', background: '#0e1c28', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 7, padding: '10px 12px', gap: 8 }}>
              <input
                type="number" min={MIN_BET} max={MAX_BET} step={0.01}
                placeholder="0.00"
                value={betInput}
                onFocus={() => { inputFocused.current = true; setBetInput(bet > 0 ? bet.toFixed(2) : ''); }}
                onChange={e => {
                  const val = e.target.value; setBetInput(val);
                  const n = parseFloat(val);
                  if (!isNaN(n) && n >= 0) setBet(parseFloat(Math.min(MAX_BET, n).toFixed(2)));
                  else setBet(0);
                }}
                onBlur={() => { inputFocused.current = false; setBetInput(bet > 0 ? bet.toFixed(2) : ''); }}
                disabled={running}
                style={{ flex: 1, minWidth: 0, background: 'none', border: 'none', outline: 'none', color: '#fff', fontSize: 16, fontWeight: 500, fontFamily: 'inherit', MozAppearance: 'textfield' } as React.CSSProperties}
              />
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', fontWeight: 600 }}>€</span>
              <button onClick={halveBet} disabled={running || bet <= 0} style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.55)', background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 5, padding: '4px 7px', cursor: 'pointer', fontFamily: 'inherit', opacity: (running || bet <= 0) ? 0.3 : 1, flexShrink: 0 }}>½</button>
              <button onClick={doubleBetVal} disabled={running} style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.55)', background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 5, padding: '4px 7px', cursor: 'pointer', fontFamily: 'inherit', opacity: running ? 0.3 : 1, flexShrink: 0 }}>2×</button>
            </div>
          </div>

          <div>
            <div style={labelStyle}>Auto Cashout</div>
            <div style={{ display: 'flex', alignItems: 'center', background: '#0e1c28', border: `1px solid ${autoCashoutRef.current >= 1.01 ? 'rgba(34,197,94,0.35)' : 'rgba(255,255,255,0.07)'}`, borderRadius: 7, padding: '10px 12px', gap: 8 }}>
              <input
                type="number" min={1.01} step={0.1}
                placeholder="Uit"
                value={autoCashout}
                disabled={running}
                onChange={e => {
                  setAutoCashout(e.target.value);
                  const n = parseFloat(e.target.value);
                  autoCashoutRef.current = !isNaN(n) && n >= 1.01 ? n : 0;
                }}
                style={{ flex: 1, minWidth: 0, background: 'none', border: 'none', outline: 'none', color: autoCashoutRef.current >= 1.01 ? '#22c55e' : '#fff', fontSize: 16, fontWeight: 500, fontFamily: 'inherit', MozAppearance: 'textfield' } as React.CSSProperties}
              />
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', fontWeight: 600 }}>×</span>
            </div>
          </div>

          {running ? (
            <button className="bet-button cashout" onClick={cashOut} disabled={!canCashOut}>
              {cashingOut ? 'Uitbetalen…' : `CASH OUT @ ${displayMult.toFixed(2)}×`}
            </button>
          ) : (
            <button className="bet-button" onClick={placeBet} disabled={!canBet}>
              {placing ? 'Bevestigen…' : bet < MIN_BET ? `Min €${MIN_BET}` : outcome ? 'Nog een ronde' : 'Plaats inzet'}
            </button>
          )}

          {outcome && (
            <div style={{ fontSize: 13, fontWeight: 700, textAlign: 'center', letterSpacing: '0.05em', padding: '4px 0', color: outcome === 'win' ? '#4ade80' : '#f87171' }}>
              {outcome === 'win' ? `WINST +€${((myCashout?.payout || 0) - bet).toFixed(2)}` : `CRASHED −€${bet.toFixed(2)}`}
            </div>
          )}
          {statusMsg && <div style={{ fontSize: 12, color: '#f87171', textAlign: 'center' }}>{statusMsg}</div>}
          {error && <div style={{ fontSize: 11, color: '#f87171', textAlign: 'center', lineHeight: 1.5 }}>{error}</div>}

          <div style={{ flex: 1 }} />
        </div>

        {/* ── RECHTER GRAFIEK ── */}
        <div className="game-display">
          <div className="game-history">
            {history.length === 0 && <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)' }}>Nog geen geschiedenis</span>}
            {history.map((x, i) => (
              <div key={i} className={`history-pill ${x >= 10 ? 'mega' : x >= 2 ? 'high' : 'low'}`} style={{ color: crashColor(x) }}>
                {x.toFixed(2)}×
              </div>
            ))}
          </div>

          <GameChart
            phase={chartPhase}
            multiplier={displayMult}
            elapsedTime={elapsedTime}
            countdown={null}
            myCashout={myCashout}
            myBet={myBet}
            iAmBetting={iAmBetting}
          />
        </div>
      </div>
    </div>
  );
}
