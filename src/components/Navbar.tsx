import { LogOut, Menu, Moon, Palette, Sun, X } from 'lucide-react';
import { useState } from 'react';
import { PALETTES } from '../data/blueprints';
import type { AuthUser, ModuleId, PaletteId, ThemeMode } from '../types';

export const NAV_ITEMS: Array<{ id: ModuleId; label: string }> = [
  { id: 'home', label: 'Home' },
  { id: 'teacher', label: 'Teacher Dashboard' },
  { id: 'teachmate', label: 'TeachMate AI' },
  { id: 'quizbuzz', label: 'QuizBuzz Live' },
  { id: 'student', label: 'Student Zone' },
  { id: 'smartboard', label: 'Smartboard' },
  { id: 'lab3d', label: '3D STEM Lab' },
  { id: 'mediastudio', label: 'AI Media & Voice' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'arduino', label: 'Arduino Hardware' },
  { id: 'sdg4', label: 'About SDG 4' },
];

interface NavbarProps {
  user: AuthUser;
  activeModule: ModuleId;
  onNavigate: (module: ModuleId) => void;
  palette: PaletteId;
  mode: ThemeMode;
  onToggleMode: () => void;
  onOpenThemeModal: () => void;
  onSignOut: () => void;
}

export function Navbar({
  user,
  activeModule,
  onNavigate,
  palette,
  mode,
  onToggleMode,
  onOpenThemeModal,
  onSignOut,
}: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const currentTab = NAV_ITEMS.find((n) => n.id === activeModule) || NAV_ITEMS[0];
  const activePalette = PALETTES[palette];

  return (
    <header
      className="sticky top-0 z-40 glass-panel"
      style={{ borderBottom: '1px solid var(--border-hairline)' }}
    >
      <div className="max-w-[1440px] mx-auto px-4 lg:px-6 h-16 flex items-center justify-between gap-4">
        {/* Zone 1 (Left): Brand Logo, Tagline & Active Module Breadcrumb */}
        <div className="flex items-center gap-3 min-w-0 shrink-0">
          <button
            type="button"
            onClick={() => onNavigate('home')}
            className="flex items-center gap-2.5 text-left whitespace-nowrap shrink-0"
          >
            <span
              className="w-8 h-8 rounded-lg flex items-center justify-center font-display font-bold text-sm"
              style={{ background: 'var(--hero-gradient)', color: '#ffffff' }}
            >
              S
            </span>
            <span className="flex flex-col">
              <span className="font-display font-bold text-sm tracking-tight leading-none">
                SMARTFUN 360
              </span>
              <span className="text-[11px] leading-tight mt-0.5 hidden sm:block" style={{ color: 'var(--text-muted)' }}>
                Teach Smart. Learn with Fun.
              </span>
            </span>
          </button>

          <span className="hidden xl:inline text-xs" style={{ color: 'var(--text-muted)' }} aria-hidden="true">
            /
          </span>
          <span
            className="hidden xl:inline text-xs font-semibold truncate max-w-[140px]"
            style={{ color: 'var(--accent-primary)' }}
          >
            {currentTab.label}
          </span>
        </div>

        {/* Zone 2 (Center): Tab Links (single-line, clean typography) */}
        <nav className="hidden lg:flex items-center gap-1 overflow-x-auto no-scrollbar" aria-label="Primary modules">
          {NAV_ITEMS.map((item) => {
            const active = activeModule === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 relative"
                style={{
                  color: active ? 'var(--accent-primary)' : 'var(--text-secondary)',
                  backgroundColor: active ? 'var(--bg-elevated)' : 'transparent',
                }}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Zone 3 (Right): Palette indicator, Theme trigger, Light/Dark toggle, User Profile & Sign Out */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onOpenThemeModal}
            className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0"
            style={{
              backgroundColor: 'var(--bg-elevated)',
              color: 'var(--text-secondary)',
            }}
            title={`Current Palette: ${activePalette.name}`}
          >
            <Palette className="w-3.5 h-3.5" style={{ color: 'var(--accent-primary)' }} />
            <span className="hidden 2xl:inline">{activePalette.name}</span>
          </button>

          <button
            type="button"
            onClick={onToggleMode}
            className="p-2 rounded-lg transition-colors shrink-0"
            style={{
              backgroundColor: 'var(--bg-elevated)',
              color: 'var(--text-secondary)',
            }}
            aria-label="Toggle Light/Dark mode"
          >
            {mode === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </button>

          <div
            className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-xl shrink-0"
            style={{
              backgroundColor: 'var(--bg-elevated)',
              border: '1px solid var(--border-hairline)',
            }}
          >
            <span className="text-sm leading-none">{user.avatar}</span>
            <span className="text-xs font-semibold truncate max-w-[115px]">{user.name}</span>
          </div>

          <button
            type="button"
            onClick={onSignOut}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 hover:opacity-85"
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-hairline)',
              color: 'var(--text-secondary)',
            }}
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((v) => !v)}
            className="lg:hidden p-2 rounded-lg"
            style={{
              backgroundColor: 'var(--bg-elevated)',
              color: 'var(--text-primary)',
            }}
            aria-label="Toggle navigation drawer"
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Mobile / Tablet Navigation Drawer */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden px-4 py-3 border-t space-y-2"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-hairline)',
          }}
        >
          <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: 'var(--border-hairline)' }}>
            <div className="flex items-center gap-2">
              <span className="text-base">{user.avatar}</span>
              <div>
                <p className="text-xs font-semibold">{user.name}</p>
                <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{user.institution}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onOpenThemeModal}
              className="px-2.5 py-1.5 rounded-lg text-xs font-medium inline-flex items-center gap-1.5"
              style={{ backgroundColor: 'var(--bg-elevated)' }}
            >
              <Palette className="w-3.5 h-3.5" />
              {activePalette.name}
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            {NAV_ITEMS.map((item) => {
              const active = activeModule === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onNavigate(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className="px-3 py-2 rounded-lg text-xs font-semibold text-left whitespace-nowrap truncate"
                  style={{
                    backgroundColor: active ? 'var(--accent-primary)' : 'var(--bg-elevated)',
                    color: active ? 'var(--accent-on-primary)' : 'var(--text-secondary)',
                  }}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </header>
  );
}
