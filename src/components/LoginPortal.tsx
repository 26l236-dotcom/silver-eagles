import { useState, type FormEvent } from 'react';
import {
  Award,
  BookOpen,
  Eye,
  EyeOff,
  GraduationCap,
  Moon,
  Palette,
  Sun,
  Users,
} from 'lucide-react';
import { PALETTES, STUDENT_AVATARS } from '../data/blueprints';
import type { AuthUser, PaletteId, ThemeMode, UserRole } from '../types';

const REMEMBER_STORAGE_KEY = 'smartfun360_remembered_auth';

interface RememberedPayload {
  role: UserRole;
  teacherName?: string;
  teacherEmail?: string;
  teacherCampus?: string;
  studentPin?: string;
  studentName?: string;
  studentAvatar?: string;
  evaluatorName?: string;
  evaluatorPanel?: string;
}

function loadRemembered(): RememberedPayload | null {
  try {
    const raw = localStorage.getItem(REMEMBER_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as RememberedPayload;
  } catch {
    return null;
  }
}

interface LoginPortalProps {
  onLogin: (user: AuthUser) => void;
  palette: PaletteId;
  mode: ThemeMode;
  onToggleMode: () => void;
  onOpenThemeModal: () => void;
}

export function LoginPortal({
  onLogin,
  palette,
  mode,
  onToggleMode,
  onOpenThemeModal,
}: LoginPortalProps) {
  const remembered = loadRemembered();

  const [role, setRole] = useState<UserRole>(remembered?.role || 'teacher');
  const [rememberMe, setRememberMe] = useState<boolean>(Boolean(remembered));
  const [error, setError] = useState<string>('');

  // Teacher fields — strictly blank unless saved via Remember Me
  const [teacherName, setTeacherName] = useState(remembered?.teacherName || '');
  const [teacherEmail, setTeacherEmail] = useState(remembered?.teacherEmail || '');
  const [teacherPassword, setTeacherPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [teacherCampus, setTeacherCampus] = useState(remembered?.teacherCampus || '');

  // Student fields — strictly blank unless saved via Remember Me
  const [studentPin, setStudentPin] = useState(remembered?.studentPin || '');
  const [studentName, setStudentName] = useState(remembered?.studentName || '');
  const [studentAvatar, setStudentAvatar] = useState(remembered?.studentAvatar || STUDENT_AVATARS[1]);

  // Evaluator fields — strictly blank unless saved via Remember Me
  const [evaluatorName, setEvaluatorName] = useState(remembered?.evaluatorName || '');
  const [evaluatorPanel, setEvaluatorPanel] = useState(remembered?.evaluatorPanel || '');

  const handleRememberChange = (checked: boolean) => {
    setRememberMe(checked);
    if (!checked) {
      localStorage.removeItem(REMEMBER_STORAGE_KEY);
    }
  };

  const persistRemembered = (activeRole: UserRole) => {
    if (!rememberMe) {
      localStorage.removeItem(REMEMBER_STORAGE_KEY);
      return;
    }
    const payload: RememberedPayload = {
      role: activeRole,
      teacherName,
      teacherEmail,
      teacherCampus,
      studentPin,
      studentName,
      studentAvatar,
      evaluatorName,
      evaluatorPanel,
    };
    localStorage.setItem(REMEMBER_STORAGE_KEY, JSON.stringify(payload));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (role === 'teacher') {
      if (!teacherName.trim() || !teacherEmail.trim() || !teacherPassword.trim()) {
        setError('Please enter your faculty name, institutional email, and password.');
        return;
      }
      persistRemembered('teacher');
      onLogin({
        role: 'teacher',
        name: teacherName.trim(),
        email: teacherEmail.trim(),
        institution: teacherCampus.trim() || 'IDEALAB Partner Campus',
        avatar: '🎓',
      });
      return;
    }

    if (role === 'student') {
      if (!studentPin.trim() || studentPin.trim().length < 4 || !studentName.trim()) {
        setError('Please enter the 6-digit classroom PIN and your student nickname.');
        return;
      }
      persistRemembered('student');
      onLogin({
        role: 'student',
        name: studentName.trim(),
        avatar: studentAvatar,
        institution: `Room PIN ${studentPin.trim()}`,
        roomPin: studentPin.trim(),
      });
      return;
    }

    if (!evaluatorName.trim() || !evaluatorPanel.trim()) {
      setError('Please enter your evaluator name and jury organization.');
      return;
    }
    persistRemembered('evaluator');
    onLogin({
      role: 'evaluator',
      name: evaluatorName.trim(),
      institution: evaluatorPanel.trim(),
      avatar: '🔬',
    });
  };

  const handleExhibitionQuickStart = (quickRole: UserRole) => {
    if (quickRole === 'teacher') {
      onLogin({
        role: 'teacher',
        name: 'Prof. Sarah Jenkins',
        email: 's.jenkins@idealab.edu',
        institution: 'PSG iTech IDEALAB',
        avatar: '🎓',
      });
    } else if (quickRole === 'student') {
      onLogin({
        role: 'student',
        name: 'Alex Rivera',
        avatar: '🚀',
        institution: 'Room PIN 360360',
        roomPin: '360360',
      });
    } else {
      onLogin({
        role: 'evaluator',
        name: 'Dr. Ananya Sharma',
        institution: 'UN SDG 4 Jury Panel',
        avatar: '🔬',
      });
    }
  };

  const activePalette = PALETTES[palette];

  return (
    <div
      className="min-h-screen flex flex-col justify-between px-4 py-6 sm:px-8"
      style={{ backgroundColor: 'var(--bg-canvas)', color: 'var(--text-primary)' }}
    >
      {/* Login Header with Theme Controls */}
      <header className="max-w-6xl w-full mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center font-display font-bold text-lg shadow-sm"
            style={{ background: 'var(--hero-gradient)', color: '#ffffff' }}
          >
            S
          </div>
          <div>
            <span className="font-display font-bold text-lg tracking-tight block leading-none">
              SMARTFUN 360
            </span>
            <span className="text-xs block mt-1" style={{ color: 'var(--text-muted)' }}>
              Teach Smart. Learn with Fun. · UN SDG 4 Innovation
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onOpenThemeModal}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap"
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-hairline)',
              color: 'var(--text-secondary)',
            }}
          >
            <Palette className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{activePalette.name}</span>
          </button>
          <button
            type="button"
            onClick={onToggleMode}
            className="p-2 rounded-xl transition-colors"
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-hairline)',
              color: 'var(--text-secondary)',
            }}
            aria-label="Toggle light and dark mode"
          >
            {mode === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Main Auth Gateway */}
      <main className="max-w-5xl w-full mx-auto my-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        {/* Editorial Left Context */}
        <section
          className="lg:col-span-5 rounded-2xl p-7 flex flex-col justify-between"
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-hairline)',
          }}
        >
          <div>
            <p className="text-xs font-semibold tracking-wide" style={{ color: 'var(--accent-primary)' }}>
              IDEALAB Innovation Hub · UN SDG 4
            </p>
            <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight mt-3 leading-tight [text-wrap:balance]">
              Interactive Learning Starts at the Door.
            </h1>
            <p className="text-sm mt-4 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              Sign in as an educator to author Gemini-powered lesson plans, join with a 6-digit classroom PIN as a student, or evaluate live telemetry as an academic jury member.
            </p>
          </div>

          <div className="mt-8 pt-6 border-t space-y-4" style={{ borderColor: 'var(--border-hairline)' }}>
            <div>
              <p className="text-sm font-semibold">AI Lesson Architecture & TeachMate</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                Structured 45-minute blueprints, Feynman explanations, and formative checks.
              </p>
            </div>
            <div>
              <p className="text-sm font-semibold">QuizBuzz Live & Arduino Uno Hardware</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                Room PIN 360360 real-time squad battles with physical USB buzzer support.
              </p>
            </div>
            <div>
              <p className="text-sm font-semibold">5 STEM Mini-Games & Smartboard Mode</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                Instant XP progression paired with projector-ready classroom displays.
              </p>
            </div>
          </div>
        </section>

        {/* Portal Card */}
        <section
          className="lg:col-span-7 rounded-2xl p-6 sm:p-8"
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-hairline)',
          }}
        >
          {/* Role Selector Tabs */}
          <div
            className="grid grid-cols-3 gap-1.5 p-1 rounded-xl"
            style={{ backgroundColor: 'var(--bg-elevated)' }}
            role="tablist"
          >
            <button
              type="button"
              role="tab"
              aria-selected={role === 'teacher'}
              onClick={() => {
                setRole('teacher');
                setError('');
              }}
              className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap"
              style={{
                backgroundColor: role === 'teacher' ? 'var(--bg-surface)' : 'transparent',
                color: role === 'teacher' ? 'var(--text-primary)' : 'var(--text-muted)',
              }}
            >
              <GraduationCap className="w-4 h-4 shrink-0" />
              <span>Teacher</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={role === 'student'}
              onClick={() => {
                setRole('student');
                setError('');
              }}
              className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap"
              style={{
                backgroundColor: role === 'student' ? 'var(--bg-surface)' : 'transparent',
                color: role === 'student' ? 'var(--text-primary)' : 'var(--text-muted)',
              }}
            >
              <Users className="w-4 h-4 shrink-0" />
              <span>Student Join</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={role === 'evaluator'}
              onClick={() => {
                setRole('evaluator');
                setError('');
              }}
              className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap"
              style={{
                backgroundColor: role === 'evaluator' ? 'var(--bg-surface)' : 'transparent',
                color: role === 'evaluator' ? 'var(--text-primary)' : 'var(--text-muted)',
              }}
            >
              <Award className="w-4 h-4 shrink-0" />
              <span>Jury Portal</span>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {role === 'teacher' && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="teacher-name" className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                      Faculty Name
                    </label>
                    <input
                      id="teacher-name"
                      type="text"
                      value={teacherName}
                      onChange={(e) => setTeacherName(e.target.value)}
                      placeholder="e.g. Prof. Sarah Jenkins"
                      autoComplete="name"
                      className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none transition-colors"
                      style={{
                        backgroundColor: 'var(--bg-canvas)',
                        border: '1px solid var(--border-hairline)',
                        color: 'var(--text-primary)',
                      }}
                    />
                  </div>
                  <div>
                    <label htmlFor="teacher-campus" className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                      Campus / Institution
                    </label>
                    <input
                      id="teacher-campus"
                      type="text"
                      value={teacherCampus}
                      onChange={(e) => setTeacherCampus(e.target.value)}
                      placeholder="e.g. PSG iTech IDEALAB"
                      className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none transition-colors"
                      style={{
                        backgroundColor: 'var(--bg-canvas)',
                        border: '1px solid var(--border-hairline)',
                        color: 'var(--text-primary)',
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="teacher-email" className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                    Institutional Email ID
                  </label>
                  <input
                    id="teacher-email"
                    type="email"
                    value={teacherEmail}
                    onChange={(e) => setTeacherEmail(e.target.value)}
                    placeholder="e.g. yourname@institution.edu"
                    autoComplete="email"
                    className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none transition-colors"
                    style={{
                      backgroundColor: 'var(--bg-canvas)',
                      border: '1px solid var(--border-hairline)',
                      color: 'var(--text-primary)',
                    }}
                  />
                </div>

                <div>
                  <label htmlFor="teacher-password" className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="teacher-password"
                      type={showPassword ? 'text' : 'password'}
                      value={teacherPassword}
                      onChange={(e) => setTeacherPassword(e.target.value)}
                      placeholder="Enter your portal password"
                      autoComplete="current-password"
                      className="w-full px-3.5 py-2.5 pr-10 rounded-xl text-sm outline-none transition-colors"
                      style={{
                        backgroundColor: 'var(--bg-canvas)',
                        border: '1px solid var(--border-hairline)',
                        color: 'var(--text-primary)',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md"
                      style={{ color: 'var(--text-muted)' }}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </>
            )}

            {role === 'student' && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="student-pin" className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                      6-Digit Classroom PIN
                    </label>
                    <input
                      id="student-pin"
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={studentPin}
                      onChange={(e) => setStudentPin(e.target.value.replace(/\D/g, ''))}
                      placeholder="e.g. 360360"
                      className="w-full px-3.5 py-2.5 rounded-xl text-sm font-mono tabular-nums outline-none"
                      style={{
                        backgroundColor: 'var(--bg-canvas)',
                        border: '1px solid var(--border-hairline)',
                        color: 'var(--text-primary)',
                      }}
                    />
                  </div>
                  <div>
                    <label htmlFor="student-name" className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                      Student Name / Nickname
                    </label>
                    <input
                      id="student-name"
                      type="text"
                      value={studentName}
                      onChange={(e) => setStudentName(e.target.value)}
                      placeholder="e.g. Alex Rivera"
                      className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none"
                      style={{
                        backgroundColor: 'var(--bg-canvas)',
                        border: '1px solid var(--border-hairline)',
                        color: 'var(--text-primary)',
                      }}
                    />
                  </div>
                </div>

                <div>
                  <span className="block text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>
                    Choose Your Avatar
                  </span>
                  <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                    {STUDENT_AVATARS.map((emo) => {
                      const selected = studentAvatar === emo;
                      return (
                        <button
                          key={emo}
                          type="button"
                          onClick={() => setStudentAvatar(emo)}
                          className="h-11 rounded-xl text-xl flex items-center justify-center transition-transform hover:scale-105"
                          style={{
                            backgroundColor: selected ? 'var(--bg-elevated)' : 'var(--bg-canvas)',
                            border: selected
                              ? '2px solid var(--accent-primary)'
                              : '1px solid var(--border-hairline)',
                          }}
                          aria-label={`Select avatar ${emo}`}
                        >
                          {emo}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            {role === 'evaluator' && (
              <>
                <div>
                  <label htmlFor="eval-name" className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                    Evaluator Name
                  </label>
                  <input
                    id="eval-name"
                    type="text"
                    value={evaluatorName}
                    onChange={(e) => setEvaluatorName(e.target.value)}
                    placeholder="e.g. Dr. Arvind Krishnan"
                    className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none"
                    style={{
                      backgroundColor: 'var(--bg-canvas)',
                      border: '1px solid var(--border-hairline)',
                      color: 'var(--text-primary)',
                    }}
                  />
                </div>
                <div>
                  <label htmlFor="eval-panel" className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                    Organization / Jury Panel
                  </label>
                  <input
                    id="eval-panel"
                    type="text"
                    value={evaluatorPanel}
                    onChange={(e) => setEvaluatorPanel(e.target.value)}
                    placeholder="e.g. IDEALAB National Jury Panel"
                    className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none"
                    style={{
                      backgroundColor: 'var(--bg-canvas)',
                      border: '1px solid var(--border-hairline)',
                      color: 'var(--text-primary)',
                    }}
                  />
                </div>
              </>
            )}

            {/* Remember me checkbox */}
            <label className="flex items-center gap-2.5 cursor-pointer select-none pt-1">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => handleRememberChange(e.target.checked)}
                className="w-4 h-4 rounded accent-[var(--accent-primary)]"
              />
              <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                Remember me on this device
              </span>
            </label>

            {error && (
              <p className="text-xs font-medium text-red-500" role="alert">
                {error}
              </p>
            )}

            <button
              type="submit"
              className="w-full py-3 px-5 rounded-xl text-sm font-bold transition-opacity hover:opacity-90 flex items-center justify-center gap-2"
              style={{
                backgroundColor: 'var(--accent-primary)',
                color: 'var(--accent-on-primary)',
              }}
            >
              <BookOpen className="w-4 h-4" />
              {role === 'teacher'
                ? 'Enter Teacher Cockpit'
                : role === 'student'
                ? 'Join Live Classroom'
                : 'Enter Jury Evaluation Suite'}
            </button>
          </form>

          {/* Subtle Exhibition Quick Shortcuts */}
          <div className="mt-6 pt-4 border-t" style={{ borderColor: 'var(--border-hairline)' }}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Exhibition quick entry:
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleExhibitionQuickStart('teacher')}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium transition-colors hover:opacity-80 whitespace-nowrap"
                  style={{
                    backgroundColor: 'var(--bg-elevated)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  Demo Teacher
                </button>
                <button
                  type="button"
                  onClick={() => handleExhibitionQuickStart('student')}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium transition-colors hover:opacity-80 whitespace-nowrap"
                  style={{
                    backgroundColor: 'var(--bg-elevated)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  Demo Student
                </button>
                <button
                  type="button"
                  onClick={() => handleExhibitionQuickStart('evaluator')}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium transition-colors hover:opacity-80 whitespace-nowrap"
                  style={{
                    backgroundColor: 'var(--bg-elevated)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  Demo Jury
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="max-w-6xl w-full mx-auto text-center text-xs" style={{ color: 'var(--text-muted)' }}>
        SMARTFUN 360 · IDEALAB Innovation Hub · Empowering UN SDG 4 Quality Education
      </footer>
    </div>
  );
}
