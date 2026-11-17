import { Check, Moon, Sun, X } from 'lucide-react';
import { PALETTES } from '../data/blueprints';
import type { PaletteId, ThemeMode } from '../types';

interface ThemeModalProps {
  isOpen: boolean;
  onClose: () => void;
  palette: PaletteId;
  setPalette: (p: PaletteId) => void;
  mode: ThemeMode;
  setMode: (m: ThemeMode) => void;
}

export function ThemeModal({
  isOpen,
  onClose,
  palette,
  setPalette,
  mode,
  setMode,
}: ThemeModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="theme-modal-title"
    >
      <div
        className="w-full max-w-lg rounded-2xl p-6 shadow-2xl"
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-hairline)',
          color: 'var(--text-primary)',
        }}
      >
        <div className="flex items-center justify-between pb-4 border-b" style={{ borderColor: 'var(--border-hairline)' }}>
          <div>
            <h2 id="theme-modal-title" className="text-xl font-bold tracking-tight">
              Theme & Palette Studio
            </h2>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              Switch light/dark contrast and custom-engineered classroom palettes
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg transition-colors hover:opacity-80 focus-visible:outline-2"
            style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
            aria-label="Close theme modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-5">
          <span className="text-xs font-semibold block mb-2.5" style={{ color: 'var(--text-secondary)' }}>
            Appearance Mode
          </span>
          <div
            className="grid grid-cols-2 gap-2 p-1 rounded-xl"
            style={{ backgroundColor: 'var(--bg-elevated)' }}
          >
            <button
              type="button"
              onClick={() => setMode('light')}
              className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all whitespace-nowrap"
              style={{
                backgroundColor: mode === 'light' ? 'var(--bg-surface)' : 'transparent',
                color: mode === 'light' ? 'var(--text-primary)' : 'var(--text-muted)',
                border: mode === 'light' ? '1px solid var(--border-hairline)' : '1px solid transparent',
              }}
            >
              <Sun className="w-4 h-4" />
              Light Mode
            </button>
            <button
              type="button"
              onClick={() => setMode('dark')}
              className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all whitespace-nowrap"
              style={{
                backgroundColor: mode === 'dark' ? 'var(--bg-surface)' : 'transparent',
                color: mode === 'dark' ? 'var(--text-primary)' : 'var(--text-muted)',
                border: mode === 'dark' ? '1px solid var(--border-hairline)' : '1px solid transparent',
              }}
            >
              <Moon className="w-4 h-4" />
              Dark Mode
            </button>
          </div>
        </div>

        <div className="mt-6">
          <span className="text-xs font-semibold block mb-2.5" style={{ color: 'var(--text-secondary)' }}>
            Color Palette
          </span>
          <div className="space-y-3">
            {(Object.keys(PALETTES) as PaletteId[]).map((id) => {
              const item = PALETTES[id];
              const active = palette === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setPalette(id)}
                  className="w-full flex items-center justify-between gap-4 p-4 rounded-xl text-left transition-all"
                  style={{
                    backgroundColor: active ? 'var(--bg-elevated)' : 'var(--bg-canvas)',
                    border: active
                      ? '1px solid var(--accent-primary)'
                      : '1px solid var(--border-hairline)',
                  }}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{item.name}</span>
                      {active && (
                        <span
                          className="inline-flex items-center gap-1 text-xs font-medium"
                          style={{ color: 'var(--accent-primary)' }}
                        >
                          <Check className="w-3.5 h-3.5" />
                          Active
                        </span>
                      )}
                    </div>
                    <p className="text-xs mt-1 truncate" style={{ color: 'var(--text-muted)' }}>
                      {item.subtitle}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {item.swatches.map((hex, i) => (
                      <span
                        key={hex + i}
                        className="w-6 h-6 rounded-md border border-white/15"
                        style={{
                          background:
                            i === 1
                              ? `linear-gradient(135deg, ${item.swatches[1]}, ${item.swatches[2]})`
                              : hex,
                        }}
                        title={hex}
                      />
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90"
            style={{
              backgroundColor: 'var(--accent-primary)',
              color: 'var(--accent-on-primary)',
            }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
