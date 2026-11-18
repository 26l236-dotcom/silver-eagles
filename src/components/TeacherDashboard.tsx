import { useEffect, useRef, useState } from 'react';
import {
  Activity,
  BrainCircuit,
  Check,
  ChevronDown,
  Clock,
  Copy,
  Cpu,
  Flame,
  HelpCircle,
  History,
  Loader2,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  Send,
  Sparkles,
  Trash2,
  Users,
  Wand2,
  X,
  Zap,
} from 'lucide-react';
import { TEACHING_STYLES } from '../data/blueprints';
import type {
  AuthUser,
  FunLessonPlan,
  ModuleId,
  QuizQuestion,
  TeacherAiExecutionMeta,
  TeacherAiModelChoice,
  TeacherAiModelInfo,
  TeacherHistoryEntry,
} from '../types';
import { RichMathMarkdown } from './RichMathMarkdown';

interface TeacherDashboardProps {
  user: AuthUser;
  onNavigate: (module: ModuleId) => void;
}

const TEACHER_HISTORY_STORAGE_KEY = 'smartfun360_teacher_ai_history';

const DEFAULT_MODEL_CARDS: TeacherAiModelInfo[] = [
  {
    id: 'flash-lite',
    label: 'Gemini Flash Lite',
    modelId: 'gemini-3.1-flash-lite',
    tagline: 'Ultra-Fast Everyday Assistant',
    description:
      'Lightweight and fast responses for everyday classroom questions, quick definitions, and rapid quiz drills.',
    speedRating: 5,
    capabilityRating: 3,
    speedLabel: 'Ultra-Fast',
    capabilityLabel: 'Standard',
    bestFor: ['Quick Q&A', 'Rapid Quizzes', 'Warm-ups'],
    configurableEnvVar: 'GEMINI_FLASH_LITE_MODEL',
    requiresPaidTier: false,
    status: 'untested',
  },
  {
    id: 'argon',
    label: 'Gemini Argon',
    modelId: 'gemini-4-argon',
    tagline: 'Advanced Lesson & STEM Architect',
    description:
      'Configurable model option for advanced lesson planning, deep STEM derivations, and structured educational content.',
    speedRating: 3,
    capabilityRating: 5,
    speedLabel: 'Balanced',
    capabilityLabel: 'Advanced',
    bestFor: ['Lesson Planning', 'STEM Proofs', 'Curriculum Design'],
    configurableEnvVar: 'GEMINI_ARGON_MODEL',
    requiresPaidTier: true,
    status: 'untested',
  },
  {
    id: 'hydrogen',
    label: 'Gemini Hydrogen',
    modelId: 'gemini-4-hydrogen',
    tagline: 'Creative & Interactive Educator',
    description:
      'Configurable flagship model for creative teaching strategies, storytelling hooks, and interactive group learning.',
    speedRating: 4,
    capabilityRating: 5,
    speedLabel: 'Fast',
    capabilityLabel: 'High Reasoning',
    bestFor: ['Storytelling', 'Group Activities', 'Interactive Teaching'],
    configurableEnvVar: 'GEMINI_HYDROGEN_MODEL',
    requiresPaidTier: false,
    status: 'untested',
  },
];

function RatingBars({ value, max = 5, accent }: { value: number; max?: number; accent: string }) {
  return (
    <span className="inline-flex items-center gap-1" aria-hidden="true">
      {Array.from({ length: max }).map((_, idx) => (
        <span
          key={idx}
          className="h-1.5 w-3 rounded-full transition-colors"
          style={{
            backgroundColor: idx < value ? accent : 'rgba(255, 255, 255, 0.14)',
          }}
        />
      ))}
    </span>
  );
}

