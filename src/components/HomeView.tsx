import { useEffect, useState } from 'react';
import {
  ArrowRight,
  Bot,
  Box,
  Cpu,
  Gamepad2,
  Monitor,
  Sparkles,
  Trophy,
  Zap,
} from 'lucide-react';
import type { AuthUser, ModuleId } from '../types';

interface HomeViewProps {
  user: AuthUser;
  onNavigate: (module: ModuleId) => void;
}

function useAnimatedCounter(target: number, durationMs = 900) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    let frameId = 0;
    const start = performance.now();
    const step = (now: number) => {
      const progress = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * eased));
      if (progress < 1) {
        frameId = requestAnimationFrame(step);
      }
    };
    frameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frameId);
  }, [target, durationMs]);

  return value;
}

export function HomeView({ user, onNavigate }: HomeViewProps) {
  const [imgError, setImgError] = useState(false);

  const activeSessions = useAnimatedCounter(148);
  const questionsAnswered = useAnimatedCounter(42680);
  const engagementScore = useAnimatedCounter(94);

  const platformModules: Array<{
    id: ModuleId;
    title: string;
    subtitle: string;
    icon: typeof Bot;
    actionLabel: string;
  }> = [
    {
      id: 'teacher',
      title: 'Make My Class Fun!',
      subtitle: 'Generate 45-minute interactive lesson blueprints with hooks, squad roles, and QuizBuzz questions.',
      icon: Zap,
      actionLabel: 'Open Generator',
    },
    {
      id: 'teachmate',
      title: 'TeachMate AI & Grounding',
      subtitle: 'Multi-model Gemini chat with Search & Google Maps grounding plus 8 specialized pedagogical tools.',
      icon: Bot,
      actionLabel: 'Launch Assistant',
    },
    {
      id: 'lab3d',
      title: '3D Interactive STEM Lab',
      subtitle: 'Explore rotatable, exploded-view Three.js models: Solar Microgrid, Arduino Buzzer Rig, and Carbon-12 Atom.',
      icon: Box,
      actionLabel: 'Enter 3D Lab',
    },
    {
      id: 'mediastudio',
      title: 'AI Media, Video & Voice Lab',
      subtitle: 'Create & edit classroom visuals, generate or animate STEM videos, talk with Live Voice AI, and transcribe audio.',
      icon: Sparkles,
      actionLabel: 'Open Media Lab',
    },
    {
      id: 'student',
      title: 'Student Zone & Mini-Games',
      subtitle: '5 playable STEM mini-games with XP leveling, streak multipliers, and achievement badges.',
      icon: Gamepad2,
      actionLabel: 'Play Mini-Games',
    },
    {
      id: 'smartboard',
      title: 'Smartboard Projector Mode',
      subtitle: 'High-contrast, oversized classroom screen synced to QuizBuzz Room PIN 360360.',
      icon: Monitor,
      actionLabel: 'Open Projector View',
    },
    {
      id: 'arduino',
      title: 'Arduino Uno Buzzer Kit',
      subtitle: 'Connect 4 physical arcade push buttons over USB Web Serial API with 16x2 LCD feedback.',
      icon: Cpu,
      actionLabel: 'Connect Hardware',
    },
    {
      id: 'sdg4',
      title: 'UN SDG 4 & IDEALAB Mission',
      subtitle: 'Explore how SMARTFUN 360 advances UN SDG 4 Quality Education at PSG iTech IDEALAB.',
      icon: Trophy,
      actionLabel: 'Explore Mission',
    },
  ];

  return (
    <div className="max-w-[1440px] mx-auto px-4 lg:px-8 py-8 lg:py-12 space-y-12">
      {/* Hero Split */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        <div className="lg:col-span-6 flex flex-col justify-center space-y-6">
          <div className="flex items-center gap-2 text-xs font-semibold" style={{ color: 'var(--accent-primary)' }}>
            <span>IDEALAB Innovation Hub</span>
            <span aria-hidden="true">·</span>
            <span>UN SDG 4 Quality Education</span>
            <span aria-hidden="true">·</span>
            <span>Signed in as {user.name}</span>
          </div>

          <h1 className="font-display text-4xl sm:text-5xl xl:text-[54px] font-bold tracking-tight leading-[1.08] [text-wrap:balance]">
            Traditional Teaching Ends Here.{' '}
            <span className="accent-gradient-text">Interactive Learning Begins.</span>
          </h1>

          <p className="text-base sm:text-lg leading-relaxed max-w-2xl" style={{ color: 'var(--text-secondary)' }}>
            Transform passive lectures into active squad collaborations with server-side Gemini AI lesson generators, real-time QuizBuzz multiplayer arenas, Smartboard displays, and physical Arduino Uno classroom buzzers.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => onNavigate('teacher')}
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl text-sm font-bold transition-opacity hover:opacity-90 whitespace-nowrap"
              style={{
                backgroundColor: 'var(--accent-primary)',
                color: 'var(--accent-on-primary)',
              }}
            >
              Open Teacher Cockpit
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => onNavigate('quizbuzz')}
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl text-sm font-bold transition-colors whitespace-nowrap"
              style={{
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-hairline)',
                color: 'var(--text-primary)',
              }}
            >
              Enter QuizBuzz Arena (PIN 360360)
            </button>
          </div>
        </div>

        {/* High-Fidelity Smart Classroom Visual Showcase */}
        <div className="lg:col-span-6">
          <div
            className="relative h-full min-h-[340px] lg:min-h-[430px] rounded-2xl overflow-hidden"
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-hairline)',
            }}
          >
            {!imgError ? (
              <img
                src="/src/assets/images/hero_smart_classroom_1794927375482.jpg"
                alt="Futuristic smart classroom featuring an interactive digital smartboard and collaborative student squads"
                referrerPolicy="no-referrer"
                onError={() => setImgError(true)}
                className="w-full h-full object-cover"
              />
            ) : (
              <div
                className="w-full h-full flex flex-col items-center justify-center p-8 text-center"
                style={{ background: 'var(--hero-gradient)', color: '#ffffff' }}
              >
                <Monitor className="w-12 h-12 mb-3 opacity-90" />
                <p className="font-display font-bold text-xl">SMARTFUN 360 Smart Classroom</p>
                <p className="text-sm opacity-85 mt-1">Interactive Digital Board & Hardware Ecosystem</p>
              </div>
            )}

            {/* Measured contrast scrim + crisp interactive classroom preview cards */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent pointer-events-none" />

            <div className="absolute bottom-4 left-4 right-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-xl p-3.5 bg-slate-950/80 backdrop-blur-md border border-white/15 text-white">
                <p className="text-[11px] font-medium text-sky-300">Live QuizBuzz Prompt · PIN 360360</p>
                <p className="text-xs font-semibold mt-1 leading-snug">
                  Which cellular organelle converts light energy into glucose?
                </p>
                <div className="mt-2 flex items-center gap-3 text-[11px] text-slate-300 tabular-nums">
                  <span>4 Squads Ready</span>
                  <span aria-hidden="true">·</span>
                  <span>20s Round</span>
                </div>
              </div>

              <div className="rounded-xl p-3.5 bg-slate-950/80 backdrop-blur-md border border-white/15 text-white flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-emerald-300">Classroom Readiness</span>
                  <Trophy className="w-4 h-4 text-amber-300" />
                </div>
                <p className="text-xs font-semibold mt-1">
                  Gemini AI Blueprints + Arduino USB Buzzer Sync
                </p>
                <p className="text-[11px] text-slate-300 mt-1">
                  Zero-setup projector & mobile join
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Full-Width Metrics Row (below hero split) */}
      <section
        className="grid grid-cols-1 sm:grid-cols-3 gap-4 rounded-2xl p-6"
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-hairline)',
        }}
      >
        <div className="sm:pr-6 sm:border-r" style={{ borderColor: 'var(--border-hairline)' }}>
          <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
            Active Classroom Sessions (This Semester)
          </p>
          <p className="font-display text-3xl font-bold mt-1.5 tabular-nums">
            {activeSessions.toLocaleString()}
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--accent-primary)' }}>
            Across partner STEM & engineering labs
          </p>
        </div>

        <div className="sm:px-6 sm:border-r" style={{ borderColor: 'var(--border-hairline)' }}>
          <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
            Student Questions Answered Live
          </p>
          <p className="font-display text-3xl font-bold mt-1.5 tabular-nums">
            {questionsAnswered.toLocaleString()}
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
            Via QuizBuzz mobile & Arduino buzzers
          </p>
        </div>

        <div className="sm:pl-6">
          <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
            Measured Classroom Engagement Rate
          </p>
          <p className="font-display text-3xl font-bold mt-1.5 tabular-nums">
            {engagementScore}%
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
            Active squad participation per 45-min block
          </p>
        </div>
      </section>

      {/* Module Navigation Grid */}
      <section className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div>
            <h2 className="font-display text-2xl font-bold tracking-tight">
              Complete Interactive Classroom Suite
            </h2>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
              Every module is wired together—generate a lesson, push questions to QuizBuzz, and project live on Smartboard.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {platformModules.map((mod) => {
            const Icon = mod.icon;
            return (
              <button
                key={mod.id}
                type="button"
                onClick={() => onNavigate(mod.id)}
                className="group text-left rounded-2xl p-6 transition-transform duration-200 hover:-translate-y-0.5 flex flex-col justify-between"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border-hairline)',
                }}
              >
                <div>
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                    style={{
                      backgroundColor: 'var(--bg-elevated)',
                      color: 'var(--accent-primary)',
                    }}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-display text-lg font-bold tracking-tight">{mod.title}</h3>
                  <p className="text-sm mt-2 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    {mod.subtitle}
                  </p>
                </div>

                <div
                  className="mt-5 pt-4 border-t flex items-center justify-between text-xs font-semibold"
                  style={{ borderColor: 'var(--border-hairline)', color: 'var(--accent-primary)' }}
                >
                  <span>{mod.actionLabel}</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
