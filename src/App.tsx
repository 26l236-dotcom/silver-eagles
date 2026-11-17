import { useEffect, useState } from 'react';
import { AboutSDG4 } from './components/AboutSDG4';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { ArduinoHardware } from './components/ArduinoHardware';
import { HomeView } from './components/HomeView';
import { LoginPortal } from './components/LoginPortal';
import { MediaVoiceLab } from './components/MediaVoiceLab';
import { Navbar } from './components/Navbar';
import { QuizBuzzLive } from './components/QuizBuzzLive';
import { SmartboardMode } from './components/SmartboardMode';
import { StemLab3D } from './components/StemLab3D';
import { StudentZone } from './components/StudentZone';
import { TeacherDashboard } from './components/TeacherDashboard';
import { TeachMateAI } from './components/TeachMateAI';
import { ThemeModal } from './components/ThemeModal';
import type { AuthUser, ModuleId, PaletteId, ThemeMode } from './types';

const THEME_STORAGE_KEY = 'smartfun360_theme_prefs';

export default function App() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [activeModule, setActiveModule] = useState<ModuleId>('home');
  const [themeModalOpen, setThemeModalOpen] = useState(false);

  const [palette, setPalette] = useState<PaletteId>(() => {
    try {
      const raw = localStorage.getItem(THEME_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { palette?: PaletteId };
        if (parsed.palette) return parsed.palette;
      }
    } catch {
      // ignore
    }
    return 'cyber';
  });

  const [mode, setMode] = useState<ThemeMode>(() => {
    try {
      const raw = localStorage.getItem(THEME_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { mode?: ThemeMode };
        if (parsed.mode) return parsed.mode;
      }
    } catch {
      // ignore
    }
    return 'dark';
  });

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-palette', palette);
    if (mode === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify({ palette, mode }));
  }, [palette, mode]);

  const handleLogin = (loggedInUser: AuthUser) => {
    setUser(loggedInUser);
    if (loggedInUser.role === 'teacher') {
      setActiveModule('teacher');
    } else if (loggedInUser.role === 'student') {
      setActiveModule('student');
    } else {
      setActiveModule('home');
    }
  };

  const handleSignOut = () => {
    setUser(null);
    setActiveModule('home');
  };

  const toggleMode = () => {
    setMode((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  return (
    <div className="min-h-screen flex flex-col">
      {!user ? (
        <LoginPortal
          onLogin={handleLogin}
          palette={palette}
          mode={mode}
          onToggleMode={toggleMode}
          onOpenThemeModal={() => setThemeModalOpen(true)}
        />
      ) : (
        <>
          <Navbar
            user={user}
            activeModule={activeModule}
            onNavigate={setActiveModule}
            palette={palette}
            mode={mode}
            onToggleMode={toggleMode}
            onOpenThemeModal={() => setThemeModalOpen(true)}
            onSignOut={handleSignOut}
          />

          <main className="flex-1">
            {activeModule === 'home' && (
              <HomeView user={user} onNavigate={setActiveModule} />
            )}
            {activeModule === 'teacher' && (
              <TeacherDashboard user={user} onNavigate={setActiveModule} />
            )}
            {activeModule === 'teachmate' && <TeachMateAI />}
            {activeModule === 'quizbuzz' && (
              <QuizBuzzLive user={user} onNavigate={setActiveModule} />
            )}
            {activeModule === 'student' && <StudentZone user={user} />}
            {activeModule === 'smartboard' && <SmartboardMode />}
            {activeModule === 'lab3d' && <StemLab3D />}
            {activeModule === 'mediastudio' && <MediaVoiceLab />}
            {activeModule === 'analytics' && <AnalyticsDashboard />}
            {activeModule === 'arduino' && <ArduinoHardware />}
            {activeModule === 'sdg4' && (
              <AboutSDG4 onNavigate={setActiveModule} />
            )}
          </main>
        </>
      )}

      <ThemeModal
        isOpen={themeModalOpen}
        onClose={() => setThemeModalOpen(false)}
        palette={palette}
        setPalette={setPalette}
        mode={mode}
        setMode={setMode}
      />
    </div>
  );
}
