import confetti from 'canvas-confetti';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  Award,
  CheckCircle2,
  Crown,
  Monitor,
  Play,
  Plus,
  RotateCcw,
  Sparkles,
  SkipForward,
  Trophy,
  Users,
  Volume2,
  VolumeX,
  X,
  XCircle,
} from 'lucide-react';
import { STUDENT_AVATARS } from '../data/blueprints';
import type { AuthUser, ModuleId, QuizQuestion, QuizRoomState, SquadColor } from '../types';
import { soundEngine } from '../utils/audio';

const OPTION_STYLES: Array<{
  label: string;
  shape: string;
  bg: string;
  squad: SquadColor;
}> = [
  { label: 'A', shape: '▲', bg: '#DC2626', squad: 'red' },
  { label: 'B', shape: '◆', bg: '#2563EB', squad: 'blue' },
  { label: 'C', shape: '●', bg: '#D97706', squad: 'yellow' },
  { label: 'D', shape: '■', bg: '#16A34A', squad: 'green' },
];

interface QuizBuzzLiveProps {
  user: AuthUser;
  onNavigate: (module: ModuleId) => void;
}

export function QuizBuzzLive({ user, onNavigate }: QuizBuzzLiveProps) {
  const [roomPin, setRoomPin] = useState(user.roomPin || '360360');
  const [viewMode, setViewMode] = useState<'host' | 'student'>(
    user.role === 'student' ? 'student' : 'host'
  );
  const [room, setRoom] = useState<QuizRoomState | null>(null);
  const [muted, setMuted] = useState(false);

  // Student join state
  const [playerId] = useState(() => `st-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`);
  const [joined, setJoined] = useState(false);
  const [studentName, setStudentName] = useState(user.name);
  const [studentAvatar, setStudentAvatar] = useState(user.avatar || '🚀');
  const [studentSquad, setStudentSquad] = useState<SquadColor>('blue');
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [answerFeedback, setAnswerFeedback] = useState<{ correct: boolean; message: string } | null>(null);

  // Quiz Builder Studio Modal state
  const [studioOpen, setStudioOpen] = useState(false);
  const [newQuestion, setNewQuestion] = useState('');
  const [optA, setOptA] = useState('');
  const [optB, setOptB] = useState('');
  const [optC, setOptC] = useState('');
  const [optD, setOptD] = useState('');
  const [correctIdx, setCorrectIdx] = useState(0);
  const [timeLimit, setTimeLimit] = useState(20);
  const [explanation, setExplanation] = useState('');

  const fetchRoom = useCallback(async () => {
    try {
      const res = await fetch(`/api/quiz/${encodeURIComponent(roomPin)}`);
      if (res.ok) {
        const data = (await res.json()) as QuizRoomState;
        setRoom(data);
      }
    } catch {
      // ignore transient poll failure
    }
  }, [roomPin]);

  useEffect(() => {
    void fetchRoom();
    const timer = setInterval(() => {
      void fetchRoom();
    }, 1200);
    return () => clearInterval(timer);
  }, [fetchRoom]);

  // Reset student round selection when question index or status changes
  const activeQId = room?.question?.id;
  const roomStatus = room?.status;
  useEffect(() => {
    setSelectedOption(null);
    setAnswerFeedback(null);
  }, [activeQId, roomStatus === 'lobby']);

  useEffect(() => {
    if (room?.status === 'podium') {
      soundEngine.playVictory();
      void confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 } });
    }
  }, [room?.status]);

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    soundEngine.muted = next;
  };

  const handleHostAction = async (
    action: 'start' | 'next' | 'reveal' | 'podium' | 'reset' | 'jump',
    questionIndex?: number
  ) => {
    const res = await fetch(`/api/quiz/${encodeURIComponent(roomPin)}/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, questionIndex }),
    });
    if (res.ok) {
      const updated = (await res.json()) as QuizRoomState;
      setRoom(updated);
      if (action === 'reveal') {
        soundEngine.playCorrect();
      }
    }
  };

  const handleTriggerConfetti = () => {
    soundEngine.playVictory();
    void confetti({ particleCount: 110, spread: 80, origin: { y: 0.55 } });
  };

  const handleStudentJoin = async (e?: FormEvent) => {
    e?.preventDefault();
    const res = await fetch(`/api/quiz/${encodeURIComponent(roomPin)}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        playerId,
        name: studentName.trim() || user.name,
        avatar: studentAvatar,
        squad: studentSquad,
      }),
    });
    if (res.ok) {
      const data = (await res.json()) as { room: QuizRoomState };
      setRoom(data.room);
      setJoined(true);
      soundEngine.playBuzzer(1);
    }
  };

  const handleStudentAnswer = async (optionIdx: number) => {
    if (!joined) {
      await handleStudentJoin();
    }
    if (selectedOption !== null || room?.status !== 'question') return;

    setSelectedOption(optionIdx);
    soundEngine.playBuzzer(optionIdx);

    const responseTimeMs = room.questionStartedAt
      ? Math.max(300, Date.now() - room.questionStartedAt)
      : 4500;

    const res = await fetch(`/api/quiz/${encodeURIComponent(roomPin)}/answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        playerId,
        optionIndex: optionIdx,
        responseTimeMs,
      }),
    });

    if (res.ok) {
      const data = (await res.json()) as { isCorrect?: boolean; room: QuizRoomState };
      setRoom(data.room);
      if (data.isCorrect) {
        soundEngine.playCorrect();
        setAnswerFeedback({ correct: true, message: 'Spot on! Speed bonus + streak XP awarded.' });
      } else {
        soundEngine.playWrong();
        setAnswerFeedback({ correct: false, message: 'Answer locked! Check the explanation on reveal.' });
      }
    }
  };

  const handleAddCustomQuestion = async (e: FormEvent) => {
    e.preventDefault();
    if (!newQuestion.trim() || !optA.trim() || !optB.trim() || !optC.trim() || !optD.trim()) {
      return;
    }
    const q: QuizQuestion = {
      id: `custom-${Date.now()}`,
      topic: room?.topic || 'Custom Classroom Quiz',
      question: newQuestion.trim(),
      options: [optA.trim(), optB.trim(), optC.trim(), optD.trim()],
      correctIndex: correctIdx,
      timeLimit,
      explanation: explanation.trim() || 'Discussed live with the classroom.',
    };

    const res = await fetch(`/api/quiz/${encodeURIComponent(roomPin)}/questions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questions: [q], replace: false }),
    });

    if (res.ok) {
      const updated = (await res.json()) as QuizRoomState;
      setRoom(updated);
      setNewQuestion('');
      setOptA('');
      setOptB('');
      setOptC('');
      setOptD('');
      setExplanation('');
      setStudioOpen(false);
    }
  };

  const topPlayers = (room?.players || []).slice(0, 3);
  const currentQ = room?.question;

  return (
    <div className="max-w-[1440px] mx-auto px-4 lg:px-8 py-8 space-y-6">
      {/* Arena Header & Controls */}
      <section
        className="rounded-2xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-hairline)',
        }}
      >
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold" style={{ color: 'var(--accent-primary)' }}>
            <span>QuizBuzz Live Multiplayer</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">Room PIN {roomPin}</span>
            <span aria-hidden="true">·</span>
            <span>{room?.players.length || 0} Players Connected</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight mt-1">
            {room?.topic || 'STEM & UN SDG 4 Challenge'}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <div
            className="flex items-center gap-1 p-1 rounded-xl"
            style={{ backgroundColor: 'var(--bg-elevated)' }}
          >
            <button
              type="button"
              onClick={() => setViewMode('host')}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap"
              style={{
                backgroundColor: viewMode === 'host' ? 'var(--bg-surface)' : 'transparent',
                color: viewMode === 'host' ? 'var(--text-primary)' : 'var(--text-muted)',
              }}
            >
              Teacher Host View
            </button>
            <button
              type="button"
              onClick={() => setViewMode('student')}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap"
              style={{
                backgroundColor: viewMode === 'student' ? 'var(--bg-surface)' : 'transparent',
                color: viewMode === 'student' ? 'var(--text-primary)' : 'var(--text-muted)',
              }}
            >
              Student Arena View
            </button>
          </div>

          <button
            type="button"
            onClick={toggleMute}
            className="p-2.5 rounded-xl"
            style={{
              backgroundColor: 'var(--bg-elevated)',
              color: 'var(--text-secondary)',
            }}
            aria-label={muted ? 'Unmute sound effects' : 'Mute sound effects'}
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={() => onNavigate('smartboard')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap"
            style={{
              backgroundColor: 'var(--bg-elevated)',
              color: 'var(--text-primary)',
            }}
          >
            <Monitor className="w-3.5 h-3.5" />
            Project on Smartboard
          </button>
        </div>
      </section>

      {/* Podium Screen (Shared Celebration View when status === 'podium') */}
      {room?.status === 'podium' ? (
        <section
          className="rounded-2xl p-8 text-center space-y-8"
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-hairline)',
          }}
        >
          <div className="space-y-2">
            <Crown className="w-10 h-10 mx-auto text-amber-400" />
            <h2 className="font-display text-3xl sm:text-4xl font-bold">Final Championship Podium</h2>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              XP and squad mastery scores synced to classroom analytics
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto items-end">
            {[1, 0, 2].map((rankIdx) => {
              const p = topPlayers[rankIdx];
              if (!p) return null;
              const place = rankIdx === 0 ? '1st Place' : rankIdx === 1 ? '2nd Place' : '3rd Place';
              const heightClass = rankIdx === 0 ? 'sm:py-10' : rankIdx === 1 ? 'sm:py-7' : 'sm:py-5';
              return (
                <div
                  key={p.id}
                  className={`rounded-2xl p-5 ${heightClass}`}
                  style={{
                    backgroundColor: rankIdx === 0 ? 'var(--bg-elevated)' : 'var(--bg-canvas)',
                    border: rankIdx === 0 ? '1px solid var(--accent-primary)' : '1px solid var(--border-hairline)',
                  }}
                >
                  <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--accent-primary)' }}>
                    {place}
                  </p>
                  <div className="text-4xl my-3">{p.avatar}</div>
                  <p className="font-display text-lg font-bold">{p.name}</p>
                  <p className="text-xs capitalize mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    {p.squad} Squad
                  </p>
                  <p className="font-mono text-2xl font-bold mt-3 tabular-nums" style={{ color: 'var(--accent-primary)' }}>
                    {p.score} XP
                  </p>
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={handleTriggerConfetti}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold"
              style={{
                backgroundColor: 'var(--accent-primary)',
                color: 'var(--accent-on-primary)',
              }}
            >
              <Sparkles className="w-4 h-4" />
              Celebrate Again
            </button>
            <button
              type="button"
              onClick={() => void handleHostAction('reset')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold"
              style={{
                backgroundColor: 'var(--bg-elevated)',
                color: 'var(--text-primary)',
              }}
            >
              <RotateCcw className="w-4 h-4" />
              Reset Arena
            </button>
          </div>
        </section>
      ) : viewMode === 'host' ? (
        /* ================= TEACHER / HOST VIEW ================= */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Active Question Control Stage */}
          <div
            className="lg:col-span-8 rounded-2xl p-6 space-y-6"
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-hairline)',
            }}
          >
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b" style={{ borderColor: 'var(--border-hairline)' }}>
              <div className="flex flex-wrap items-center gap-3 text-xs font-semibold">
                <span>
                  Question {(room?.currentQuestionIndex ?? 0) + 1} of {room?.totalQuestions ?? 0}
                </span>
                {currentQ?.mandatory && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span
                      className="px-2 py-0.5 rounded-md text-[11px] font-bold"
                      style={{
                        backgroundColor: 'var(--bg-elevated)',
                        border: '1px solid var(--accent-primary)',
                        color: 'var(--accent-primary)',
                      }}
                    >
                      Mandatory Core
                    </span>
                  </>
                )}
                <span aria-hidden="true">·</span>
                <span className="capitalize" style={{ color: 'var(--accent-primary)' }}>
                  State: {room?.status || 'lobby'}
                </span>
                {room?.status === 'question' && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums text-amber-400">
                      {room.timeRemaining}s left
                    </span>
                  </>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setStudioOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold"
                  style={{
                    backgroundColor: 'var(--bg-elevated)',
                    color: 'var(--text-primary)',
                  }}
                >
                  <Plus className="w-3.5 h-3.5" />
                  Quiz Builder Studio
                </button>
                <button
                  type="button"
                  onClick={handleTriggerConfetti}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold"
                  style={{
                    backgroundColor: 'var(--bg-elevated)',
                    color: 'var(--text-primary)',
                  }}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Confetti
                </button>
              </div>
            </div>

            {currentQ ? (
              <div className="space-y-5">
                <h2 className="font-display text-2xl sm:text-3xl font-bold leading-snug">
                  {currentQ.question}
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {currentQ.options.map((opt, idx) => {
                    const style = OPTION_STYLES[idx];
                    const isCorrect = idx === currentQ.correctIndex;
                    const count = room?.answerCounts[idx] || 0;
                    const showReveal = room?.status === 'reveal';
                    return (
                      <div
                        key={idx}
                        className="p-4 rounded-xl flex items-center justify-between gap-3 transition-opacity"
                        style={{
                          backgroundColor: 'var(--bg-canvas)',
                          border:
                            showReveal && isCorrect
                              ? '2px solid #22C55E'
                              : '1px solid var(--border-hairline)',
                          opacity: showReveal && !isCorrect ? 0.55 : 1,
                        }}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0"
                            style={{ backgroundColor: style.bg }}
                          >
                            {style.shape}
                          </span>
                          <span className="text-sm font-semibold">{opt}</span>
                        </div>
                        <span className="font-mono text-xs font-bold tabular-nums shrink-0" style={{ color: 'var(--text-muted)' }}>
                          {count} votes
                        </span>
                      </div>
                    );
                  })}
                </div>

                {room?.status === 'reveal' && (
                  <div
                    className="p-4 rounded-xl text-xs leading-relaxed"
                    style={{
                      backgroundColor: 'var(--bg-elevated)',
                      border: '1px solid var(--border-hairline)',
                    }}
                  >
                    <span className="font-bold">Pedagogical Explanation: </span>
                    {currentQ.explanation}
                  </div>
                )}
              </div>
            ) : null}

            {/* Host Playback Controls */}
            <div className="flex flex-wrap items-center gap-2.5 pt-4 border-t" style={{ borderColor: 'var(--border-hairline)' }}>
              {room?.status === 'lobby' && (
                <button
                  type="button"
                  onClick={() => void handleHostAction('start')}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold"
                  style={{
                    backgroundColor: 'var(--accent-primary)',
                    color: 'var(--accent-on-primary)',
                  }}
                >
                  <Play className="w-4 h-4" />
                  Launch Question 1
                </button>
              )}

              {room?.status === 'question' && (
                <button
                  type="button"
                  onClick={() => void handleHostAction('reveal')}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold"
                  style={{
                    backgroundColor: 'var(--accent-primary)',
                    color: 'var(--accent-on-primary)',
                  }}
                >
                  Reveal Correct Answer
                </button>
              )}

              {(room?.status === 'reveal' || room?.status === 'question') && (
                <button
                  type="button"
                  onClick={() => void handleHostAction('next')}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold"
                  style={{
                    backgroundColor: 'var(--bg-elevated)',
                    color: 'var(--text-primary)',
                  }}
                >
                  <SkipForward className="w-4 h-4" />
                  {(room?.currentQuestionIndex ?? 0) + 1 < (room?.totalQuestions ?? 0)
                    ? 'Next Question'
                    : 'Finish & Show Podium'}
                </button>
              )}

              <button
                type="button"
                onClick={() => void handleHostAction('podium')}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold"
                style={{
                  backgroundColor: 'var(--bg-elevated)',
                  color: 'var(--text-secondary)',
                }}
              >
                <Trophy className="w-3.5 h-3.5" />
                Podium
              </button>

              <button
                type="button"
                onClick={() => void handleHostAction('reset')}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold"
                style={{
                  backgroundColor: 'var(--bg-canvas)',
                  border: '1px solid var(--border-hairline)',
                  color: 'var(--text-secondary)',
                }}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset
              </button>
            </div>

            {/* Queued QuizBuzz Deck (Mandatory + Topic Questions) */}
            {room && room.questions.length > 0 && (
              <div className="pt-4 border-t space-y-2.5" style={{ borderColor: 'var(--border-hairline)' }}>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                    QuizBuzz Question Deck ({room.questions.filter((q) => q.mandatory).length} Mandatory · {room.questions.length} Total)
                  </span>
                  <span style={{ color: 'var(--text-muted)' }}>Click any row to launch live</span>
                </div>
                <div className="grid grid-cols-1 gap-1.5 max-h-[240px] overflow-y-auto pr-1">
                  {room.questions.map((item, idx) => {
                    const isActive = idx === room.currentQuestionIndex;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => void handleHostAction('jump', idx)}
                        className="w-full text-left px-3 py-2.5 rounded-xl flex items-center justify-between gap-3 transition-colors"
                        style={{
                          backgroundColor: isActive ? 'var(--bg-elevated)' : 'var(--bg-canvas)',
                          border: isActive
                            ? '1px solid var(--accent-primary)'
                            : '1px solid var(--border-hairline)',
                        }}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="font-mono text-xs font-bold shrink-0" style={{ color: 'var(--accent-primary)' }}>
                            Q{idx + 1}
                          </span>
                          <span className="text-xs font-medium truncate">{item.question}</span>
                        </div>
                        {item.mandatory && (
                          <span
                            className="shrink-0 text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded"
                            style={{
                              backgroundColor: 'var(--bg-surface)',
                              color: 'var(--accent-primary)',
                              border: '1px solid var(--border-hairline)',
                            }}
                          >
                            Mandatory
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Live Squad & Player Leaderboard */}
          <aside
            className="lg:col-span-4 rounded-2xl p-5 space-y-5"
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-hairline)',
            }}
          >
            <div>
              <h3 className="font-display text-base font-bold flex items-center gap-2">
                <Users className="w-4 h-4" style={{ color: 'var(--accent-primary)' }} />
                Live Squad Standings
              </h3>
              <div className="grid grid-cols-2 gap-2.5 mt-3">
                {(['red', 'blue', 'green', 'yellow'] as SquadColor[]).map((sq) => (
                  <div
                    key={sq}
                    className="p-3 rounded-xl"
                    style={{
                      backgroundColor: 'var(--bg-canvas)',
                      border: '1px solid var(--border-hairline)',
                    }}
                  >
                    <p className="text-[11px] font-bold uppercase">{sq} Squad</p>
                    <p className="font-mono text-lg font-bold tabular-nums mt-0.5">
                      {room?.squadScores[sq] || 0}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t space-y-2.5" style={{ borderColor: 'var(--border-hairline)' }}>
              <h4 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                Top Players
              </h4>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {(room?.players || []).map((p, i) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl"
                    style={{ backgroundColor: 'var(--bg-canvas)' }}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="font-mono text-xs w-4 text-center" style={{ color: 'var(--text-muted)' }}>
                        {i + 1}
                      </span>
                      <span className="text-base">{p.avatar}</span>
                      <div className="min-w-0">
                        <p className="text-xs font-bold truncate">{p.name}</p>
                        <p className="text-[10px] capitalize" style={{ color: 'var(--text-muted)' }}>
                          {p.squad} squad
                        </p>
                      </div>
                    </div>
                    <span className="font-mono text-xs font-bold tabular-nums" style={{ color: 'var(--accent-primary)' }}>
                      {p.score} XP
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      ) : (
        /* ================= STUDENT ARENA VIEW ================= */
        <section
          className="rounded-2xl p-6 sm:p-8 max-w-4xl mx-auto space-y-6"
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-hairline)',
          }}
        >
          {!joined ? (
            <form onSubmit={handleStudentJoin} className="space-y-5 max-w-lg mx-auto">
              <div className="text-center">
                <h2 className="font-display text-2xl font-bold">Join QuizBuzz Arena</h2>
                <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                  Confirm your PIN, nickname, and squad color to buzz in live.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">Room PIN</label>
                  <input
                    type="text"
                    value={roomPin}
                    onChange={(e) => setRoomPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="w-full px-3.5 py-2.5 rounded-xl text-sm font-mono tabular-nums"
                    style={{
                      backgroundColor: 'var(--bg-canvas)',
                      border: '1px solid var(--border-hairline)',
                    }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Nickname</label>
                  <input
                    type="text"
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl text-sm"
                    style={{
                      backgroundColor: 'var(--bg-canvas)',
                      border: '1px solid var(--border-hairline)',
                    }}
                  />
                </div>
              </div>

              <div>
                <span className="block text-xs font-semibold mb-1.5">Avatar</span>
                <div className="grid grid-cols-8 gap-1.5">
                  {STUDENT_AVATARS.map((emo) => (
                    <button
                      key={emo}
                      type="button"
                      onClick={() => setStudentAvatar(emo)}
                      className="h-10 rounded-lg text-lg flex items-center justify-center"
                      style={{
                        backgroundColor: studentAvatar === emo ? 'var(--bg-elevated)' : 'var(--bg-canvas)',
                        border: studentAvatar === emo ? '2px solid var(--accent-primary)' : '1px solid var(--border-hairline)',
                      }}
                    >
                      {emo}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className="block text-xs font-semibold mb-1.5">Choose Squad</span>
                <div className="grid grid-cols-4 gap-2">
                  {(['red', 'blue', 'green', 'yellow'] as SquadColor[]).map((sq) => (
                    <button
                      key={sq}
                      type="button"
                      onClick={() => setStudentSquad(sq)}
                      className="py-2 rounded-xl text-xs font-bold uppercase"
                      style={{
                        backgroundColor: studentSquad === sq ? 'var(--accent-primary)' : 'var(--bg-canvas)',
                        color: studentSquad === sq ? 'var(--accent-on-primary)' : 'var(--text-secondary)',
                        border: '1px solid var(--border-hairline)',
                      }}
                    >
                      {sq}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl text-sm font-bold"
                style={{
                  backgroundColor: 'var(--accent-primary)',
                  color: 'var(--accent-on-primary)',
                }}
              >
                Enter Live Room
              </button>
            </form>
          ) : room?.status === 'lobby' ? (
            <div className="text-center py-12 space-y-4">
              <div className="text-5xl">{studentAvatar}</div>
              <h2 className="font-display text-2xl font-bold">
                You’re in, {studentName}!
              </h2>
              <p className="text-sm max-w-md mx-auto" style={{ color: 'var(--text-secondary)' }}>
                Assigned to <strong>{studentSquad.toUpperCase()} Squad</strong> in Room PIN <span className="font-mono">{roomPin}</span>. Waiting for your teacher to launch Question 1—or switch to Host View above to test launching right now.
              </p>
            </div>
          ) : currentQ ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between text-xs font-semibold">
                <div className="flex items-center gap-2">
                  <span>
                    Question {(room?.currentQuestionIndex ?? 0) + 1} / {room?.totalQuestions ?? 0}
                  </span>
                  {currentQ.mandatory && (
                    <span
                      className="px-2 py-0.5 rounded text-[10px] font-bold uppercase"
                      style={{
                        backgroundColor: 'var(--bg-elevated)',
                        color: 'var(--accent-primary)',
                        border: '1px solid var(--border-hairline)',
                      }}
                    >
                      Mandatory
                    </span>
                  )}
                </div>
                <span className="font-mono tabular-nums text-sm" style={{ color: 'var(--accent-primary)' }}>
                  {room?.timeRemaining ?? 0}s
                </span>
              </div>

              <h2 className="font-display text-xl sm:text-2xl font-bold leading-snug">
                {currentQ.question}
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {currentQ.options.map((opt, idx) => {
                  const st = OPTION_STYLES[idx];
                  const isSelected = selectedOption === idx;
                  const isCorrectReveal = room?.status === 'reveal' && idx === currentQ.correctIndex;
                  return (
                    <button
                      key={idx}
                      type="button"
                      disabled={selectedOption !== null || room?.status !== 'question'}
                      onClick={() => void handleStudentAnswer(idx)}
                      className="p-5 rounded-2xl text-left text-white font-bold transition-transform active:scale-[0.98] flex items-center gap-3.5 min-h-[76px] disabled:opacity-80"
                      style={{
                        backgroundColor: st.bg,
                        outline: isSelected ? '3px solid #ffffff' : isCorrectReveal ? '3px solid #22C55E' : 'none',
                      }}
                    >
                      <span className="text-xl shrink-0">{st.shape}</span>
                      <span className="text-sm sm:text-base">{opt}</span>
                    </button>
                  );
                })}
              </div>

              {answerFeedback && (
                <div
                  className="p-4 rounded-xl flex items-center gap-3 text-sm font-semibold"
                  style={{ backgroundColor: 'var(--bg-elevated)' }}
                >
                  {answerFeedback.correct ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-400 shrink-0" />
                  )}
                  <span>{answerFeedback.message}</span>
                </div>
              )}

              {room?.status === 'reveal' && (
                <div className="p-4 rounded-xl text-xs" style={{ backgroundColor: 'var(--bg-canvas)', border: '1px solid var(--border-hairline)' }}>
                  <strong>Answer Insight: </strong>
                  {currentQ.explanation}
                </div>
              )}
            </div>
          ) : null}
        </section>
      )}

      {/* Quiz Builder Studio Modal */}
      {studioOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-xl rounded-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto"
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-hairline)',
            }}
          >
            <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: 'var(--border-hairline)' }}>
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5" style={{ color: 'var(--accent-primary)' }} />
                <h2 className="font-display text-lg font-bold">Quiz Builder Studio</h2>
              </div>
              <button
                type="button"
                onClick={() => setStudioOpen(false)}
                className="p-1.5 rounded-lg"
                style={{ backgroundColor: 'var(--bg-elevated)' }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddCustomQuestion} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1">Question Prompt</label>
                <input
                  type="text"
                  required
                  value={newQuestion}
                  onChange={(e) => setNewQuestion(e.target.value)}
                  placeholder="e.g., What happens to kinetic energy when velocity doubles?"
                  className="w-full px-3.5 py-2.5 rounded-xl text-sm"
                  style={{
                    backgroundColor: 'var(--bg-canvas)',
                    border: '1px solid var(--border-hairline)',
                  }}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { label: 'Option A (Red)', val: optA, set: setOptA },
                  { label: 'Option B (Blue)', val: optB, set: setOptB },
                  { label: 'Option C (Yellow)', val: optC, set: setOptC },
                  { label: 'Option D (Green)', val: optD, set: setOptD },
                ].map((item, idx) => (
                  <div key={idx}>
                    <label className="block text-xs font-semibold mb-1">{item.label}</label>
                    <input
                      type="text"
                      required
                      value={item.val}
                      onChange={(e) => item.set(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl text-sm"
                      style={{
                        backgroundColor: 'var(--bg-canvas)',
                        border: '1px solid var(--border-hairline)',
                      }}
                    />
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">Correct Option</label>
                  <select
                    value={correctIdx}
                    onChange={(e) => setCorrectIdx(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl text-sm"
                    style={{
                      backgroundColor: 'var(--bg-canvas)',
                      border: '1px solid var(--border-hairline)',
                    }}
                  >
                    <option value={0}>Option A</option>
                    <option value={1}>Option B</option>
                    <option value={2}>Option C</option>
                    <option value={3}>Option D</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">Time Limit (seconds)</label>
                  <select
                    value={timeLimit}
                    onChange={(e) => setTimeLimit(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl text-sm"
                    style={{
                      backgroundColor: 'var(--bg-canvas)',
                      border: '1px solid var(--border-hairline)',
                    }}
                  >
                    <option value={15}>15s</option>
                    <option value={20}>20s</option>
                    <option value={30}>30s</option>
                    <option value={45}>45s</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Explanation (Shown on Reveal)</label>
                <input
                  type="text"
                  value={explanation}
                  onChange={(e) => setExplanation(e.target.value)}
                  placeholder="e.g., Kinetic energy scales with velocity squared (KE = 1/2 mv^2)."
                  className="w-full px-3.5 py-2 rounded-xl text-sm"
                  style={{
                    backgroundColor: 'var(--bg-canvas)',
                    border: '1px solid var(--border-hairline)',
                  }}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setStudioOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold"
                  style={{ backgroundColor: 'var(--bg-elevated)' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold"
                  style={{
                    backgroundColor: 'var(--accent-primary)',
                    color: 'var(--accent-on-primary)',
                  }}
                >
                  Add to Room {roomPin}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
