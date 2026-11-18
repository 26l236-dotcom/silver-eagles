import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  Bot,
  Check,
  Copy,
  ExternalLink,
  Globe,
  History,
  Loader2,
  MapPin,
  Plus,
  Send,
  Trash2,
  X,
} from 'lucide-react';
import { TEACHMATE_TOOLS } from '../data/blueprints';
import type {
  ChatMessage,
  ChatSession,
  GeminiChatModelId,
  GroundingMode,
  GroundingSource,
} from '../types';
import { RichMathMarkdown } from './RichMathMarkdown';

const HISTORY_STORAGE_KEY = 'smartfun360_teachmate_history';

const CHAT_MODEL_OPTIONS: Array<{ id: GeminiChatModelId; label: string; hint: string }> = [
  { id: 'gemini-4-hydrogen', label: 'Gemini 4 Hydrogen', hint: 'Balanced General Teaching' },
  { id: 'gemini-3.1-flash-lite', label: 'Gemini 3.1 Flash Lite', hint: 'Ultra-Fast Quick Tasks' },
  { id: 'gemini-4-argon', label: 'Gemini 4 Argon', hint: 'Complex STEM & Interactive' },
  { id: 'gemini-4-carbon', label: 'Gemini 4 Carbon', hint: 'Deep Reasoning & Proofs' },
];

