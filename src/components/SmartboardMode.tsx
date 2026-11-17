import { useEffect, useState } from 'react';
import { Maximize2, Minimize2, Play, SkipForward } from 'lucide-react';
import type { QuizRoomState, SquadColor } from '../types';

const SQUAD_META: Array<{ id: SquadColor; label: string; color: string }> = [
  { id: 'red', label: 'Red Squad', color: '#DC2626' },
  { id: 'blue', label: 'Blue Squad', color: '#2563EB' },
  { id: 'green', label: 'Green Squad', color: '#16A34A' },
  { id: 'yellow', label: 'Yellow Squad', color: '#D97706' },
];

export function SmartboardMode() {
  const [room, setRoom] = useState<QuizRoomState | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const pollRoom = async () => {
    try {
      const res = await fetch('/api/quiz/360360');
      if (res.ok) {
        setRoom((await res.json()) as QuizRoomState);
      }
    } catch {
      // ignore poll error
    }
  };

  useEffect(() => {
    void pollRoom();
    const id = setInterval(() => void pollRoom(), 1000);
    return () => clearInterval(id);
  }, []);

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const triggerAction = async (action: 'start' | 'reveal' | 'next') => {
    const res = await fetch('/api/quiz/360360/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    if (res.ok) {
      setRoom((await res.json()) as QuizRoomState);
    }
  };

  const q = room?.question;
  const maxTime = q?.timeLimit || 20;
  const timeRemaining = room?.timeRemaining ?? maxTime;
  const pct = Math.max(0, Math.min(1, timeRemaining / maxTime));
  const radius = 56;
  const circumference = 2 * Math.PI * radius;
  const strokeOffset = circumference * (1 - pct);

  const totalVotes = (room?.answerCounts || [0, 0, 0, 0]).reduce((a, b) => a + b, 0);

  return (
    <div className="max-w-[1440px] mx-auto px-4 lg:px-8 py-6 space-y-6">
      {/* Projector Top Strip */}
      <div
        className="rounded-2xl px-6 py-4 flex flex-wrap items-center justify-between gap-4"
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-hairline)',
        }}
      >
        <div className="flex items-center gap-4">
          <span className="font-display text-xl font-bold">Smartboard Projector</span>
          <span aria-hidden="true" style={{ color: 'var(--text-muted)' }}>·</span>
          <span className="font-mono text-lg font-bold tabular-nums" style={{ color: 'var(--accent-primary)' }}>
            JOIN PIN: 360360
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          {room?.status === 'lobby' ? (
            <button
              type="button"
              onClick={() => void triggerAction('start')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold"
              style={{ backgroundColor: 'var(--accent-primary)', color: 'var(--accent-on-primary)' }}
            >
              <Play className="w-3.5 h-3.5" />
              Start Round
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void triggerAction(room?.status === 'question' ? 'reveal' : 'next')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold"
              style={{ backgroundColor: 'var(--accent-primary)', color: 'var(--accent-on-primary)' }}
            >
              <SkipForward className="w-3.5 h-3.5" />
              {room?.status === 'question' ? 'Reveal Answer' : 'Next Round'}
            </button>
          )}

          <button
            type="button"
            onClick={() => void toggleFullscreen()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold"
            style={{ backgroundColor: 'var(--bg-elevated)' }}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          </button>
        </div>
      </div>

      {/* Main Oversized Projector Stage */}
      <div
        className="rounded-3xl p-8 sm:p-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center"
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-hairline)',
        }}
      >
        <div className="lg:col-span-9 space-y-6">
          <div className="flex items-center gap-3 text-sm font-semibold" style={{ color: 'var(--accent-primary)' }}>
            <span>{room?.topic || 'STEM Challenge'}</span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">
              Question {(room?.currentQuestionIndex ?? 0) + 1} of {room?.totalQuestions ?? 4}
            </span>
          </div>

          <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight">
            {q?.question || 'Waiting for next classroom question...'}
          </h1>

          {/* Live Answer Distribution Bars */}
          {q && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              {q.options.map((opt, idx) => {
                const count = room?.answerCounts[idx] || 0;
                const barPct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
                const colors = ['#DC2626', '#2563EB', '#D97706', '#16A34A'];
                const isWinner = room?.status === 'reveal' && idx === q.correctIndex;
                return (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl space-y-2"
                    style={{
                      backgroundColor: 'var(--bg-canvas)',
                      border: isWinner ? '2px solid #22C55E' : '1px solid var(--border-hairline)',
                    }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-base sm:text-lg font-bold">{opt}</span>
                      <span className="font-mono text-sm font-bold tabular-nums">{count}</span>
                    </div>
                    <div className="h-2.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-elevated)' }}>
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{ width: `${barPct}%`, backgroundColor: colors[idx] }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Oversized Circular Countdown Timer */}
        <div className="lg:col-span-3 flex flex-col items-center justify-center">
          <div className="relative w-40 h-40 flex items-center justify-center">
            <svg className="w-40 h-40 -rotate-90" viewBox="0 0 132 132">
              <circle
                cx="66"
                cy="66"
                r={radius}
                fill="none"
                stroke="var(--bg-elevated)"
                strokeWidth="10"
              />
              <circle
                cx="66"
                cy="66"
                r={radius}
                fill="none"
                stroke="var(--accent-primary)"
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeOffset}
                className="transition-all duration-500"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-mono text-4xl font-bold tabular-nums">
                {timeRemaining}
              </span>
              <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
                seconds
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 4 Squad Response Counters */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {SQUAD_META.map((sq) => (
          <div
            key={sq.id}
            className="rounded-2xl p-5 flex items-center justify-between"
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-hairline)',
            }}
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: sq.color }} />
                <span className="text-sm font-bold">{sq.label}</span>
              </div>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                Cumulative Score
              </p>
            </div>
            <span className="font-mono text-2xl font-bold tabular-nums">
              {room?.squadScores[sq.id] || 0}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