export function TeacherDashboard({ user, onNavigate }: TeacherDashboardProps) {
  const [topic, setTopic] = useState('');
  const [selectedStyle, setSelectedStyle] = useState(TEACHING_STYLES[0].id);
  const [selectedModelChoice, setSelectedModelChoice] = useState<TeacherAiModelChoice>('auto');
  const [models, setModels] = useState<TeacherAiModelInfo[]>(DEFAULT_MODEL_CARDS);
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);
  const [testingModels, setTestingModels] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [lastFailedTopic, setLastFailedTopic] = useState('');
  const [plan, setPlan] = useState<FunLessonPlan | null>(null);
  const [lessonsCreated, setLessonsCreated] = useState(14);
  const [copiedPlan, setCopiedPlan] = useState(false);
  const [copiedAnswer, setCopiedAnswer] = useState(false);
  const [sendingToQuiz, setSendingToQuiz] = useState(false);
  const [quizSentNotice, setQuizSentNotice] = useState('');

  // Teacher AI Chat / Lesson History
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<TeacherHistoryEntry[]>(() => {
    try {
      const raw = localStorage.getItem(TEACHER_HISTORY_STORAGE_KEY);
      return raw ? (JSON.parse(raw) as TeacherHistoryEntry[]) : [];
    } catch {
      return [];
    }
  });

  // Inline editing for the asked question itself + any generated quiz question
  const [editingAskedQuestion, setEditingAskedQuestion] = useState(false);
  const [draftAskedQuestion, setDraftAskedQuestion] = useState('');
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);

  const questionInputRef = useRef<HTMLTextAreaElement>(null);

  const refreshModelRegistry = async () => {
    try {
      const res = await fetch('/api/ai/models');
      if (!res.ok) return;
      const data = (await res.json()) as {
        hasApiKey: boolean;
        models: TeacherAiModelInfo[];
      };
      setHasApiKey(data.hasApiKey);
      if (Array.isArray(data.models) && data.models.length > 0) {
        setModels(data.models);
      }
    } catch {
      // keep default cards
    }
  };

  useEffect(() => {
    void refreshModelRegistry();
  }, []);

  const handleTestModels = async () => {
    setTestingModels(true);
    try {
      const res = await fetch('/api/ai/models/test', { method: 'POST' });
      if (!res.ok) return;
      const data = (await res.json()) as {
        hasApiKey: boolean;
        models: TeacherAiModelInfo[];
      };
      setHasApiKey(data.hasApiKey);
      if (Array.isArray(data.models) && data.models.length > 0) {
        setModels(data.models);
      }
    } catch {
      // ignore transient network error
    } finally {
      setTestingModels(false);
    }
  };

  const getActiveChoiceLabel = (choice: TeacherAiModelChoice = selectedModelChoice) => {
    if (choice === 'auto') return 'Auto Select';
    return models.find((m) => m.id === choice)?.label || choice;
  };

  const saveHistoryEntry = (
    question: string,
    style: string,
    modelChoice: TeacherAiModelChoice,
    generatedPlan: FunLessonPlan
  ) => {
    const entry: TeacherHistoryEntry = {
      id: `th-${Date.now()}`,
      timestamp: Date.now(),
      question,
      style,
      modelChoice,
      plan: generatedPlan,
    };
    setHistory((prev) => {
      const next = [entry, ...prev].slice(0, 15);
      try {
        localStorage.setItem(TEACHER_HISTORY_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore storage quota errors
      }
      return next;
    });
  };

  const handleDeleteHistoryEntry = (id: string) => {
    setHistory((prev) => {
      const next = prev.filter((item) => item.id !== id);
      try {
        localStorage.setItem(TEACHER_HISTORY_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const handleClearHistory = () => {
    setHistory([]);
    try {
      localStorage.removeItem(TEACHER_HISTORY_STORAGE_KEY);
    } catch {
      // ignore
    }
  };

  const handleGenerate = async (
    overrideTopic?: string,
    overrideModelChoice?: TeacherAiModelChoice
  ) => {
    const cleanTopic = (overrideTopic ?? topic).trim();
    const activeChoice = overrideModelChoice ?? selectedModelChoice;

    if (!cleanTopic) {
      setErrorMsg('Please ask any question or enter a topic.');
      return;
    }

    if (overrideTopic !== undefined) {
      setTopic(cleanTopic);
    }
    if (overrideModelChoice !== undefined) {
      setSelectedModelChoice(overrideModelChoice);
    }

    setLoading(true);
    setErrorMsg('');
    setLastFailedTopic('');
    setQuizSentNotice('');
    setEditingAskedQuestion(false);
    setEditingQuestionId(null);

    try {
      const res = await fetch('/api/ai/make-fun', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: cleanTopic,
          style: selectedStyle,
          modelChoice: activeChoice,
          history: history.slice(0, 4).map((h) => ({
            question: h.question,
            title: h.plan.title,
          })),
        }),
      });

      const data = (await res.json()) as {
        error?: string;
        plan?: FunLessonPlan;
        modelMeta?: TeacherAiExecutionMeta;
      };

      if (!res.ok || !data.plan) {
        setErrorMsg(data.error || 'Unable to reach Gemini AI service.');
        setLastFailedTopic(cleanTopic);
        void refreshModelRegistry();
        return;
      }

      const nextPlan: FunLessonPlan = {
        ...data.plan,
        modelMeta: data.modelMeta ?? data.plan.modelMeta,
      };
      setPlan(nextPlan);
      setLessonsCreated((c) => c + 1);
      saveHistoryEntry(cleanTopic, selectedStyle, activeChoice, nextPlan);
      void refreshModelRegistry();
    } catch {
      setErrorMsg('Network error reaching the server AI endpoint.');
      setLastFailedTopic(cleanTopic);
    } finally {
      setLoading(false);
    }
  };

  const handleStartEditAskedQuestion = () => {
    const current = plan?.topic || topic;
    setDraftAskedQuestion(current);
    setEditingAskedQuestion(true);
  };

  const handleSubmitEditedAskedQuestion = () => {
    const cleaned = draftAskedQuestion.trim();
    if (!cleaned) return;
    void handleGenerate(cleaned);
  };

  const handleCopyAnswer = async () => {
    if (!plan?.aiAnswer) return;
    await navigator.clipboard.writeText(plan.aiAnswer);
    setCopiedAnswer(true);
    setTimeout(() => setCopiedAnswer(false), 2000);
  };

  const handleCopyPlan = async () => {
    if (!plan) return;
    const quizText =
      plan.sampleQuizQuestions.length > 0
        ? `Quiz Questions:\n${plan.sampleQuizQuestions
            .map(
              (q, idx) =>
                `${idx + 1}. ${q.question}\n${q.options
                  .map(
                    (o, oi) =>
                      `   ${String.fromCharCode(65 + oi)}) ${o}${oi === q.correctIndex ? ' [Correct]' : ''}`
                  )
                  .join('\n')}`
            )
            .join('\n')}`
        : '';

    const text = [
      `Question / Topic: ${plan.topic}`,
      plan.modelMeta ? `Model Used: ${plan.modelMeta.actualModelLabel} (${plan.modelMeta.actualModelId})` : '',
      plan.aiAnswer ? `AI Answer:\n${plan.aiAnswer}` : '',
      `${plan.title} (${plan.style})`,
      `Objective: ${plan.learningObjective}`,
      `Hook: ${plan.hook}`,
      `Materials:\n${plan.materials.map((m) => `- ${m}`).join('\n')}`,
      `Timeline:\n${plan.timeline.map((t) => `- ${t.phase} (${t.minutes} min): ${t.activity}`).join('\n')}`,
      `Squad Roles:\n${plan.squadRoles.map((r) => `- ${r.role}: ${r.task}`).join('\n')}`,
      `Assessment: ${plan.assessmentPlan}`,
      `Bonus Ideas:\n${plan.bonusIdeas.map((b) => `- ${b}`).join('\n')}`,
      quizText,
    ]
      .filter(Boolean)
      .join('\n\n');

    await navigator.clipboard.writeText(text);
    setCopiedPlan(true);
    setTimeout(() => setCopiedPlan(false), 2000);
  };

  const handleUpdateQuestion = (
    questionId: string,
    patch: Partial<QuizQuestion>
  ) => {
    setPlan((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        sampleQuizQuestions: prev.sampleQuizQuestions.map((q) =>
          q.id === questionId ? { ...q, ...patch } : q
        ),
      };
    });
  };

  const handleUpdateOption = (
    questionId: string,
    optionIdx: number,
    value: string
  ) => {
    setPlan((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        sampleQuizQuestions: prev.sampleQuizQuestions.map((q) => {
          if (q.id !== questionId) return q;
          const nextOpts: [string, string, string, string] = [...q.options] as [
            string,
            string,
            string,
            string,
          ];
          nextOpts[optionIdx] = value;
          return { ...q, options: nextOpts };
        }),
      };
    });
  };

  const handleAddQuestion = () => {
    if (!plan) return;
    const newId = `fun-q-${Date.now()}`;
    const newQ: QuizQuestion = {
      id: newId,
      topic: plan.topic,
      question: `New ${plan.topic} Question`,
      options: ['Option A', 'Option B', 'Option C', 'Option D'],
      correctIndex: 0,
      timeLimit: 20,
      explanation: `Core takeaway for ${plan.topic}.`,
    };
    setPlan((prev) =>
      prev
        ? { ...prev, sampleQuizQuestions: [...prev.sampleQuizQuestions, newQ] }
        : prev
    );
    setEditingQuestionId(newId);
  };

  const handleDeleteQuestion = (questionId: string) => {
    setPlan((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        sampleQuizQuestions: prev.sampleQuizQuestions.filter(
          (q) => q.id !== questionId
        ),
      };
    });
    if (editingQuestionId === questionId) {
      setEditingQuestionId(null);
    }
  };

  const handleSendToQuizBuzz = async () => {
    if (!plan) return;
    setSendingToQuiz(true);
    setQuizSentNotice('');

    try {
      const res = await fetch('/api/quiz/360360/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: plan.topic,
          questions: plan.sampleQuizQuestions,
          replace: true,
        }),
      });

      if (res.ok) {
        setQuizSentNotice(
          `Loaded ${plan.sampleQuizQuestions.length} lesson questions into QuizBuzz PIN 360360.`
        );
        setTimeout(() => onNavigate('quizbuzz'), 650);
      }
    } finally {
      setSendingToQuiz(false);
    }
  };

  const renderModelStatusText = (m: TeacherAiModelInfo) => {
    if (m.status === 'available') {
      return {
        text: m.latencyMs ? `Ready · ${m.latencyMs}ms` : 'Ready',
        color: '#34d399',
      };
    }
    if (m.status === 'billing_required') {
      return {
        text: 'Paid Key Needed · Fallback Ready',
        color: '#fbbf24',
      };
    }
    if (m.status === 'unavailable') {
      return {
        text: hasApiKey === false ? 'API Key Not Configured' : 'Unavailable · Fallback Ready',
        color: '#f87171',
      };
    }
    if (m.requiresPaidTier) {
      return {
        text: 'Configurable · Auto-Fallback',
        color: '#c4b5fd',
      };
    }
    return {
      text: hasApiKey === false ? 'API Key Not Configured' : 'Configured & Standby',
      color: '#93c5fd',
    };
  };

  const getModelVisual = (id: TeacherAiModelChoice) => {
    if (id === 'flash-lite') {
      return {
        icon: Zap,
        accent: '#38bdf8',
        iconBg: 'rgba(56, 189, 248, 0.16)',
      };
    }
    if (id === 'argon') {
      return {
        icon: Cpu,
        accent: '#a78bfa',
        iconBg: 'rgba(167, 139, 250, 0.18)',
      };
    }
    if (id === 'hydrogen') {
      return {
        icon: Flame,
        accent: '#f472b6',
        iconBg: 'rgba(244, 114, 182, 0.16)',
      };
    }
    return {
      icon: BrainCircuit,
      accent: '#818cf8',
      iconBg: 'rgba(129, 140, 248, 0.2)',
    };
  };

  return (
    <div className="max-w-[1440px] mx-auto px-4 lg:px-8 py-8 space-y-8">
      {/* Dynamic Greeting Header */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold" style={{ color: 'var(--accent-primary)' }}>
            Teacher Cockpit · {user.institution}
          </p>
          <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight mt-1">
            Welcome back, {user.name}
          </h1>
          <p className="text-sm mt-1.5" style={{ color: 'var(--text-secondary)' }}>
            Select your Gemini AI engine, ask any question, build active learning lessons, and launch directly into QuizBuzz Live.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => onNavigate('teachmate')}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors"
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-hairline)',
              color: 'var(--text-primary)',
            }}
          >
            Open TeachMate AI
          </button>
          <button
            type="button"
            onClick={() => onNavigate('quizbuzz')}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap inline-flex items-center gap-1.5"
            style={{
              backgroundColor: 'var(--accent-primary)',
              color: 'var(--accent-on-primary)',
            }}
          >
            <Play className="w-3.5 h-3.5" />
            Host QuizBuzz (360360)
          </button>
        </div>
      </section>

      {/* 4 Key Educator Metrics */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Active Classes', value: '6', detail: 'Grades 9–12 & Lab Cohorts' },
          { label: 'Lessons Created', value: String(lessonsCreated), detail: 'AI Interactive Sessions' },
          { label: 'Student Participation Rate', value: '93.4%', detail: '+11.2% vs. lecture baseline' },
          { label: 'Quiz Performance Avg', value: '87.8%', detail: 'Across 42 live squad rounds' },
        ].map((metric) => (
          <div
            key={metric.label}
            className="rounded-2xl p-5"
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-hairline)',
            }}
          >
            <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
              {metric.label}
            </p>
            <p className="font-display text-2xl sm:text-3xl font-bold mt-2 tabular-nums">
              {metric.value}
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
              {metric.detail}
            </p>
          </div>
        ))}
      </section>

      {/* Multi-AI Model Selector (Dark Blue & Purple Gradient Theme) */}
      <section
        aria-label="Multi-AI Model Selector"
        className="rounded-2xl p-5 sm:p-6 text-white space-y-5 shadow-xl"
        style={{
          background:
            'linear-gradient(135deg, #0b132b 0%, #172048 48%, #2e1758 100%)',
          border: '1px solid rgba(139, 92, 246, 0.35)',
        }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="font-display text-lg sm:text-xl font-bold tracking-tight text-white">
                AI Model Engine Selector
              </h2>
              <span className="text-xs font-medium text-indigo-200/90">
                · Active: <strong className="text-sky-300">{getActiveChoiceLabel()}</strong>
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1">
              Switch Gemini models anytime without refreshing. Unavailable models automatically fall back to an active model.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              disabled={testingModels}
              onClick={() => void handleTestModels()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-white border border-violet-300/25 bg-white/10 hover:bg-white/15 transition-colors disabled:opacity-60 whitespace-nowrap"
            >
              {testingModels ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-300" />
              ) : (
                <Activity className="w-3.5 h-3.5 text-sky-300" />
              )}
              {testingModels ? 'Testing Models...' : 'Verify Live Models'}
            </button>
          </div>
        </div>

        {/* 4 Model Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5">
          {models.map((m) => {
            const isSelected = selectedModelChoice === m.id;
            const visual = getModelVisual(m.id);
            const Icon = visual.icon;
            const statusMeta = renderModelStatusText(m);

            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setSelectedModelChoice(m.id)}
                className="group relative rounded-xl p-4 text-left transition-all duration-200 hover:-translate-y-0.5 flex flex-col justify-between gap-3"
                style={{
                  background: isSelected
                    ? 'linear-gradient(160deg, rgba(59, 130, 246, 0.24) 0%, rgba(139, 92, 246, 0.26) 100%)'
                    : 'rgba(15, 23, 42, 0.48)',
                  border: isSelected
                    ? '1px solid rgba(167, 139, 250, 0.85)'
                    : '1px solid rgba(255, 255, 255, 0.12)',
                  boxShadow: isSelected
                    ? '0 10px 30px rgba(99, 102, 241, 0.24)'
                    : 'none',
                }}
              >
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                      style={{ backgroundColor: visual.iconBg, color: visual.accent }}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <span
                      className="text-[11px] font-semibold whitespace-nowrap"
                      style={{ color: isSelected ? '#93c5fd' : 'rgba(203, 213, 225, 0.7)' }}
                    >
                      {isSelected ? 'Active Model' : 'Click to Select'}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-display text-sm font-bold text-white leading-snug">
                      {m.label}
                    </h3>
                    <p className="text-[11px] font-mono text-indigo-200/80 mt-0.5 truncate">
                      {m.modelId}
                    </p>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    {m.description}
                  </p>
                </div>

                <div className="space-y-2 pt-2 border-t border-white/10 w-full">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-300">Speed · {m.speedLabel}</span>
                    <RatingBars value={m.speedRating} accent={visual.accent} />
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-300">Depth · {m.capabilityLabel}</span>
                    <RatingBars value={m.capabilityRating} accent="#a78bfa" />
                  </div>
                  <p className="text-[11px] font-medium pt-0.5 truncate" style={{ color: statusMeta.color }}>
                    {statusMeta.text}
                  </p>
                </div>
              </button>
            );
          })}

          {/* Auto Select Card */}
          {(() => {
            const isSelected = selectedModelChoice === 'auto';
            const visual = getModelVisual('auto');
            const Icon = visual.icon;
            return (
              <button
                type="button"
                onClick={() => setSelectedModelChoice('auto')}
                className="group relative rounded-xl p-4 text-left transition-all duration-200 hover:-translate-y-0.5 flex flex-col justify-between gap-3"
                style={{
                  background: isSelected
                    ? 'linear-gradient(160deg, rgba(56, 189, 248, 0.22) 0%, rgba(168, 85, 247, 0.28) 100%)'
                    : 'rgba(15, 23, 42, 0.48)',
                  border: isSelected
                    ? '1px solid rgba(167, 139, 250, 0.85)'
                    : '1px solid rgba(255, 255, 255, 0.12)',
                  boxShadow: isSelected
                    ? '0 10px 30px rgba(99, 102, 241, 0.24)'
                    : 'none',
                }}
              >
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                      style={{ backgroundColor: visual.iconBg, color: visual.accent }}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <span
                      className="text-[11px] font-semibold whitespace-nowrap"
                      style={{ color: isSelected ? '#93c5fd' : 'rgba(203, 213, 225, 0.7)' }}
                    >
                      {isSelected ? 'Active Model' : 'Click to Select'}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-display text-sm font-bold text-white leading-snug">
                      Auto Select
                    </h3>
                    <p className="text-[11px] font-mono text-indigo-200/80 mt-0.5">
                      Smart Task Router
                    </p>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    Automatically chooses the most suitable available AI model based on your classroom task and style.
                  </p>
                </div>

                <div className="space-y-2 pt-2 border-t border-white/10 w-full">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-300">Speed · Adaptive</span>
                    <RatingBars value={4} accent="#38bdf8" />
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-300">Depth · Task-Aware</span>
                    <RatingBars value={5} accent="#a78bfa" />
                  </div>
                  <p className="text-[11px] font-medium pt-0.5 text-sky-300 truncate">
                    {hasApiKey === false
                      ? 'Configure GEMINI_API_KEY in Secrets'
                      : 'Intelligent Fallback Enabled'}
                  </p>
                </div>
              </button>
            );
          })()}
        </div>
      </section>

      {/* MAKE MY CLASS FUN! Generator */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Builder Panel */}
        <div
          className="lg:col-span-5 rounded-2xl p-6 space-y-5"
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-hairline)',
          }}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Wand2 className="w-5 h-5" style={{ color: 'var(--accent-primary)' }} />
                <h2 className="font-display text-xl font-bold tracking-tight">
                  MAKE MY CLASS FUN!
                </h2>
              </div>
              <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                Ask any question across any subject—your chosen Gemini model answers directly, builds a classroom plan, and lets you edit any question.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setHistoryOpen((o) => !o)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-colors"
              style={{
                backgroundColor: historyOpen ? 'var(--accent-primary)' : 'var(--bg-elevated)',
                color: historyOpen ? 'var(--accent-on-primary)' : 'var(--text-primary)',
                border: '1px solid var(--border-hairline)',
              }}
            >
              <History className="w-3.5 h-3.5" />
              <span>History ({history.length})</span>
            </button>
          </div>

          {/* Collapsible Teacher Chat History */}
          {historyOpen && (
            <div
              className="rounded-xl p-3.5 space-y-2.5 max-h-64 overflow-y-auto"
              style={{
                backgroundColor: 'var(--bg-canvas)',
                border: '1px solid var(--border-hairline)',
              }}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold">Recent Teacher AI Sessions</span>
                {history.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearHistory}
                    className="text-[11px] font-medium text-red-400 hover:underline"
                  >
                    Clear All
                  </button>
                )}
              </div>

              {history.length === 0 ? (
                <p className="text-xs py-3" style={{ color: 'var(--text-muted)' }}>
                  Your asked questions and AI lesson responses will appear here automatically.
                </p>
              ) : (
                <div className="space-y-1.5">
                  {history.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-start justify-between gap-2 p-2.5 rounded-lg"
                      style={{
                        backgroundColor: 'var(--bg-surface)',
                        border: '1px solid var(--border-hairline)',
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setTopic(item.question);
                          setSelectedStyle(item.style);
                          setSelectedModelChoice(item.modelChoice);
                          setPlan(item.plan);
                          setErrorMsg('');
                          setHistoryOpen(false);
                        }}
                        className="flex-1 text-left min-w-0"
                      >
                        <p className="text-xs font-semibold truncate">{item.question}</p>
                        <p className="text-[11px] truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>
                          {item.plan.modelMeta?.actualModelLabel || getActiveChoiceLabel(item.modelChoice)} · {item.style}
                        </p>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteHistoryEntry(item.id)}
                        aria-label="Delete history entry"
                        className="p-1 text-red-400 hover:opacity-80 shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Quick Model Switching Dropdown */}
          <div
            className="flex items-center justify-between gap-3 p-3 rounded-xl"
            style={{
              backgroundColor: 'var(--bg-canvas)',
              border: '1px solid var(--border-hairline)',
            }}
          >
            <div className="min-w-0">
              <label htmlFor="teacher-model-dropdown" className="block text-[11px] font-semibold" style={{ color: 'var(--text-muted)' }}>
                Active AI Model
              </label>
              <p className="text-xs font-bold truncate" style={{ color: 'var(--accent-primary)' }}>
                {getActiveChoiceLabel()}
              </p>
            </div>
            <div className="relative shrink-0">
              <select
                id="teacher-model-dropdown"
                value={selectedModelChoice}
                onChange={(e) => setSelectedModelChoice(e.target.value as TeacherAiModelChoice)}
                className="appearance-none pl-3 pr-8 py-2 rounded-lg text-xs font-semibold outline-none cursor-pointer"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border-hairline)',
                  color: 'var(--text-primary)',
                }}
              >
                <option value="auto">Auto Select (Smart)</option>
                {models.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
              <ChevronDown
                className="w-3.5 h-3.5 pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2"
                style={{ color: 'var(--text-muted)' }}
              />
            </div>
          </div>

          {/* Open-Ended Question / Topic Input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="lesson-topic" className="block text-xs font-semibold">
                Ask Any Question or Enter a Topic
              </label>
              {topic && (
                <button
                  type="button"
                  onClick={() => {
                    setTopic('');
                    questionInputRef.current?.focus();
                  }}
                  className="text-[11px] font-medium hover:underline"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Clear
                </button>
              )}
            </div>
            <textarea
              ref={questionInputRef}
              id="lesson-topic"
              rows={3}
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void handleGenerate();
                }
              }}
              placeholder="Ask any question, request a lesson plan, quiz, or creative classroom activity..."
              className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none resize-y"
              style={{
                backgroundColor: 'var(--bg-canvas)',
                border: '1px solid var(--border-hairline)',
                color: 'var(--text-primary)',
              }}
            />
          </div>

          {/* 6 Interactive Teaching Styles */}
          <div>
            <span className="block text-xs font-semibold mb-2">
              Select Interactive Teaching Style
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {TEACHING_STYLES.map((st) => {
                const active = selectedStyle === st.id;
                return (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setSelectedStyle(st.id)}
                    className="p-3 rounded-xl text-left transition-all"
                    style={{
                      backgroundColor: active ? 'var(--bg-elevated)' : 'var(--bg-canvas)',
                      border: active
                        ? '1px solid var(--accent-primary)'
                        : '1px solid var(--border-hairline)',
                    }}
                  >
                    <p
                      className="text-xs font-bold"
                      style={{
                        color: active ? 'var(--accent-primary)' : 'var(--text-primary)',
                      }}
                    >
                      {st.id}
                    </p>
                    <p
                      className="text-[11px] mt-1 leading-snug"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      {st.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {errorMsg && (
            <div
              className="p-3.5 rounded-xl text-xs space-y-2.5"
              style={{
                backgroundColor: 'var(--bg-elevated)',
                border: '1px solid rgba(239,68,68,0.45)',
              }}
              role="alert"
            >
              <p className="font-semibold text-red-400">{errorMsg}</p>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => void handleGenerate(lastFailedTopic || topic)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-red-500/20 text-red-200 hover:bg-red-500/30 transition-colors"
                >
                  <RefreshCw className="w-3 h-3" />
                  Retry
                </button>
                {selectedModelChoice !== 'auto' && (
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => void handleGenerate(lastFailedTopic || topic, 'auto')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-indigo-500/20 text-indigo-200 hover:bg-indigo-500/30 transition-colors"
                  >
                    <BrainCircuit className="w-3 h-3" />
                    Switch to Auto Select & Retry
                  </button>
                )}
              </div>
            </div>
          )}

          <button
            type="button"
            disabled={loading}
            onClick={() => void handleGenerate()}
            className="w-full py-3 px-4 rounded-xl text-sm font-bold inline-flex items-center justify-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-60"
            style={{
              backgroundColor: 'var(--accent-primary)',
              color: 'var(--accent-on-primary)',
            }}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating with {getActiveChoiceLabel()}...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Ask AI & Build Class Plan
              </>
            )}
          </button>
        </div>

        {/* Right Output: Advanced AI Answer + Class Plan + Editable Quiz Questions */}
        <div
          className="lg:col-span-7 rounded-2xl p-6 min-h-[520px] flex flex-col space-y-5"
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-hairline)',
          }}
        >
          {loading ? (
            <div className="flex-1 flex flex-col justify-center space-y-5 py-10 px-4">
              <div
                className="rounded-xl p-5 space-y-3"
                style={{
                  background:
                    'linear-gradient(135deg, rgba(23, 32, 72, 0.72) 0%, rgba(46, 23, 88, 0.72) 100%)',
                  border: '1px solid rgba(139, 92, 246, 0.35)',
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/25 flex items-center justify-center text-sky-300">
                    <Loader2 className="w-5 h-5 animate-spin" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">
                      Crafting response with {getActiveChoiceLabel()}
                    </p>
                    <p className="text-xs text-indigo-200/80">
                      Synthesizing explanation, classroom hook, timeline, and editable QuizBuzz questions...
                    </p>
                  </div>
                </div>
                <div className="space-y-2 pt-2 animate-pulse">
                  <div className="h-3 rounded bg-white/15 w-3/4" />
                  <div className="h-3 rounded bg-white/10 w-full" />
                  <div className="h-3 rounded bg-white/10 w-5/6" />
                </div>
              </div>
            </div>
          ) : !plan ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-12 px-6 space-y-4">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center"
                style={{
                  backgroundColor: 'var(--bg-elevated)',
                  color: 'var(--accent-primary)',
                }}
              >
                <Wand2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-display text-xl font-bold">
                  Ask Any Question & Design Your Class
                </h3>
                <p
                  className="text-sm max-w-md mt-2 leading-relaxed"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Choose an AI model above (or let Auto Select route automatically), type any question on the left, and press Enter to generate your answer, interactive lesson plan, and editable quiz questions.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Plan Header + Active Model Info + One-Click Actions */}
              <div
                className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-5 border-b"
                style={{ borderColor: 'var(--border-hairline)' }}
              >
                <div className="space-y-1.5">
                  <div
                    className="flex flex-wrap items-center gap-2 text-xs font-medium"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    <span>{plan.style}</span>
                    <span aria-hidden="true">·</span>
                    <span style={{ color: 'var(--accent-primary)' }} className="font-semibold">
                      {plan.modelMeta
                        ? `${plan.modelMeta.actualModelLabel} (${plan.modelMeta.actualModelId})`
                        : 'Gemini AI'}
                    </span>
                    {plan.modelMeta?.latencyMs ? (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums">
                          {(plan.modelMeta.latencyMs / 1000).toFixed(1)}s
                        </span>
                      </>
                    ) : null}
                  </div>
                  <h3 className="font-display text-2xl font-bold tracking-tight">
                    {plan.title}
                  </h3>
                  <p
                    className="text-sm"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {plan.learningObjective}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => void handleGenerate(plan.topic)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap"
                    style={{
                      backgroundColor: 'var(--bg-elevated)',
                      color: 'var(--text-primary)',
                    }}
                    title="Regenerate using currently selected model"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Regenerate
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyPlan}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap"
                    style={{
                      backgroundColor: 'var(--bg-elevated)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    {copiedPlan ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    {copiedPlan ? 'Copied Plan' : 'Copy Plan'}
                  </button>

                  <button
                    type="button"
                    disabled={sendingToQuiz}
                    onClick={handleSendToQuizBuzz}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap"
                    style={{
                      backgroundColor: 'var(--accent-primary)',
                      color: 'var(--accent-on-primary)',
                    }}
                  >
                    <Send className="w-3.5 h-3.5" />
                    {sendingToQuiz ? 'Sending...' : 'Send to QuizBuzz'}
                  </button>
                </div>
              </div>

              {/* Model Routing / Fallback Notice */}
              {plan.modelMeta && (plan.modelMeta.fallbackUsed || plan.modelMeta.autoReason) && (
                <div
                  className="p-3 rounded-xl text-xs"
                  style={{
                    backgroundColor: plan.modelMeta.fallbackUsed
                      ? 'rgba(245, 158, 11, 0.12)'
                      : 'var(--bg-elevated)',
                    border: plan.modelMeta.fallbackUsed
                      ? '1px solid rgba(245, 158, 11, 0.35)'
                      : '1px solid var(--border-hairline)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  {plan.modelMeta.fallbackUsed ? (
                    <p className="text-amber-300 font-medium">
                      {plan.modelMeta.fallbackReason}
                    </p>
                  ) : (
                    <p>
                      <strong style={{ color: 'var(--text-primary)' }}>Auto Select:</strong>{' '}
                      {plan.modelMeta.autoReason}
                    </p>
                  )}
                </div>
              )}

              {quizSentNotice && (
                <p className="text-xs font-semibold text-emerald-400">
                  {quizSentNotice}
                </p>
              )}

              {/* Asked Question (Editable) + Direct Advanced AI Answer */}
              <div
                className="p-4 rounded-xl space-y-3"
                style={{
                  backgroundColor: 'var(--bg-canvas)',
                  border: '1px solid var(--accent-primary)',
                }}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b" style={{ borderColor: 'var(--border-hairline)' }}>
                  <div className="flex items-center gap-2">
                    <Sparkles
                      className="w-4 h-4 shrink-0"
                      style={{ color: 'var(--accent-primary)' }}
                    />
                    <h4
                      className="text-xs font-bold uppercase tracking-wider"
                      style={{ color: 'var(--accent-primary)' }}
                    >
                      AI Answer · {plan.modelMeta?.actualModelLabel || 'Gemini AI'}
                    </h4>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {plan.aiAnswer && (
                      <button
                        type="button"
                        onClick={() => void handleCopyAnswer()}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold"
                        style={{
                          backgroundColor: 'var(--bg-surface)',
                          border: '1px solid var(--border-hairline)',
                          color: 'var(--text-primary)',
                        }}
                      >
                        {copiedAnswer ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                        {copiedAnswer ? 'Copied' : 'Copy Response'}
                      </button>
                    )}

                    {!editingAskedQuestion && (
                      <button
                        type="button"
                        onClick={handleStartEditAskedQuestion}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold"
                        style={{
                          backgroundColor: 'var(--bg-surface)',
                          border: '1px solid var(--border-hairline)',
                          color: 'var(--text-primary)',
                        }}
                      >
                        <Pencil className="w-3 h-3" />
                        Edit Question
                      </button>
                    )}
                  </div>
                </div>

                {editingAskedQuestion ? (
                  <div className="space-y-2">
                    <textarea
                      rows={2}
                      value={draftAskedQuestion}
                      onChange={(e) => setDraftAskedQuestion(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSubmitEditedAskedQuestion();
                        }
                      }}
                      placeholder="Edit your question..."
                      className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-y"
                      style={{
                        backgroundColor: 'var(--bg-surface)',
                        border: '1px solid var(--accent-primary)',
                        color: 'var(--text-primary)',
                      }}
                    />
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={loading || !draftAskedQuestion.trim()}
                        onClick={handleSubmitEditedAskedQuestion}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold disabled:opacity-60"
                        style={{
                          backgroundColor: 'var(--accent-primary)',
                          color: 'var(--accent-on-primary)',
                        }}
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        {loading ? 'Updating...' : 'Update & Re-Ask AI'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingAskedQuestion(false)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold"
                        style={{
                          backgroundColor: 'var(--bg-surface)',
                          border: '1px solid var(--border-hairline)',
                          color: 'var(--text-secondary)',
                        }}
                      >
                        <X className="w-3.5 h-3.5" />
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                    Question: <span style={{ color: 'var(--text-primary)' }}>{plan.topic}</span>
                  </p>
                )}

                {plan.aiAnswer && <RichMathMarkdown content={plan.aiAnswer} />}
              </div>

              {/* Hook & Materials */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <h4
                    className="text-xs font-bold uppercase tracking-wider"
                    style={{ color: 'var(--accent-primary)' }}
                  >
                    Opening Hook
                  </h4>
                  <p
                    className="text-sm leading-relaxed"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {plan.hook}
                  </p>
                </div>

                <div className="space-y-2">
                  <h4
                    className="text-xs font-bold uppercase tracking-wider"
                    style={{ color: 'var(--accent-primary)' }}
                  >
                    Materials Needed
                  </h4>
                  <ul
                    className="space-y-1.5 text-sm"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {plan.materials.map((mat, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span
                          className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ backgroundColor: 'var(--accent-primary)' }}
                        />
                        <span>{mat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Step-by-Step Timeline */}
              <div
                className="space-y-3 pt-4 border-t"
                style={{ borderColor: 'var(--border-hairline)' }}
              >
                <div className="flex items-center gap-2">
                  <Clock
                    className="w-4 h-4"
                    style={{ color: 'var(--accent-primary)' }}
                  />
                  <h4 className="text-sm font-bold">
                    Step-by-Step Classroom Timeline
                  </h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {plan.timeline.map((step, i) => (
                    <div
                      key={i}
                      className="p-3.5 rounded-xl"
                      style={{
                        backgroundColor: 'var(--bg-canvas)',
                        border: '1px solid var(--border-hairline)',
                      }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold">{step.phase}</span>
                        <span
                          className="text-xs font-mono tabular-nums"
                          style={{ color: 'var(--accent-primary)' }}
                        >
                          {step.minutes} min
                        </span>
                      </div>
                      <p
                        className="text-xs mt-1.5 leading-relaxed"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        {step.activity}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Squad Roles */}
              <div
                className="space-y-3 pt-4 border-t"
                style={{ borderColor: 'var(--border-hairline)' }}
              >
                <div className="flex items-center gap-2">
                  <Users
                    className="w-4 h-4"
                    style={{ color: 'var(--accent-primary)' }}
                  />
                  <h4 className="text-sm font-bold">4-Person Squad Roles</h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {plan.squadRoles.map((sr, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-xl"
                      style={{
                        backgroundColor: 'var(--bg-canvas)',
                        border: '1px solid var(--border-hairline)',
                      }}
                    >
                      <p className="text-xs font-bold">{sr.role}</p>
                      <p
                        className="text-xs mt-1"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        {sr.task}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Assessment & Fun Bonus */}
              <div
                className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-4 border-t"
                style={{ borderColor: 'var(--border-hairline)' }}
              >
                <div>
                  <h4
                    className="text-xs font-bold mb-1.5"
                    style={{ color: 'var(--accent-primary)' }}
                  >
                    Formative Assessment Plan
                  </h4>
                  <p
                    className="text-xs leading-relaxed"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {plan.assessmentPlan}
                  </p>
                </div>
                <div>
                  <h4
                    className="text-xs font-bold mb-1.5"
                    style={{ color: 'var(--accent-primary)' }}
                  >
                    Fun Bonus Extensions
                  </h4>
                  <ul
                    className="space-y-1 text-xs"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {plan.bonusIdeas.map((idea, i) => (
                      <li key={i}>• {idea}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Editable QuizBuzz Questions */}
              <div
                className="space-y-3 pt-4 border-t"
                style={{ borderColor: 'var(--border-hairline)' }}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <HelpCircle
                      className="w-4 h-4"
                      style={{ color: 'var(--accent-primary)' }}
                    />
                    <h4 className="text-sm font-bold">
                      QuizBuzz Questions ({plan.sampleQuizQuestions.length})
                    </h4>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddQuestion}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                    style={{
                      backgroundColor: 'var(--bg-elevated)',
                      color: 'var(--accent-primary)',
                    }}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Question
                  </button>
                </div>

                {plan.sampleQuizQuestions.length === 0 ? (
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    No custom questions yet. Click &ldquo;Add Question&rdquo; to create one before sending to QuizBuzz.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {plan.sampleQuizQuestions.map((q, qIdx) => {
                      const isEditing = editingQuestionId === q.id;
                      return (
                        <div
                          key={q.id}
                          className="p-4 rounded-xl space-y-3"
                          style={{
                            backgroundColor: 'var(--bg-canvas)',
                            border: isEditing
                              ? '1px solid var(--accent-primary)'
                              : '1px solid var(--border-hairline)',
                          }}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <span
                              className="text-xs font-mono font-bold pt-0.5 shrink-0"
                              style={{ color: 'var(--accent-primary)' }}
                            >
                              Q{qIdx + 1}
                            </span>

                            {isEditing ? (
                              <input
                                type="text"
                                value={q.question}
                                onChange={(e) =>
                                  handleUpdateQuestion(q.id, {
                                    question: e.target.value,
                                  })
                                }
                                placeholder="Enter question..."
                                className="flex-1 px-3 py-1.5 rounded-lg text-xs font-semibold outline-none"
                                style={{
                                  backgroundColor: 'var(--bg-surface)',
                                  border: '1px solid var(--border-hairline)',
                                }}
                              />
                            ) : (
                              <p className="flex-1 text-xs font-bold leading-snug">
                                {q.question}
                              </p>
                            )}

                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() =>
                                  setEditingQuestionId(isEditing ? null : q.id)
                                }
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold"
                                style={{
                                  backgroundColor: isEditing
                                    ? 'var(--accent-primary)'
                                    : 'var(--bg-surface)',
                                  color: isEditing
                                    ? 'var(--accent-on-primary)'
                                    : 'var(--text-primary)',
                                  border: '1px solid var(--border-hairline)',
                                }}
                              >
                                {isEditing ? (
                                  <>
                                    <Check className="w-3 h-3" />
                                    Done
                                  </>
                                ) : (
                                  <>
                                    <Pencil className="w-3 h-3" />
                                    Edit
                                  </>
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteQuestion(q.id)}
                                aria-label={`Delete question ${qIdx + 1}`}
                                className="p-1.5 rounded-lg text-red-400 hover:opacity-80"
                                style={{
                                  backgroundColor: 'var(--bg-surface)',
                                  border: '1px solid var(--border-hairline)',
                                }}
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>

                          {isEditing ? (
                            <div className="space-y-3 pl-6">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {q.options.map((opt, optIdx) => (
                                  <div
                                    key={optIdx}
                                    className="flex items-center gap-1.5"
                                  >
                                    <span
                                      className="font-mono text-[11px] font-bold w-4 shrink-0"
                                      style={{
                                        color:
                                          optIdx === q.correctIndex
                                            ? '#22C55E'
                                            : 'var(--text-muted)',
                                      }}
                                    >
                                      {String.fromCharCode(65 + optIdx)}
                                    </span>
                                    <input
                                      type="text"
                                      value={opt}
                                      onChange={(e) =>
                                        handleUpdateOption(
                                          q.id,
                                          optIdx,
                                          e.target.value
                                        )
                                      }
                                      className="flex-1 px-2.5 py-1.5 rounded-lg text-xs outline-none"
                                      style={{
                                        backgroundColor: 'var(--bg-surface)',
                                        border:
                                          optIdx === q.correctIndex
                                            ? '1px solid #22C55E'
                                            : '1px solid var(--border-hairline)',
                                      }}
                                    />
                                  </div>
                                ))}
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                <div>
                                  <label
                                    className="block text-[10px] font-semibold mb-1"
                                    style={{ color: 'var(--text-muted)' }}
                                  >
                                    Correct Answer
                                  </label>
                                  <select
                                    value={q.correctIndex}
                                    onChange={(e) =>
                                      handleUpdateQuestion(q.id, {
                                        correctIndex: Number(e.target.value),
                                      })
                                    }
                                    className="w-full px-2.5 py-1.5 rounded-lg text-xs outline-none"
                                    style={{
                                      backgroundColor: 'var(--bg-surface)',
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
                                  <label
                                    className="block text-[10px] font-semibold mb-1"
                                    style={{ color: 'var(--text-muted)' }}
                                  >
                                    Time Limit
                                  </label>
                                  <select
                                    value={q.timeLimit}
                                    onChange={(e) =>
                                      handleUpdateQuestion(q.id, {
                                        timeLimit: Number(e.target.value),
                                      })
                                    }
                                    className="w-full px-2.5 py-1.5 rounded-lg text-xs outline-none"
                                    style={{
                                      backgroundColor: 'var(--bg-surface)',
                                      border: '1px solid var(--border-hairline)',
                                    }}
                                  >
                                    <option value={15}>15s</option>
                                    <option value={20}>20s</option>
                                    <option value={30}>30s</option>
                                    <option value={45}>45s</option>
                                  </select>
                                </div>

                                <div>
                                  <label
                                    className="block text-[10px] font-semibold mb-1"
                                    style={{ color: 'var(--text-muted)' }}
                                  >
                                    Explanation (On Reveal)
                                  </label>
                                  <input
                                    type="text"
                                    value={q.explanation}
                                    onChange={(e) =>
                                      handleUpdateQuestion(q.id, {
                                        explanation: e.target.value,
                                      })
                                    }
                                    className="w-full px-2.5 py-1.5 rounded-lg text-xs outline-none"
                                    style={{
                                      backgroundColor: 'var(--bg-surface)',
                                      border: '1px solid var(--border-hairline)',
                                    }}
                                  />
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="pl-6 space-y-1.5">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                {q.options.map((opt, optIdx) => {
                                  const isCorrect = optIdx === q.correctIndex;
                                  return (
                                    <div
                                      key={optIdx}
                                      className="px-2.5 py-1.5 rounded-lg text-[11px] flex items-center gap-2"
                                      style={{
                                        backgroundColor: 'var(--bg-surface)',
                                        border: isCorrect
                                          ? '1px solid rgba(34,197,94,0.6)'
                                          : '1px solid var(--border-hairline)',
                                        color: isCorrect
                                          ? '#4ADE80'
                                          : 'var(--text-secondary)',
                                      }}
                                    >
                                      <span className="font-mono font-bold">
                                        {String.fromCharCode(65 + optIdx)}
                                      </span>
                                      <span>{opt}</span>
                                    </div>
                                  );
                                })}
                              </div>
                              {q.explanation && (
                                <p
                                  className="text-[11px]"
                                  style={{ color: 'var(--text-muted)' }}
                                >
                                  Explanation: {q.explanation}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
