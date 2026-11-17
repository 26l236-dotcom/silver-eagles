import { useState } from 'react';
import { ArrowRight, BookOpen, Cpu, Globe, Layers, ShieldCheck } from 'lucide-react';
import type { ModuleId } from '../types';

const SDG4_TARGETS = [
  {
    code: 'Target 4.1',
    title: 'Free, Equitable & Quality Primary and Secondary Education',
    description:
      'Equip educators with instant AI-structured lesson blueprints so every classroom delivers active, high-retention learning regardless of prep bandwidth.',
    icon: BookOpen,
  },
  {
    code: 'Target 4.4',
    title: 'Relevant Technical, Digital & Vocational Skills',
    description:
      'Bridge software and physical computing by letting learners interact with Arduino Uno buzzer kits, Web Serial telemetry, and live data analytics.',
    icon: Cpu,
  },
  {
    code: 'Target 4.7',
    title: 'Education for Sustainable Development & Global Citizenship',
    description:
      'Embed climate literacy, renewable energy sorting challenges, and ethical technology debates directly into daily classroom activities.',
    icon: Globe,
  },
  {
    code: 'Target 4.a',
    title: 'Inclusive, Safe & Tech-Enabled Learning Environments',
    description:
      'Provide high-contrast Smartboard projector views, multi-theme accessibility palettes, and differentiated scaffolding for diverse learners.',
    icon: ShieldCheck,
  },
];

interface AboutSDG4Props {
  onNavigate: (module: ModuleId) => void;
}

export function AboutSDG4({ onNavigate }: AboutSDG4Props) {
  const [imgError, setImgError] = useState(false);

  return (
    <div className="max-w-[1440px] mx-auto px-4 lg:px-8 py-8 space-y-10">
      {/* Editorial Hero */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        <div
          className="lg:col-span-6 rounded-2xl p-7 sm:p-9 flex flex-col justify-between"
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-hairline)',
          }}
        >
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-semibold" style={{ color: 'var(--accent-primary)' }}>
              <span>PSG iTech IDEALAB</span>
              <span aria-hidden="true">·</span>
              <span>United Nations SDG 4</span>
            </div>

            <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight leading-tight [text-wrap:balance]">
              Engineering Joyful, Equitable Classrooms for Every Learner.
            </h1>

            <p className="text-sm sm:text-base leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              Born at the <strong>PSG iTech IDEALAB Innovation Hub</strong>, SMARTFUN 360 unites generative pedagogical AI, multiplayer gamification, and affordable open-source Arduino hardware to advance <strong>UN Sustainable Development Goal 4: Quality Education</strong>.
            </p>
          </div>

          <div className="mt-8 pt-6 border-t flex flex-wrap gap-3" style={{ borderColor: 'var(--border-hairline)' }}>
            <button
              type="button"
              onClick={() => onNavigate('teacher')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold"
              style={{
                backgroundColor: 'var(--accent-primary)',
                color: 'var(--accent-on-primary)',
              }}
            >
              Try Lesson Generator
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onNavigate('arduino')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold"
              style={{
                backgroundColor: 'var(--bg-elevated)',
                color: 'var(--text-primary)',
              }}
            >
              Inspect Hardware Kit
            </button>
          </div>
        </div>

        <div
          className="lg:col-span-6 rounded-2xl overflow-hidden min-h-[300px]"
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-hairline)',
          }}
        >
          {!imgError ? (
            <img
              src="/src/assets/images/idealab_innovation_hub_1794927375994.jpg"
              alt="Students and faculty collaborating inside the PSG iTech IDEALAB Innovation Hub"
              referrerPolicy="no-referrer"
              onError={() => setImgError(true)}
              className="w-full h-full object-cover"
            />
          ) : (
            <div
              className="w-full h-full flex flex-col items-center justify-center p-8 text-center"
              style={{ background: 'var(--hero-gradient)', color: '#ffffff' }}
            >
              <Layers className="w-12 h-12 mb-2" />
              <p className="font-display text-xl font-bold">PSG iTech IDEALAB</p>
            </div>
          )}
        </div>
      </section>

      {/* UN SDG 4 Targets Matrix */}
      <section className="space-y-5">
        <div>
          <h2 className="font-display text-2xl font-bold tracking-tight">
            UN SDG 4 Target Alignment
          </h2>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            How each technical subsystem in SMARTFUN 360 maps directly to global education targets
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {SDG4_TARGETS.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.code}
                className="rounded-2xl p-6 space-y-3"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border-hairline)',
                }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--accent-primary)' }}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-mono text-xs font-bold" style={{ color: 'var(--accent-primary)' }}>
                      {item.code}
                    </p>
                    <h3 className="font-display text-base font-bold">{item.title}</h3>
                  </div>
                </div>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {item.description}
                </p>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
