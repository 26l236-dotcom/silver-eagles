import { useEffect, useState } from 'react';
import {
  Check,
  Clock,
  Copy,
  HelpCircle,
  Loader2,
  Pencil,
  Play,
  Plus,
  RotateCcw,
  Send,
  Sparkles,
  Trash2,
  Users,
  Wand2,
} from 'lucide-react';
import {
  DEFAULT_QUIZ_QUESTIONS,
  TEACHING_STYLES,
  buildFallbackBlueprint,
} from '../data/blueprints';
import type {
  AuthUser,
  FunLessonPlan,
  ModuleId,
  QuizQuestion,
  QuizRoomState,
} from '../types';

interface TeacherDashboardProps {
  user: AuthUser;
  onNavigate: (module: ModuleId) => void;
}

export function TeacherDashboard({ user, onNavigate }: TeacherDashboardProps) {
  const [topic, setTopic] = useState('');
  const [selectedStyle, setSelectedStyle] = useState(TEACHING_STYLES[0].id);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [plan, setPlan] = useState<FunLessonPlan | null>(null);
  const [planSource, setPlanSource] = useState<'gemini' | 'blueprint' | null>(null);
  const [lessonsCreated, setLessonsCreated] = useState(14);
  const [copied, setCopied] = useState(false);
  const [sendingToQuiz, setSendingToQuiz] = useState(false);
  const [quizSentNotice, setQuizSentNotice] = useState('');
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);

  // Right-panel tab & "Edit Any Question" live QuizBuzz bank state
  const [rightTab, setRightTab] = useState<'blueprint' | 'questions'>('blueprint');
  const [roomQuestions, setRoomQuestions] = useState<QuizQuestion[]>(() =>
    DEFAULT_QUIZ_QUESTIONS.map((q) => ({ ...q }))
  );
  const [editingRoomQId, setEditingRoomQId] = useState<string | null>(null);
  const [savingRoom, setSavingRoom] = useState(false);
  const [roomNotice, setRoomNotice] = useState('');

  useEffect(() => {
    let active = true;
    const loadRoomQuestions = async () => {
      try {
        const res = await fetch('/api/quiz/360360');
        if (res.ok && active) {
          const data = (await res.json()) as QuizRoomState;
          if (Array.isArray(data.questions) && data.questions.length > 0) {
            setRoomQuestions(data.questions);
          }
        }
      } catch {
        // retain default bank if server unreachable
      }
    };
    void loadRoomQuestions();
    return () => {
      active = false;
    };
  }, []);

  const handleGenerate = async () => {
    const cleanTopic = topic.trim();
    if (!cleanTopic) {
      setErrorMsg('Please ask any question or enter a topic.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setQuizSentNotice('');
    setRightTab('blueprint');

    try {
      const res = await fetch('/api/ai/make-fun', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: cleanTopic, style: selectedStyle }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Unable to reach Gemini AI service.');
        setLoading(false);
        return;
      }

      setPlan(data.plan);
      setPlanSource('gemini');
      setLessonsCreated((c) => c + 1);
    } catch {
      setErrorMsg('Network error reaching the server AI endpoint.');
    } finally {
      setLoading(false);
    }
  };

  const handleLoadOfflineBlueprint = () => {
    const cleanTopic = topic.trim() || 'STEM Classroom Inquiry';
    setTopic(cleanTopic);
    const bp = buildFallbackBlueprint(cleanTopic, selectedStyle);
    setPlan(bp);
    setPlanSource('blueprint');
    setErrorMsg('');
    setRightTab('blueprint');
    setLessonsCreated((c) => c + 1);
  };

  const handleCopyPlan = async () => {
    if (!plan) return;
    const quizText =
      plan.sampleQuizQuestions.length > 0
        ? `Quiz Questions:\n${plan.sampleQuizQuestions
            .map(
              (q, idx) =>
                `${idx + 1}. ${q.question}\n${q.options
                  .map((o, oi) => `   ${String.fromCharCode(65 + oi)}) ${o}${oi === q.correctIndex ? ' [Correct]' : ''}`)
                  .join('\n')}`
            )
            .join('\n')}`
        : '';

    const text = [
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
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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

  const handleUpdateOption = (questionId: string, optionIdx: number, value: string) => {
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
      question: `New ${plan.topic} Check Question`,
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
        sampleQuizQuestions: prev.sampleQuizQuestions.filter((q) => q.id !== questionId),
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
      const questionsToPush =
        plan.sampleQuizQuestions.length > 0
          ? plan.sampleQuizQuestions
          : buildFallbackBlueprint(plan.topic, plan.style).sampleQuizQuestions;

      const res = await fetch('/api/quiz/360360/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: plan.topic,
          questions: questionsToPush,
          replace: true,
        }),
      });

      if (res.ok) {
        const updated = (await res.json()) as QuizRoomState;
        if (Array.isArray(updated.questions)) {
          setRoomQuestions(updated.questions);
        }
        setQuizSentNotice(`Loaded ${questionsToPush.length} lesson questions into QuizBuzz PIN 360360.`);
        setTimeout(() => onNavigate('quizbuzz'), 650);
      }
    } finally {
      setSendingToQuiz(false);
    }
  };

  // Handlers for editing ANY question in the live QuizBuzz Room 360360 bank
  const handleUpdateRoomQuestion = (questionId: string, patch: Partial<QuizQuestion>) => {
    setRoomQuestions((prev) =>
      prev.map((q) => (q.id === questionId ? { ...q, ...patch } : q))
    );
    setRoomNotice('');
  };

  const handleUpdateRoomOption = (questionId: string, optionIdx: number, value: string) => {
    setRoomQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== questionId) return q;
        const nextOpts: [string, string, string, string] = [...q.options] as [
          string,
          string,
          string,
          string,
        ];
        nextOpts[optionIdx] = value;
        return { ...q, options: nextOpts };
      })
    );
    setRoomNotice('');
  };

  const handleAddRoomQuestion = () => {
    const newId = `room-q-${Date.now()}`;
    const newTopic = topic.trim() || 'Classroom Custom Question';
    const newQ: QuizQuestion = {
      id: newId,
      topic: newTopic,
      question: `New question on ${newTopic}`,
      options: ['Option A', 'Option B', 'Option C', 'Option D'],
      correctIndex: 0,
      timeLimit: 20,
      explanation: `Discussed live during ${newTopic}.`,
    };
    setRoomQuestions((prev) => [...prev, newQ]);
    setEditingRoomQId(newId);
    setRoomNotice('');
  };

  const handleDeleteRoomQuestion = (questionId: string) => {
    if (roomQuestions.length <= 1) {
      setRoomNotice('Keep at least 1 question in QuizBuzz Room 360360.');
      return;
    }
    setRoomQuestions((prev) => prev.filter((q) => q.id !== questionId));
    if (editingRoomQId === questionId) {
      setEditingRoomQId(null);
    }
    setRoomNotice('');
  };

  const handleSaveRoomQuestions = async () => {
    if (roomQuestions.length === 0) return;
    setSavingRoom(true);
    setRoomNotice('');
    try {
      const res = await fetch('/api/quiz/360360/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questions: roomQuestions,
          exact: true,
        }),
      });
      if (res.ok) {
        const updated = (await res.json()) as QuizRoomState;
        setRoomQuestions(updated.questions);
        setEditingRoomQId(null);
        setRoomNotice(`Saved all ${updated.questions.length} questions to QuizBuzz PIN 360360.`);
      } else {
        setRoomNotice('Failed to save changes to QuizBuzz server.');
      }
    } catch {
      setRoomNotice('Network error saving questions.');
    } finally {
      setSavingRoom(false);
    }
  };

  const handleRestoreDefaultRoomQuestions = async () => {
    const fresh = DEFAULT_QUIZ_QUESTIONS.map((q) => ({ ...q }));
    setRoomQuestions(fresh);
    setEditingRoomQId(null);
    setSavingRoom(true);
    try {
      const res = await fetch('/api/quiz/360360/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questions: fresh, exact: true }),
      });
      if (res.ok) {
        const updated = (await res.json()) as QuizRoomState;
        setRoomQuestions(updated.questions);
        setRoomNotice('Restored default QuizBuzz question bank (including Mandatory Q1–Q5).');
      }
    } finally {
      setSavingRoom(false);
    }
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
            Design high-energy active learning lessons and launch directly into QuizBuzz Live.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
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
          { label: 'Lessons Created', value: String(lessonsCreated), detail: 'AI & Structured Blueprints' },
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

      {/* MAKE MY CLASS FUN! Generator */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Builder Panel */}
        <div
          className="lg:col-span-5 rounded-2xl p-6 space-y-6"
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-hairline)',
          }}
        >
          <div>
            <div className="flex items-center gap-2">
              <Wand2 className="w-5 h-5" style={{ color: 'var(--accent-primary)' }} />
              <h2 className="font-display text-xl font-bold tracking-tight">
                MAKE MY CLASS FUN!
              </h2>
            </div>
            <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
              Ask any question across any subject or enter a topic—advanced Gemini AI answers directly and builds an interactive class plan & editable quiz.
            </p>
          </div>

          {/* Open-Ended Question / Topic Input */}
          <div>
            <label htmlFor="lesson-topic" className="block text-xs font-semibold mb-1.5">
              Ask Any Question or Enter a Topic
            </label>
            <textarea
              id="lesson-topic"
              rows={3}
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault();
                  void handleGenerate();
                }
              }}
              placeholder="Ask any question, problem, or topic — no preset limits..."
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
                    <p className="text-xs font-bold" style={{ color: active ? 'var(--accent-primary)' : 'var(--text-primary)' }}>
                      {st.id}
                    </p>
                    <p className="text-[11px] mt-1 leading-snug" style={{ color: 'var(--text-muted)' }}>
                      {st.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {errorMsg && (
            <div
              className="p-3.5 rounded-xl text-xs space-y-2"
              style={{
                backgroundColor: 'var(--bg-elevated)',
                border: '1px solid rgba(239,68,68,0.4)',
              }}
              role="alert"
            >
              <p className="font-semibold text-red-400">{errorMsg}</p>
              <button
                type="button"
                onClick={handleLoadOfflineBlueprint}
                className="px-3 py-1.5 rounded-lg font-semibold text-xs"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border-hairline)',
                  color: 'var(--text-primary)',
                }}
              >
                Load Curated Offline Blueprint Instead
              </button>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2.5">
            <button
              type="button"
              disabled={loading}
              onClick={handleGenerate}
              className="flex-1 py-3 px-4 rounded-xl text-sm font-bold inline-flex items-center justify-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-60"
              style={{
                backgroundColor: 'var(--accent-primary)',
                color: 'var(--accent-on-primary)',
              }}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating with Gemini AI...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Ask AI & Build Class Plan
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleLoadOfflineBlueprint}
              className="py-3 px-4 rounded-xl text-xs font-semibold whitespace-nowrap"
              style={{
                backgroundColor: 'var(--bg-elevated)',
                color: 'var(--text-secondary)',
              }}
              title="Load instant structured classroom blueprint"
            >
              Instant Blueprint
            </button>
          </div>

          <button
            type="button"
            onClick={() => setRightTab('questions')}
            className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold inline-flex items-center justify-center gap-2 transition-colors"
            style={{
              backgroundColor: rightTab === 'questions' ? 'var(--bg-elevated)' : 'var(--bg-canvas)',
              border:
                rightTab === 'questions'
                  ? '1px solid var(--accent-primary)'
                  : '1px solid var(--border-hairline)',
              color: rightTab === 'questions' ? 'var(--accent-primary)' : 'var(--text-primary)',
            }}
          >
            <Pencil className="w-3.5 h-3.5" />
            Edit Any Question ({roomQuestions.length} in QuizBuzz 360360)
          </button>
        </div>

        {/* Right Output Blueprint & Question Bank Panel */}
        <div
          className="lg:col-span-7 rounded-2xl p-6 min-h-[520px] flex flex-col space-y-5"
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-hairline)',
          }}
        >
          {/* Mode Switcher */}
          <div
            className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b"
            style={{ borderColor: 'var(--border-hairline)' }}
          >
            <div
              className="inline-flex items-center gap-1 p-1 rounded-xl"
              style={{ backgroundColor: 'var(--bg-elevated)' }}
            >
              <button
                type="button"
                onClick={() => setRightTab('blueprint')}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap"
                style={{
                  backgroundColor: rightTab === 'blueprint' ? 'var(--bg-surface)' : 'transparent',
                  color: rightTab === 'blueprint' ? 'var(--text-primary)' : 'var(--text-muted)',
                }}
              >
                Lesson Blueprint
              </button>
              <button
                type="button"
                onClick={() => setRightTab('questions')}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap"
                style={{
                  backgroundColor: rightTab === 'questions' ? 'var(--bg-surface)' : 'transparent',
                  color: rightTab === 'questions' ? 'var(--accent-primary)' : 'var(--text-muted)',
                }}
              >
                Edit Any Question ({roomQuestions.length})
              </button>
            </div>

            {rightTab === 'questions' && (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleAddRoomQuestion}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                  style={{
                    backgroundColor: 'var(--bg-elevated)',
                    color: 'var(--text-primary)',
                  }}
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Question
                </button>
                <button
                  type="button"
                  disabled={savingRoom}
                  onClick={() => void handleSaveRoomQuestions()}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold disabled:opacity-60"
                  style={{
                    backgroundColor: 'var(--accent-primary)',
                    color: 'var(--accent-on-primary)',
                  }}
                >
                  <Check className="w-3.5 h-3.5" />
                  {savingRoom ? 'Saving...' : 'Save All to QuizBuzz'}
                </button>
              </div>
            )}
          </div>

          {rightTab === 'questions' ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="font-display text-lg font-bold">
                    Edit Any QuizBuzz Question (Room 360360)
                  </h3>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                    Click <strong>Edit</strong> on any question below to change its text, topic, options, correct answer, time limit, or explanation.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void handleRestoreDefaultRoomQuestions()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                  style={{
                    backgroundColor: 'var(--bg-canvas)',
                    border: '1px solid var(--border-hairline)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Restore Defaults
                </button>
              </div>

              {roomNotice && (
                <p className="text-xs font-semibold text-emerald-400">{roomNotice}</p>
              )}

              <div className="space-y-3 max-h-[560px] overflow-y-auto pr-1">
                {roomQuestions.map((q, qIdx) => {
                  const isEditing = editingRoomQId === q.id;
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
                        <div className="flex items-center gap-2 pt-0.5 shrink-0">
                          <span
                            className="text-xs font-mono font-bold"
                            style={{ color: 'var(--accent-primary)' }}
                          >
                            Q{qIdx + 1}
                          </span>
                          {q.mandatory && (
                            <span
                              className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded"
                              style={{
                                backgroundColor: 'var(--bg-surface)',
                                border: '1px solid var(--border-hairline)',
                                color: 'var(--accent-primary)',
                              }}
                            >
                              Mandatory
                            </span>
                          )}
                        </div>

                        {isEditing ? (
                          <input
                            type="text"
                            value={q.question}
                            onChange={(e) =>
                              handleUpdateRoomQuestion(q.id, { question: e.target.value })
                            }
                            placeholder="Enter question prompt..."
                            className="flex-1 px-3 py-1.5 rounded-lg text-xs font-semibold outline-none"
                            style={{
                              backgroundColor: 'var(--bg-surface)',
                              border: '1px solid var(--border-hairline)',
                            }}
                          />
                        ) : (
                          <p className="flex-1 text-xs font-bold leading-snug">{q.question}</p>
                        )}

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => setEditingRoomQId(isEditing ? null : q.id)}
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
                            onClick={() => handleDeleteRoomQuestion(q.id)}
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
                        <div className="space-y-3 pl-2 sm:pl-6">
                          <div>
                            <label
                              className="block text-[10px] font-semibold mb-1"
                              style={{ color: 'var(--text-muted)' }}
                            >
                              Topic / Subject
                            </label>
                            <input
                              type="text"
                              value={q.topic}
                              onChange={(e) =>
                                handleUpdateRoomQuestion(q.id, { topic: e.target.value })
                              }
                              className="w-full px-2.5 py-1.5 rounded-lg text-xs outline-none"
                              style={{
                                backgroundColor: 'var(--bg-surface)',
                                border: '1px solid var(--border-hairline)',
                              }}
                            />
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {q.options.map((opt, optIdx) => (
                              <div key={optIdx} className="flex items-center gap-1.5">
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
                                    handleUpdateRoomOption(q.id, optIdx, e.target.value)
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
                                  handleUpdateRoomQuestion(q.id, {
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
                                  handleUpdateRoomQuestion(q.id, {
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
                                  handleUpdateRoomQuestion(q.id, {
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
                        <div className="pl-2 sm:pl-6 space-y-1.5">
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
                                    color: isCorrect ? '#4ADE80' : 'var(--text-secondary)',
                                  }}
                                >
                                  <span className="font-mono font-bold">
                                    {String.fromCharCode(65 + optIdx)})
                                  </span>
                                  <span className="truncate">{opt}</span>
                                </div>
                              );
                            })}
                          </div>
                          <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                            {q.topic} · {q.timeLimit}s · {q.explanation}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : !plan ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-12 px-6 space-y-4">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center"
                style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--accent-primary)' }}
              >
                <Wand2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-display text-xl font-bold">Ask Any Question & Design Your Class</h3>
                <p className="text-sm max-w-md mt-2 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  Ask any question or enter any subject on the left to get an in-depth AI answer, an interactive classroom plan, and editable QuizBuzz questions—or edit any existing QuizBuzz question right now.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRightTab('questions')}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold"
                style={{
                  backgroundColor: 'var(--bg-elevated)',
                  border: '1px solid var(--accent-primary)',
                  color: 'var(--accent-primary)',
                }}
              >
                <Pencil className="w-3.5 h-3.5" />
                Edit Any QuizBuzz Question ({roomQuestions.length})
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Plan Header + One-Click Actions */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-5 border-b" style={{ borderColor: 'var(--border-hairline)' }}>
                <div>
                  <div className="flex items-center gap-2 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                    <span>{plan.style}</span>
                    <span aria-hidden="true">·</span>
                    <span>{planSource === 'gemini' ? 'Generated via Gemini AI' : 'Curated Pedagogical Blueprint'}</span>
                  </div>
                  <h3 className="font-display text-2xl font-bold tracking-tight mt-1">
                    {plan.title}
                  </h3>
                  <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>
                    {plan.learningObjective}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleCopyPlan}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap"
                    style={{
                      backgroundColor: 'var(--bg-elevated)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? 'Copied Plan' : 'Copy Plan'}
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

              {quizSentNotice && (
                <p className="text-xs font-semibold text-emerald-400">{quizSentNotice}</p>
              )}

              {/* Direct Advanced AI Answer */}
              {plan.aiAnswer && (
                <div
                  className="p-4 rounded-xl space-y-2"
                  style={{
                    backgroundColor: 'var(--bg-canvas)',
                    border: '1px solid var(--accent-primary)',
                  }}
                >
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4" style={{ color: 'var(--accent-primary)' }} />
                    <h4 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--accent-primary)' }}>
                      Advanced AI Answer
                    </h4>
                  </div>
                  <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: 'var(--text-primary)' }}>
                    {plan.aiAnswer}
                  </p>
                </div>
              )}

              {/* Hook & Materials */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--accent-primary)' }}>
                    Opening Hook
                  </h4>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    {plan.hook}
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--accent-primary)' }}>
                    Materials Needed
                  </h4>
                  <ul className="space-y-1.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
                    {plan.materials.map((mat, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: 'var(--accent-primary)' }} />
                        <span>{mat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Step-by-Step Timeline */}
              <div className="space-y-3 pt-4 border-t" style={{ borderColor: 'var(--border-hairline)' }}>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" style={{ color: 'var(--accent-primary)' }} />
                  <h4 className="text-sm font-bold">Step-by-Step Classroom Timeline</h4>
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
                        <span className="text-xs font-mono tabular-nums" style={{ color: 'var(--accent-primary)' }}>
                          {step.minutes} min
                        </span>
                      </div>
                      <p className="text-xs mt-1.5 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                        {step.activity}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Squad Roles */}
              <div className="space-y-3 pt-4 border-t" style={{ borderColor: 'var(--border-hairline)' }}>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" style={{ color: 'var(--accent-primary)' }} />
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
                      <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                        {sr.task}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Assessment & Fun Bonus */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-4 border-t" style={{ borderColor: 'var(--border-hairline)' }}>
                <div>
                  <h4 className="text-xs font-bold mb-1.5" style={{ color: 'var(--accent-primary)' }}>
                    Formative Assessment Plan
                  </h4>
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    {plan.assessmentPlan}
                  </p>
                </div>
                <div>
                  <h4 className="text-xs font-bold mb-1.5" style={{ color: 'var(--accent-primary)' }}>
                    Fun Bonus Extensions
                  </h4>
                  <ul className="space-y-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {plan.bonusIdeas.map((idea, i) => (
                      <li key={i}>• {idea}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Editable QuizBuzz Questions */}
              <div className="space-y-3 pt-4 border-t" style={{ borderColor: 'var(--border-hairline)' }}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <HelpCircle className="w-4 h-4" style={{ color: 'var(--accent-primary)' }} />
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
                                  handleUpdateQuestion(q.id, { question: e.target.value })
                                }
                                placeholder="Enter question prompt..."
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
                                  <div key={optIdx} className="flex items-center gap-1.5">
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
                                        handleUpdateOption(q.id, optIdx, e.target.value)
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
                                        color: isCorrect ? '#4ADE80' : 'var(--text-secondary)',
                                      }}
                                    >
                                      <span className="font-mono font-bold">
                                        {String.fromCharCode(65 + optIdx)})
                                      </span>
                                      <span className="truncate">{opt}</span>
                                    </div>
                                  );
                                })}
                              </div>
                              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                                {q.timeLimit}s · {q.explanation}
                              </p>
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