export function TeachMateAI() {
  const [selectedToolId, setSelectedToolId] = useState(TEACHMATE_TOOLS[0].id);
  const [selectedModel, setSelectedModel] = useState<GeminiChatModelId>('gemini-4-hydrogen');
  const [groundingMode, setGroundingMode] = useState<GroundingMode>('standard');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    try {
      const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
      return raw ? (JSON.parse(raw) as ChatSession[]) : [];
    } catch {
      return [];
    }
  });
  const [activeSessionId, setActiveSessionId] = useState<string>(() => `tm-${Date.now()}`);
  const scrollEndRef = useRef<HTMLDivElement>(null);

  const activeTool = TEACHMATE_TOOLS.find((t) => t.id === selectedToolId) || TEACHMATE_TOOLS[0];

  useEffect(() => {
    scrollEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streaming]);

  const saveSessionSnapshot = (msgs: ChatMessage[], toolId: string) => {
    if (msgs.length === 0) return;
    const tool = TEACHMATE_TOOLS.find((t) => t.id === toolId) || TEACHMATE_TOOLS[0];
    const firstUser = msgs.find((m) => m.role === 'user')?.text || tool.title;
    const title = firstUser.slice(0, 48) + (firstUser.length > 48 ? '...' : '');

    setSessions((prev) => {
      const next = [
        {
          id: activeSessionId,
          toolId,
          toolTitle: tool.title,
          title,
          updatedAt: Date.now(),
          messages: msgs,
        },
        ...prev.filter((s) => s.id !== activeSessionId),
      ].slice(0, 20);
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const handleNewChat = () => {
    setMessages([]);
    setErrorMsg('');
    setActiveSessionId(`tm-${Date.now()}`);
  };

  const getOptionalLatLng = (): Promise<{ latitude: number; longitude: number } | null> => {
    if (groundingMode !== 'maps' || !navigator.geolocation) return Promise.resolve(null);
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) =>
          resolve({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          }),
        () => resolve(null),
        { timeout: 3000 }
      );
    });
  };

  const handleSend = async (promptText?: string) => {
    const query = (promptText ?? input).trim();
    if (!query || streaming) return;

    setErrorMsg('');
    if (!promptText) setInput('');

    const effectiveModel: GeminiChatModelId =
      groundingMode === 'standard' ? selectedModel : 'gemini-4-hydrogen';

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: query,
      timestamp: Date.now(),
    };

    const assistantId = `a-${Date.now() + 1}`;
    const assistantMsg: ChatMessage = {
      id: assistantId,
      role: 'model',
      text: '',
      timestamp: Date.now(),
      modelUsed: effectiveModel,
      groundingMode,
    };

    const historyBefore = [...messages];
    setMessages([...messages, userMsg, assistantMsg]);
    setStreaming(true);

    try {
      const latLng = await getOptionalLatLng();

      const res = await fetch('/api/ai/teachmate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toolId: selectedToolId,
          message: query,
          model: effectiveModel,
          groundingMode,
          latLng,
          history: historyBefore.map((m) => ({ role: m.role, text: m.text })),
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: 'Failed to connect to TeachMate AI.' }));
        setErrorMsg(errData.error || 'TeachMate AI error.');
        setMessages((prev) => prev.filter((m) => m.id !== assistantId));
        setStreaming(false);
        return;
      }

      // Grounded modes return JSON { text, sources, modelUsed }
      if (groundingMode === 'search' || groundingMode === 'maps') {
        const data = (await res.json()) as {
          text: string;
          sources?: GroundingSource[];
          modelUsed?: GeminiChatModelId;
        };
        const completedMsg: ChatMessage = {
          ...assistantMsg,
          text: data.text || 'No grounded response returned.',
          sources: data.sources || [],
          modelUsed: data.modelUsed || 'gemini-4-hydrogen',
        };
        const finalMsgs = [...historyBefore, userMsg, completedMsg];
        setMessages(finalMsgs);
        saveSessionSnapshot(finalMsgs, selectedToolId);
        setStreaming(false);
        return;
      }

      // Standard multi-turn streaming mode
      const reader = res.body?.getReader();
      if (!reader) {
        setErrorMsg('Streaming response unavailable.');
        setStreaming(false);
        return;
      }

      const decoder = new TextDecoder();
      let accumulated = '';
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split('\n\n');
        buffer = events.pop() || '';

        for (const ev of events) {
          const line = ev.trim();
          if (!line.startsWith('data:')) continue;
          try {
            const payload = JSON.parse(line.slice(5).trim()) as {
              text?: string;
              error?: string;
              done?: boolean;
            };
            if (payload.error) {
              setErrorMsg(payload.error);
            }
            if (payload.text) {
              accumulated += payload.text;
              setMessages((prev) =>
                prev.map((m) => (m.id === assistantId ? { ...m, text: accumulated } : m))
              );
            }
          } catch {
            // ignore partial SSE line
          }
        }
      }

      const finalMsgs = [...historyBefore, userMsg, { ...assistantMsg, text: accumulated }];
      saveSessionSnapshot(finalMsgs, selectedToolId);
    } catch {
      setErrorMsg('Network error communicating with TeachMate AI.');
    } finally {
      setStreaming(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    void handleSend();
  };

  const handleCopyMessage = async (msg: ChatMessage) => {
    await navigator.clipboard.writeText(msg.text);
    setCopiedId(msg.id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const handleDeleteSession = (id: string) => {
    setSessions((prev) => {
      const next = prev.filter((s) => s.id !== id);
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  return (
    <div className="max-w-[1440px] mx-auto px-4 lg:px-8 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: 8 Specialized Teacher Tools */}
        <aside
          className="lg:col-span-4 rounded-2xl p-4 space-y-3"
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-hairline)',
          }}
        >
          <div className="flex items-center justify-between px-1 pb-2 border-b" style={{ borderColor: 'var(--border-hairline)' }}>
            <div>
              <h1 className="font-display text-lg font-bold tracking-tight">TeachMate AI</h1>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                8 Specialized Pedagogical Tools
              </p>
            </div>
            <button
              type="button"
              onClick={() => setHistoryOpen(true)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold"
              style={{
                backgroundColor: 'var(--bg-elevated)',
                color: 'var(--text-secondary)',
              }}
            >
              <History className="w-3.5 h-3.5" />
              History ({sessions.length})
            </button>
          </div>

          <div className="space-y-1.5">
            {TEACHMATE_TOOLS.map((tool, index) => {
              const active = tool.id === selectedToolId;
              return (
                <button
                  key={tool.id}
                  type="button"
                  onClick={() => setSelectedToolId(tool.id)}
                  className="w-full text-left p-3 rounded-xl transition-all"
                  style={{
                    backgroundColor: active ? 'var(--bg-elevated)' : 'transparent',
                    border: active
                      ? '1px solid var(--accent-primary)'
                      : '1px solid transparent',
                  }}
                >
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono text-[11px] font-bold" style={{ color: 'var(--accent-primary)' }}>
                      0{index + 1}.
                    </span>
                    <span className="text-xs font-bold">{tool.title}</span>
                  </div>
                  <p className="text-[11px] mt-0.5 pl-6" style={{ color: 'var(--text-muted)' }}>
                    {tool.subtitle}
                  </p>
                </button>
              );
            })}
          </div>
        </aside>

        {/* Right: Multi-Turn, Multi-Model & Grounded Chat Workspace */}
        <section
          className="lg:col-span-8 min-w-0 rounded-2xl flex flex-col h-[76vh] min-h-[560px]"
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-hairline)',
          }}
        >
          {/* Active Tool + Model Tier + Grounding Toolbar */}
          <div
            className="px-5 py-3.5 border-b flex flex-wrap items-center justify-between gap-3"
            style={{ borderColor: 'var(--border-hairline)' }}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--accent-primary)' }}
              >
                <Bot className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h2 className="font-display text-base font-bold truncate">{activeTool.title}</h2>
                <p className="text-[11px] truncate" style={{ color: 'var(--text-muted)' }}>
                  {activeTool.subtitle}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Model Tier Selector */}
              <select
                value={groundingMode === 'standard' ? selectedModel : 'gemini-4-hydrogen'}
                disabled={groundingMode !== 'standard'}
                onChange={(e) => setSelectedModel(e.target.value as GeminiChatModelId)}
                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold outline-none disabled:opacity-60"
                style={{
                  backgroundColor: 'var(--bg-elevated)',
                  color: 'var(--text-primary)',
                }}
                aria-label="Select Gemini model tier"
              >
                {CHAT_MODEL_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label} ({opt.hint})
                  </option>
                ))}
              </select>

              {/* Grounding Mode Selector */}
              <div
                className="flex items-center gap-1 p-0.5 rounded-lg"
                style={{ backgroundColor: 'var(--bg-elevated)' }}
              >
                <button
                  type="button"
                  onClick={() => setGroundingMode('standard')}
                  className="px-2.5 py-1 rounded-md text-[11px] font-semibold"
                  style={{
                    backgroundColor: groundingMode === 'standard' ? 'var(--bg-surface)' : 'transparent',
                    color: groundingMode === 'standard' ? 'var(--text-primary)' : 'var(--text-muted)',
                  }}
                >
                  Chat
                </button>
                <button
                  type="button"
                  onClick={() => setGroundingMode('search')}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold"
                  style={{
                    backgroundColor: groundingMode === 'search' ? 'var(--bg-surface)' : 'transparent',
                    color: groundingMode === 'search' ? 'var(--accent-primary)' : 'var(--text-muted)',
                  }}
                >
                  <Globe className="w-3 h-3" />
                  Search
                </button>
                <button
                  type="button"
                  onClick={() => setGroundingMode('maps')}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold"
                  style={{
                    backgroundColor: groundingMode === 'maps' ? 'var(--bg-surface)' : 'transparent',
                    color: groundingMode === 'maps' ? 'var(--accent-primary)' : 'var(--text-muted)',
                  }}
                >
                  <MapPin className="w-3 h-3" />
                  Maps
                </button>
              </div>

              <button
                type="button"
                onClick={handleNewChat}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold shrink-0"
                style={{
                  backgroundColor: 'var(--bg-elevated)',
                  color: 'var(--text-secondary)',
                }}
              >
                <Plus className="w-3.5 h-3.5" />
                New
              </button>
            </div>
          </div>

          {/* Messages Viewport */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col justify-center items-center text-center max-w-xl mx-auto space-y-4">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center"
                  style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--accent-primary)' }}
                >
                  <Bot className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-display text-xl font-bold">Ask Anything · {activeTool.title}</h3>
                  <p className="text-sm mt-2 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    {groundingMode === 'search'
                      ? 'Google Search grounding enabled via gemini-4-hydrogen for up-to-date web facts and verified citations.'
                      : groundingMode === 'maps'
                      ? 'Google Maps grounding enabled via gemini-4-hydrogen for places, directions, and local discoveries.'
                      : 'Ask any question across science, mathematics, coding, history, or classroom design—powered by deep Gemini reasoning.'}
                  </p>
                </div>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className="min-w-0 max-w-[92%] sm:max-w-[85%] rounded-2xl px-4 py-3"
                    style={{
                      backgroundColor:
                        msg.role === 'user' ? 'var(--accent-primary)' : 'var(--bg-canvas)',
                      color:
                        msg.role === 'user' ? 'var(--accent-on-primary)' : 'var(--text-primary)',
                      border:
                        msg.role === 'user' ? 'none' : '1px solid var(--border-hairline)',
                    }}
                  >
                    {msg.role === 'user' ? (
                      <p className="text-sm whitespace-pre-wrap break-words">{msg.text}</p>
                    ) : msg.text ? (
                      <div className="space-y-3 min-w-0">
                        <RichMathMarkdown content={msg.text} />

                        {/* Grounding Sources (Google Search & Google Maps URLs) */}
                        {msg.sources && msg.sources.length > 0 && (
                          <div
                            className="pt-2.5 border-t space-y-1.5"
                            style={{ borderColor: 'var(--border-hairline)' }}
                          >
                            <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--accent-primary)' }}>
                              Verified Sources ({msg.sources.length})
                            </p>
                            <div className="flex flex-col gap-1.5">
                              {msg.sources.map((src, sIdx) => (
                                <a
                                  key={src.uri + sIdx}
                                  href={src.uri}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-start gap-1.5 text-xs underline hover:opacity-80"
                                  style={{ color: 'var(--text-secondary)' }}
                                >
                                  <ExternalLink className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                                  <span>
                                    {src.title}
                                    {src.snippet ? ` — "${src.snippet}"` : ''}
                                  </span>
                                </a>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-1 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                          <span className="font-mono">{msg.modelUsed || 'gemini-4-hydrogen'}</span>
                          <button
                            type="button"
                            onClick={() => void handleCopyMessage(msg)}
                            className="inline-flex items-center gap-1 font-semibold opacity-80 hover:opacity-100"
                          >
                            {copiedId === msg.id ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-400" />
                                Copied
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                Copy
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Thinking with {msg.modelUsed || 'Gemini'}...</span>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
            <div ref={scrollEndRef} />
          </div>

          {errorMsg && (
            <div className="px-5 py-2 text-xs text-red-400 font-medium" role="alert">
              {errorMsg}
            </div>
          )}

          {/* Input Bar */}
          <form
            onSubmit={handleSubmit}
            className="p-4 border-t flex items-center gap-2.5"
            style={{ borderColor: 'var(--border-hairline)' }}
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                groundingMode === 'maps'
                  ? 'Ask about any location, museum, campus, or place nearby...'
                  : groundingMode === 'search'
                  ? 'Ask any question requiring live Google Search facts...'
                  : 'Ask any question...'
              }
              disabled={streaming}
              className="flex-1 px-4 py-2.5 rounded-xl text-sm outline-none"
              style={{
                backgroundColor: 'var(--bg-canvas)',
                border: '1px solid var(--border-hairline)',
                color: 'var(--text-primary)',
              }}
            />
            <button
              type="submit"
              disabled={streaming || !input.trim()}
              className="px-4 py-2.5 rounded-xl text-sm font-bold inline-flex items-center gap-1.5 disabled:opacity-50"
              style={{
                backgroundColor: 'var(--accent-primary)',
                color: 'var(--accent-on-primary)',
              }}
            >
              {streaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              <span className="hidden sm:inline">Send</span>
            </button>
          </form>
        </section>
      </div>

      {/* History Drawer */}
      {historyOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs">
          <div
            className="w-full max-w-md h-full p-5 flex flex-col"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderLeft: '1px solid var(--border-hairline)',
            }}
          >
            <div className="flex items-center justify-between pb-4 border-b" style={{ borderColor: 'var(--border-hairline)' }}>
              <h3 className="font-display text-lg font-bold">Conversation History</h3>
              <button
                type="button"
                onClick={() => setHistoryOpen(false)}
                className="p-2 rounded-lg"
                style={{ backgroundColor: 'var(--bg-elevated)' }}
                aria-label="Close history drawer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-2.5">
              {sessions.length === 0 ? (
                <p className="text-xs text-center py-12" style={{ color: 'var(--text-muted)' }}>
                  No saved TeachMate sessions yet. Start a conversation to archive it here.
                </p>
              ) : (
                sessions.map((s) => (
                  <div
                    key={s.id}
                    className="p-3 rounded-xl flex items-start justify-between gap-2"
                    style={{
                      backgroundColor: 'var(--bg-canvas)',
                      border: '1px solid var(--border-hairline)',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedToolId(s.toolId);
                        setMessages(s.messages);
                        setActiveSessionId(s.id);
                        setHistoryOpen(false);
                      }}
                      className="text-left min-w-0 flex-1"
                    >
                      <p className="text-xs font-bold truncate">{s.title}</p>
                      <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        {s.toolTitle} · {s.messages.length} messages
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteSession(s.id)}
                      className="p-1.5 rounded-md opacity-70 hover:opacity-100"
                      style={{ color: 'var(--text-muted)' }}
                      aria-label="Delete session"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
