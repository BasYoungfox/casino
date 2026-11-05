'use client';

import React, { useRef, useEffect, useMemo } from 'react';

interface GameChartProps {
  phase: 'waiting' | 'active' | 'crashed';
  multiplier: number;
  elapsedTime: number; // in seconds
  countdown: number | null; // waiting countdown in seconds
  myCashout?: { multiplier: number; payout: number } | null;
  myBet?: { amount: number } | null;
  iAmBetting?: boolean;
}

export default function GameChart({ phase, multiplier, elapsedTime, countdown, myCashout, myBet, iAmBetting }: GameChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rocketRef = useRef<HTMLImageElement>(null);
  const exhaustRef = useRef<HTMLImageElement>(null);
  const explosionRef = useRef<HTMLImageElement>(null);
  const canvasSizeRef = useRef({ width: 0, height: 0, dpr: 1 });

  const maxTime = useMemo(() => Math.max(elapsedTime + 2, 8), [elapsedTime]);
  const maxMultiplier = useMemo(() => Math.max(multiplier * 1.3, 2), [multiplier]);

  const yAxisLabels = useMemo(() => {
    const roundedMax = Math.round(maxMultiplier * 10) / 10;
    const labels = [];
    const steps = 5;
    for (let i = steps; i >= 0; i--) {
      const value = 1 + ((roundedMax - 1) * i / steps);
      labels.push(value.toFixed(1));
    }
    return labels;
  }, [Math.round(maxMultiplier * 10)]);

  const xAxisLabels = useMemo(() => {
    const roundedMax = Math.ceil(maxTime);
    const labels = [];
    const step = Math.ceil(roundedMax / 4);
    for (let i = step; i <= roundedMax; i += step) {
      labels.push(i);
    }
    return labels;
  }, [Math.ceil(maxTime)]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const dpr = window.devicePixelRatio || 1;
        const { width, height } = entry.contentRect;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvasSizeRef.current = { width, height, dpr };
      }
    });
    observer.observe(canvas);
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvasSizeRef.current = { width: rect.width, height: rect.height, dpr };
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { width, height, dpr } = canvasSizeRef.current;
    if (width === 0 || height === 0) return;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const padding = { left: 60, right: 30, top: 50, bottom: 60 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const timeToX = (time: number) => padding.left + (time / maxTime) * chartWidth;
    const multiplierToY = (mult: number) => {
      const normalized = (mult - 1) / (maxMultiplier - 1);
      return height - padding.bottom - normalized * chartHeight;
    };

    ctx.strokeStyle = 'rgba(47, 69, 83, 0.25)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 6]);
    ctx.beginPath();
    for (let i = 0; i <= 5; i++) {
      const y = padding.top + (chartHeight * i / 5);
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
    }
    for (let i = 0; i <= 4; i++) {
      const x = padding.left + (chartWidth * i / 4);
      ctx.moveTo(x, padding.top);
      ctx.lineTo(x, height - padding.bottom);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    if ((phase === 'active' || phase === 'crashed') && elapsedTime > 0) {
      const numPoints = Math.min(200, Math.max(80, Math.floor(elapsedTime * 20)));
      const points = new Array(numPoints + 1);
      for (let i = 0; i <= numPoints; i++) {
        const t = i / numPoints;
        const currentTime = elapsedTime * t;
        const currentMult = Math.pow(Math.E, 0.1 * currentTime);
        const x = timeToX(currentTime);
        const y = Math.max(padding.top, multiplierToY(currentMult));
        points[i] = { x, y };
      }

      const fillGradient = ctx.createLinearGradient(padding.left, height - padding.bottom, timeToX(elapsedTime), multiplierToY(multiplier));
      if (phase === 'crashed') {
        fillGradient.addColorStop(0, 'rgba(237, 66, 69, 0.02)');
        fillGradient.addColorStop(0.5, 'rgba(237, 66, 69, 0.25)');
        fillGradient.addColorStop(1, 'rgba(237, 66, 69, 0.5)');
      } else {
        fillGradient.addColorStop(0, 'rgba(255, 165, 0, 0.02)');
        fillGradient.addColorStop(0.3, 'rgba(255, 165, 0, 0.15)');
        fillGradient.addColorStop(0.6, 'rgba(255, 180, 50, 0.35)');
        fillGradient.addColorStop(1, 'rgba(255, 200, 80, 0.6)');
      }
      ctx.beginPath();
      ctx.moveTo(padding.left, height - padding.bottom);
      ctx.lineTo(points[0].x, points[0].y);
      for (let i = 1; i <= numPoints; i++) ctx.lineTo(points[i].x, points[i].y);
      ctx.lineTo(points[numPoints].x, height - padding.bottom);
      ctx.closePath();
      ctx.fillStyle = fillGradient;
      ctx.fill();

      const lineColor = phase === 'crashed' ? '#ed4245' : '#f7931a';
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i <= numPoints; i++) ctx.lineTo(points[i].x, points[i].y);
      ctx.strokeStyle = phase === 'crashed' ? 'rgba(237, 66, 69, 0.15)' : 'rgba(247, 147, 26, 0.15)';
      ctx.lineWidth = 12;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.shadowColor = lineColor;
      ctx.shadowBlur = 10;
      ctx.stroke();

      ctx.shadowBlur = 0;
      const lineGradient = ctx.createLinearGradient(padding.left, 0, timeToX(elapsedTime), 0);
      if (phase === 'crashed') {
        lineGradient.addColorStop(0, '#f7931a');
        lineGradient.addColorStop(0.7, '#ed4245');
        lineGradient.addColorStop(1, '#ed4245');
      } else {
        lineGradient.addColorStop(0, '#f7931a');
        lineGradient.addColorStop(0.5, '#ffaa33');
        lineGradient.addColorStop(0.8, '#ffcc66');
        lineGradient.addColorStop(1, '#ffffff');
      }
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i <= numPoints; i++) ctx.lineTo(points[i].x, points[i].y);
      ctx.strokeStyle = lineGradient;
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();

      const endX = timeToX(elapsedTime);
      const endY = multiplierToY(multiplier);
      let angle = 0;
      if (numPoints >= 2) {
        const p1 = points[Math.max(0, numPoints - 10)];
        const p2 = points[numPoints];
        angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
      }
      if (rocketRef.current) {
        if (phase === 'active') {
          rocketRef.current.style.display = 'block';
          rocketRef.current.style.left = `${endX}px`;
          rocketRef.current.style.top = `${endY}px`;
          rocketRef.current.style.transform = `translate(-50%, -50%) rotate(${angle}rad) rotate(90deg)`;
        } else { rocketRef.current.style.display = 'none'; }
      }
      if (exhaustRef.current) {
        if (phase === 'active') {
          exhaustRef.current.style.display = 'block';
          exhaustRef.current.style.left = `${endX}px`;
          exhaustRef.current.style.top = `${endY}px`;
          exhaustRef.current.style.transform = `translate(-50%, -50%) rotate(${angle}rad) rotate(90deg) translate(0px, 95px)`;
        } else { exhaustRef.current.style.display = 'none'; }
      }
      if (explosionRef.current) {
        if (phase === 'crashed') {
          if (explosionRef.current.style.display !== 'block') {
            explosionRef.current.style.display = 'block';
            explosionRef.current.style.left = `${endX}px`;
            explosionRef.current.style.top = `${endY}px`;
            explosionRef.current.src = '/images/explosions/normal_explosion.gif?' + Date.now();
            setTimeout(() => { if (explosionRef.current) explosionRef.current.style.display = 'none'; }, 1000);
          }
        } else { explosionRef.current.style.display = 'none'; }
      }
    }
  }, [phase, multiplier, elapsedTime, maxTime, maxMultiplier]);

  const getMultiplierColor = () => {
    if (phase === 'crashed') return '#ed4245';
    if (multiplier >= 10) return '#00e701';
    if (multiplier >= 5) return '#ffc107';
    if (multiplier >= 2) return '#f7931a';
    return '#ffffff';
  };

  return (
    <div className="chart-container-antd" style={{ position: 'relative' }}>
      <canvas ref={canvasRef} className="crash-canvas" style={{ position: 'absolute', width: '100%', height: '100%' }} />
      <img ref={rocketRef} src="/images/spaceship.png" alt="Rocket" style={{ position: 'absolute', width: 105, height: 'auto', display: 'none', pointerEvents: 'none', zIndex: 10, filter: 'drop-shadow(0 0 10px rgba(247, 147, 26, 0.8))', willChange: 'transform, left, top' }} />
      <img ref={exhaustRef} src="/images/exhaust/exhaust02_preview.gif" alt="Exhaust" style={{ position: 'absolute', width: 150, height: 'auto', display: 'none', pointerEvents: 'none', zIndex: 9, mixBlendMode: 'screen', filter: 'hue-rotate(340deg) saturate(2)', imageRendering: 'pixelated', willChange: 'transform, left, top' }} />
      <img ref={explosionRef} src="/images/explosions/normal_explosion.gif" alt="Explosion" style={{ position: 'absolute', width: 250, height: 'auto', display: 'none', pointerEvents: 'none', zIndex: 11, transform: 'translate(-50%, -50%)', mixBlendMode: 'screen', imageRendering: 'pixelated' }} />

      <div className="y-axis-antd">
        {yAxisLabels.map((label, i) => (<div key={i} className="axis-label">{label}×</div>))}
      </div>
      <div className="x-axis-antd">
        {xAxisLabels.map(label => (<div key={label} className="x-label">{label}s</div>))}
        <div className="total-time-antd">Total {Math.floor(elapsedTime)}s</div>
      </div>

      <div className={`multiplier-container ${phase === 'crashed' ? 'crashed' : ''}`}>
        {phase === 'waiting' ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>
              {countdown === null ? 'Plaats een inzet om te starten' : 'Volgende ronde begint over'}
            </div>
            {countdown !== null && <div style={{ fontSize: 64, fontWeight: 800, color: 'var(--text-primary)' }}>{countdown}s</div>}
          </div>
        ) : (
          <h1 className="multiplier-title" style={{ color: getMultiplierColor(), margin: 0, fontSize: 90, fontWeight: 800, letterSpacing: '-2px', textShadow: `0 0 40px ${getMultiplierColor()}50, 0 0 80px ${getMultiplierColor()}30`, transition: 'color 0.2s ease', fontFamily: "'Inter', -apple-system, sans-serif" }}>
            {multiplier.toFixed(2)}<span className="multiplier-suffix">×</span>
          </h1>
        )}
        {myCashout && <div style={{ marginTop: 10, fontSize: 14, color: '#4ade80', fontWeight: 700 }}>Uitbetaald op {myCashout.multiplier.toFixed(2)}× · +€{myCashout.payout.toFixed(2)}</div>}
        {phase === 'crashed' && iAmBetting && !myCashout && <div style={{ marginTop: 10, fontSize: 14, color: '#ed4245', fontWeight: 600 }}>Je verloor €{myBet?.amount.toFixed(2)}</div>}
      </div>

      {(phase === 'crashed' || (phase === 'waiting' && countdown !== null)) && (
        <div className="status-container">
          <div className={`status-tag ${phase === 'crashed' ? 'crashed' : 'waiting'}`}>
            {phase === 'waiting' ? `Starting in ${countdown ?? 0}s` : `Crashed @${multiplier.toFixed(2)}×`}
          </div>
        </div>
      )}
    </div>
  );
}
