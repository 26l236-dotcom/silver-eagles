import confetti from 'canvas-confetti';
import { useEffect, useMemo, useState } from 'react';
import {
  Award,
  Check,
  Flame,
  Gamepad2,
  HelpCircle,
  Pencil,
  Plus,
  RotateCcw,
  Shield,
  Swords,
  Timer,
  Trash2,
  Trophy,
  Zap,
} from 'lucide-react';
import {
  CIPHER_WORDS,
  MEMORY_MATCH_PAIRS,
  RAPID_RUSH_QUESTIONS,
  SORTING_ITEMS,
} from '../data/blueprints';
import type { AuthUser, StudentProgress } from '../types';
import { soundEngine } from '../utils/audio';

const PROGRESS_KEY = 'smartfun360_student_progress';

type MiniGameId = 'battle' | 'memory' | 'sorting' | 'cipher' | 'rush';

const GAME_CATALOG: Array<{
  id: MiniGameId;
  title: string;
  subtitle: string;
  xpReward: number;
  icon: typeof Swords;
}> = [
  {
    id: 'battle',
    title: '1v1 Quiz Battle',
    subtitle: 'Race head-to-head against RoboSpark AI across 5 rapid STEM rounds.',
    xpReward: 150,
    icon: Swords,
  },
  {
    id: 'memory',
    title: 'Memory Match',
    subtitle: 'Flip cards to connect scientific concepts with their real-world definitions.',
    xpReward: 140,
    icon: Shield,
  },
  {
    id: 'sorting',
    title: 'Category Sorting Rush',
    subtitle: 'Classify energy sources into Renewable vs. Non-Renewable before time runs out.',
    xpReward: 130,
    icon: Zap,
  },
  {
    id: 'cipher',
    title: 'Cipher Term Decryption',
    subtitle: 'Unscramble jumbled STEM vocabulary against a 45-second countdown.',
    xpReward: 120,
    icon: HelpCircle,
  },
  {
    id: 'rush',
    title: 'Rapid Question Rush',
    subtitle: '60-second survival trivia sprint with 1x, 2x, and 3x streak multipliers.',
    xpReward: 180,
    icon: Timer,
  },
];

function shuffleArray<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

interface StudentZoneProps {
  user: AuthUser;
}

export function StudentZone({ user }: StudentZoneProps) {
  const [progress, setProgress] = useState<StudentProgress>(() => {
    try {
      const raw = localStorage.getItem(PROGRESS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as StudentProgress;
        return {
          ...parsed,
          xp: Math.max(10000, Number(parsed.xp) || 10000),
        };
      }
    } catch {
      // fallback below
    }
    return {
      xp: 10000,
      streakDays: 5,
      gamesPlayed: 4,
      wins: 3,
      badges: ['SDG 4 Explorer', 'Quick Buzzer'],
    };
  });

  const [activeGame, setActiveGame] = useState<MiniGameId>('battle');

  const awardXP = (amount: number, won: boolean, badgeName?: string) => {
    setProgress((prev) => {
      const nextBadges =
        badgeName && !prev.badges.includes(badgeName)
          ? [...prev.badges, badgeName]
          : prev.badges;
      const next: StudentProgress = {
        xp: prev.xp + amount,
        streakDays: prev.streakDays,
        gamesPlayed: prev.gamesPlayed + 1,
        wins: prev.wins + (won ? 1 : 0),
        badges: nextBadges,
      };
      localStorage.setItem(PROGRESS_KEY, JSON.stringify(next));
      return next;
    });

    if (won) {
      soundEngine.playVictory();
      void confetti({ particleCount: 70, spread: 60, origin: { y: 0.65 } });
    }
  };

  const level = Math.floor(progress.xp / 250) + 1;
  const xpIntoLevel = progress.xp % 250;
  const levelPct = Math.round((xpIntoLevel / 250) * 100);

  return (
    <div className="max-w-[1440px] mx-auto px-4 lg:px-8 py-8 space-y-8">
      {/* Gamified Student Profile Card */}
      <section
        className="rounded-2xl p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center"
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-hairline)',
        }}
      >
        <div className="lg:col-span-5 flex items-center gap-4">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shrink-0"
            style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-hairline)' }}
          >
            {user.avatar}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold" style={{ color: 'var(--accent-primary)' }}>
              Student Gamer Card · {user.institution}
            </p>
            <h1 className="font-display text-2xl sm:text-3xl font-bold truncate">
              {user.name}
            </h1>
            <div className="flex items-center gap-3 text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
              <span className="font-bold">Level {level}</span>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1 tabular-nums">
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                {progress.streakDays} day streak
              </span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">{progress.wins} wins</span>
            </div>
          </div>
        </div>

        {/* XP Progress Bar */}
        <div className="lg:col-span-4 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold tabular-nums">
            <span>XP Progress to Level {level + 1}</span>
            <span style={{ color: 'var(--accent-primary)' }}>{xpIntoLevel} / 250 XP</span>
          </div>
          <div className="h-3 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-elevated)' }}>
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{ width: `${levelPct}%`, background: 'var(--hero-gradient)' }}
            />
          </div>
          <p className="text-[11px] font-mono tabular-nums" style={{ color: 'var(--text-muted)' }}>
            Total Career XP: {progress.xp.toLocaleString()}
          </p>
        </div>

        {/* Unlocked Badges */}
        <div className="lg:col-span-3 space-y-1.5">
          <span className="text-xs font-semibold flex items-center gap-1.5">
            <Award className="w-4 h-4" style={{ color: 'var(--accent-primary)' }} />
            Unlocked Badges ({progress.badges.length})
          </span>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            {progress.badges.join(' · ')}
          </p>
        </div>
      </section>

      {/* Mini-Game Selector + Interactive Arena */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <aside className="lg:col-span-4 space-y-2.5">
          <div className="flex items-center gap-2 px-1">
            <Gamepad2 className="w-5 h-5" style={{ color: 'var(--accent-primary)' }} />
            <h2 className="font-display text-lg font-bold">5 Interactive Mini-Games</h2>
          </div>

          {GAME_CATALOG.map((g) => {
            const Icon = g.icon;
            const active = activeGame === g.id;
            return (
              <button
                key={g.id}
                type="button"
                onClick={() => setActiveGame(g.id)}
                className="w-full text-left p-4 rounded-2xl transition-all"
                style={{
                  backgroundColor: active ? 'var(--bg-elevated)' : 'var(--bg-surface)',
                  border: active
                    ? '1px solid var(--accent-primary)'
                    : '1px solid var(--border-hairline)',
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4" style={{ color: 'var(--accent-primary)' }} />
                    <span className="text-sm font-bold">{g.title}</span>
                  </div>
                  <span className="font-mono text-xs font-semibold tabular-nums" style={{ color: 'var(--accent-primary)' }}>
                    +{g.xpReward} XP
                  </span>
                </div>
                <p className="text-xs mt-1.5 leading-snug" style={{ color: 'var(--text-secondary)' }}>
                  {g.subtitle}
                </p>
              </button>
            );
          })}
        </aside>

        <div
          className="lg:col-span-8 rounded-2xl p-6 min-h-[460px]"
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-hairline)',
          }}
        >
          {activeGame === 'battle' && <QuizBattleGame onFinish={(xp, won) => awardXP(xp, won, 'AI Challenger')} />}
          {activeGame === 'memory' && <MemoryMatchGame onFinish={(xp, won) => awardXP(xp, won, 'Memory Master')} />}
          {activeGame === 'sorting' && <SortingRushGame onFinish={(xp, won) => awardXP(xp, won, 'Clean Energy Ace')} />}
          {activeGame === 'cipher' && <CipherGame onFinish={(xp, won) => awardXP(xp, won, 'STEM Decoder')} />}
          {activeGame === 'rush' && <RapidRushGame onFinish={(xp, won) => awardXP(xp, won, 'Speed Tactician')} />}
        </div>
      </section>
    </div>
  );
}

/* ============================================================================
   1. 1v1 Quiz Battle vs RoboSpark AI
   ============================================================================ */
function QuizBattleGame({ onFinish }: { onFinish: (xp: number, won: boolean) => void }) {
  const questions = useMemo(() => RAPID_RUSH_QUESTIONS.slice(0, 5), []);
  const [round, setRound] = useState(0);
  const [playerScore, setPlayerScore] = useState(0);
  const [botScore, setBotScore] = useState(0);
  const [done, setDone] = useState(false);
  const [roundResult, setRoundResult] = useState('');

  const current = questions[round];

  const handleAnswer = (idx: number) => {
    if (done) return;
    const playerCorrect = idx === current.ans;
    const botCorrect = Math.random() < 0.72;

    const pGain = playerCorrect ? 100 : 0;
    const bGain = botCorrect ? 85 : 0;

    if (playerCorrect) soundEngine.playCorrect();
    else soundEngine.playWrong();

    const nextP = playerScore + pGain;
    const nextB = botScore + bGain;
    setPlayerScore(nextP);
    setBotScore(nextB);
    setRoundResult(
      `${playerCorrect ? 'You scored +100' : 'Missed'} · RoboSpark AI ${botCorrect ? 'scored +85' : 'missed'}`
    );

    if (round + 1 >= questions.length) {
      setDone(true);
      const won = nextP >= nextB;
      onFinish(won ? 150 : 60, won);
    } else {
      setTimeout(() => {
        setRound((r) => r + 1);
        setRoundResult('');
      }, 850);
    }
  };

  const reset = () => {
    setRound(0);
    setPlayerScore(0);
    setBotScore(0);
    setDone(false);
    setRoundResult('');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display text-xl font-bold">1v1 Quiz Battle vs. RoboSpark AI</h3>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Round {Math.min(round + 1, questions.length)} of {questions.length}
          </p>
        </div>
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
          style={{ backgroundColor: 'var(--bg-elevated)' }}
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Restart
        </button>
      </div>

      {/* Head-to-Head Score Bars */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--bg-canvas)', border: '1px solid var(--border-hairline)' }}>
          <p className="text-xs font-semibold">You</p>
          <p className="font-mono text-2xl font-bold tabular-nums mt-1" style={{ color: 'var(--accent-primary)' }}>
            {playerScore}
          </p>
        </div>
        <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--bg-canvas)', border: '1px solid var(--border-hairline)' }}>
          <p className="text-xs font-semibold">RoboSpark AI</p>
          <p className="font-mono text-2xl font-bold tabular-nums mt-1 text-amber-400">
            {botScore}
          </p>
        </div>
      </div>

      {done ? (
        <div className="text-center py-8 space-y-4">
          <Trophy className="w-10 h-10 mx-auto text-amber-400" />
          <h4 className="font-display text-2xl font-bold">
            {playerScore >= botScore ? 'Victory over RoboSpark AI!' : 'RoboSpark AI Edge Out!'}
          </h4>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Final Score: {playerScore} to {botScore} · Earned +{playerScore >= botScore ? 150 : 60} XP
          </p>
          <button
            type="button"
            onClick={reset}
            className="px-5 py-2.5 rounded-xl text-sm font-bold"
            style={{ backgroundColor: 'var(--accent-primary)', color: 'var(--accent-on-primary)' }}
          >
            Rematch
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="font-display text-lg font-bold">{current.q}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {current.options.map((opt, idx) => (
              <button
                key={opt}
                type="button"
                disabled={Boolean(roundResult)}
                onClick={() => handleAnswer(idx)}
                className="p-4 rounded-xl text-left text-sm font-semibold transition-colors hover:opacity-90"
                style={{
                  backgroundColor: 'var(--bg-canvas)',
                  border: '1px solid var(--border-hairline)',
                }}
              >
                {opt}
              </button>
            ))}
          </div>
          {roundResult && (
            <p className="text-xs font-semibold" style={{ color: 'var(--accent-primary)' }}>
              {roundResult}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/* ============================================================================
   2. Memory Match (Concept <-> Definition)
   ============================================================================ */
interface MemoryCard {
  uid: string;
  pairId: string;
  label: string;
  kind: 'term' | 'def';
}

function MemoryMatchGame({ onFinish }: { onFinish: (xp: number, won: boolean) => void }) {
  const buildDeck = () => {
    const cards: MemoryCard[] = [];
    MEMORY_MATCH_PAIRS.forEach((p) => {
      cards.push({ uid: `${p.id}-t`, pairId: p.id, label: p.term, kind: 'term' });
      cards.push({ uid: `${p.id}-d`, pairId: p.id, label: p.match, kind: 'def' });
    });
    return shuffleArray(cards);
  };

  const [cards, setCards] = useState<MemoryCard[]>(buildDeck);
  const [flipped, setFlipped] = useState<string[]>([]);
  const [matchedPairs, setMatchedPairs] = useState<string[]>([]);
  const [moves, setMoves] = useState(0);

  const handleFlip = (card: MemoryCard) => {
    if (flipped.length === 2 || flipped.includes(card.uid) || matchedPairs.includes(card.pairId)) {
      return;
    }

    soundEngine.playBuzzer(0);
    const nextFlipped = [...flipped, card.uid];
    setFlipped(nextFlipped);

    if (nextFlipped.length === 2) {
      setMoves((m) => m + 1);
      const first = cards.find((c) => c.uid === nextFlipped[0]);
      const second = cards.find((c) => c.uid === nextFlipped[1]);

      if (first && second && first.pairId === second.pairId) {
        soundEngine.playCorrect();
        const nextMatched = [...matchedPairs, first.pairId];
        setMatchedPairs(nextMatched);
        setFlipped([]);
        if (nextMatched.length === MEMORY_MATCH_PAIRS.length) {
          onFinish(140, true);
        }
      } else {
        setTimeout(() => setFlipped([]), 850);
      }
    }
  };

  const reset = () => {
    setCards(buildDeck());
    setFlipped([]);
    setMatchedPairs([]);
    setMoves(0);
  };

  const completed = matchedPairs.length === MEMORY_MATCH_PAIRS.length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display text-xl font-bold">Memory Match: Concept & Definition</h3>
          <p className="text-xs tabular-nums" style={{ color: 'var(--text-muted)' }}>
            Pairs Matched: {matchedPairs.length}/{MEMORY_MATCH_PAIRS.length} · Moves: {moves}
          </p>
        </div>
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
          style={{ backgroundColor: 'var(--bg-elevated)' }}
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Shuffle
        </button>
      </div>

      {completed ? (
        <div className="text-center py-10 space-y-3">
          <Trophy className="w-10 h-10 mx-auto text-emerald-400" />
          <h4 className="font-display text-2xl font-bold">All 6 Scientific Pairs Matched!</h4>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Completed in {moves} moves · Earned +140 XP
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {cards.map((card) => {
            const isOpen = flipped.includes(card.uid) || matchedPairs.includes(card.pairId);
            const isMatched = matchedPairs.includes(card.pairId);
            return (
              <button
                key={card.uid}
                type="button"
                onClick={() => handleFlip(card)}
                className="min-h-[96px] p-3 rounded-xl text-xs font-semibold flex items-center justify-center text-center transition-all"
                style={{
                  backgroundColor: isMatched
                    ? 'var(--accent-primary)'
                    : isOpen
                    ? 'var(--bg-elevated)'
                    : 'var(--bg-canvas)',
                  color: isMatched ? 'var(--accent-on-primary)' : 'var(--text-primary)',
                  border: '1px solid var(--border-hairline)',
                }}
              >
                {isOpen ? card.label : 'Tap to Reveal'}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ============================================================================
   3. Category Sorting Rush (Editable Categories & Questions)
   ============================================================================ */
const SORTING_CONFIG_KEY = 'smartfun360_sorting_rush_config';

interface SortingItem {
  id: string;
  name: string;
  category: 'renewable' | 'nonrenewable';
}

interface SortingRushConfig {
  promptLabel: string;
  leftCategoryLabel: string;
  rightCategoryLabel: string;
  items: SortingItem[];
}

const DEFAULT_SORTING_CONFIG: SortingRushConfig = {
  promptLabel: 'Classify This Energy Source',
  leftCategoryLabel: 'Renewable Energy',
  rightCategoryLabel: 'Non-Renewable Energy',
  items: SORTING_ITEMS.map((item) => ({ ...item })),
};

function loadSortingConfig(): SortingRushConfig {
  try {
    const raw = localStorage.getItem(SORTING_CONFIG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<SortingRushConfig>;
      if (Array.isArray(parsed.items) && parsed.items.length >= 2) {
        return {
          promptLabel: parsed.promptLabel?.trim() || DEFAULT_SORTING_CONFIG.promptLabel,
          leftCategoryLabel:
            parsed.leftCategoryLabel?.trim() || DEFAULT_SORTING_CONFIG.leftCategoryLabel,
          rightCategoryLabel:
            parsed.rightCategoryLabel?.trim() || DEFAULT_SORTING_CONFIG.rightCategoryLabel,
          items: parsed.items.map((it, idx) => ({
            id: it.id || `custom-${idx}`,
            name: String(it.name || '').trim() || `Item ${idx + 1}`,
            category: it.category === 'nonrenewable' ? 'nonrenewable' : 'renewable',
          })),
        };
      }
    }
  } catch {
    // ignore storage errors
  }
  return {
    ...DEFAULT_SORTING_CONFIG,
    items: DEFAULT_SORTING_CONFIG.items.map((item) => ({ ...item })),
  };
}

function SortingRushGame({ onFinish }: { onFinish: (xp: number, won: boolean) => void }) {
  const [config, setConfig] = useState<SortingRushConfig>(() => loadSortingConfig());
  const [deck, setDeck] = useState<SortingItem[]>(() => shuffleArray(loadSortingConfig().items));
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  // Editor mode state
  const [editing, setEditing] = useState(false);
  const [draftConfig, setDraftConfig] = useState<SortingRushConfig>(() => loadSortingConfig());
  const [newItemName, setNewItemName] = useState('');
  const [newItemCat, setNewItemCat] = useState<'renewable' | 'nonrenewable'>('renewable');
  const [editorError, setEditorError] = useState('');

  const passThreshold = Math.max(1, Math.ceil(deck.length * 0.7));

  const handleSort = (choice: 'renewable' | 'nonrenewable') => {
    if (done || deck.length === 0) return;
    const item = deck[index];
    const correct = item.category === choice;
    if (correct) soundEngine.playCorrect();
    else soundEngine.playWrong();

    const nextScore = score + (correct ? 1 : 0);
    setScore(nextScore);

    if (index + 1 >= deck.length) {
      setDone(true);
      const won = nextScore >= passThreshold;
      onFinish(won ? 130 : 50, won);
    } else {
      setIndex((i) => i + 1);
    }
  };

  const reset = (sourceConfig: SortingRushConfig = config) => {
    setDeck(shuffleArray(sourceConfig.items));
    setIndex(0);
    setScore(0);
    setDone(false);
  };

  const openEditor = () => {
    setDraftConfig({
      ...config,
      items: config.items.map((item) => ({ ...item })),
    });
    setEditorError('');
    setEditing(true);
  };

  const handleAddDraftItem = () => {
    const clean = newItemName.trim();
    if (!clean) {
      setEditorError('Enter a question or item name before adding.');
      return;
    }
    setEditorError('');
    setDraftConfig((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          id: `sort-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          name: clean,
          category: newItemCat,
        },
      ],
    }));
    setNewItemName('');
  };

  const handleUpdateDraftItem = (
    id: string,
    patch: Partial<Pick<SortingItem, 'name' | 'category'>>
  ) => {
    setDraftConfig((prev) => ({
      ...prev,
      items: prev.items.map((it) => (it.id === id ? { ...it, ...patch } : it)),
    }));
  };

  const handleRemoveDraftItem = (id: string) => {
    if (draftConfig.items.length <= 2) {
      setEditorError('Keep at least 2 items in Category Sorting Rush.');
      return;
    }
    setEditorError('');
    setDraftConfig((prev) => ({
      ...prev,
      items: prev.items.filter((it) => it.id !== id),
    }));
  };

  const handleSaveEditor = () => {
    const cleanedItems = draftConfig.items
      .map((it) => ({ ...it, name: it.name.trim() }))
      .filter((it) => it.name.length > 0);

    if (cleanedItems.length < 2) {
      setEditorError('Please provide at least 2 non-empty questions/items.');
      return;
    }

    const nextConfig: SortingRushConfig = {
      promptLabel: draftConfig.promptLabel.trim() || DEFAULT_SORTING_CONFIG.promptLabel,
      leftCategoryLabel:
        draftConfig.leftCategoryLabel.trim() || DEFAULT_SORTING_CONFIG.leftCategoryLabel,
      rightCategoryLabel:
        draftConfig.rightCategoryLabel.trim() || DEFAULT_SORTING_CONFIG.rightCategoryLabel,
      items: cleanedItems,
    };

    localStorage.setItem(SORTING_CONFIG_KEY, JSON.stringify(nextConfig));
    setConfig(nextConfig);
    setEditing(false);
    setEditorError('');
    reset(nextConfig);
  };

  const handleRestoreDefaults = () => {
    const fresh: SortingRushConfig = {
      ...DEFAULT_SORTING_CONFIG,
      items: DEFAULT_SORTING_CONFIG.items.map((item) => ({ ...item })),
    };
    localStorage.removeItem(SORTING_CONFIG_KEY);
    setDraftConfig(fresh);
    setConfig(fresh);
    setEditorError('');
    reset(fresh);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-display text-xl font-bold">Category Sorting Rush</h3>
          <p className="text-xs tabular-nums" style={{ color: 'var(--text-muted)' }}>
            {editing
              ? `Editing ${draftConfig.items.length} questions & categories`
              : `Item ${Math.min(index + 1, deck.length)} of ${deck.length} · Accuracy: ${score}/${deck.length}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => (editing ? setEditing(false) : openEditor())}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
            style={{
              backgroundColor: editing ? 'var(--accent-primary)' : 'var(--bg-elevated)',
              color: editing ? 'var(--accent-on-primary)' : 'var(--text-primary)',
            }}
          >
            <Pencil className="w-3.5 h-3.5" />
            {editing ? 'Back to Game' : 'Edit Questions'}
          </button>
          {!editing && (
            <button
              type="button"
              onClick={() => reset()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
              style={{ backgroundColor: 'var(--bg-elevated)' }}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset
            </button>
          )}
        </div>
      </div>

      {editing ? (
        <div className="space-y-5">
          {/* Category Labels & Prompt Editor */}
          <div
            className="p-4 rounded-2xl grid grid-cols-1 sm:grid-cols-3 gap-3"
            style={{
              backgroundColor: 'var(--bg-canvas)',
              border: '1px solid var(--border-hairline)',
            }}
          >
            <div>
              <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>
                Question Prompt Header
              </label>
              <input
                type="text"
                value={draftConfig.promptLabel}
                onChange={(e) =>
                  setDraftConfig((prev) => ({ ...prev, promptLabel: e.target.value }))
                }
                placeholder="Classify This Energy Source"
                className="w-full px-3 py-2 rounded-lg text-xs font-medium outline-none"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border-hairline)',
                }}
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold mb-1 text-emerald-400">
                Category 1 Button Name
              </label>
              <input
                type="text"
                value={draftConfig.leftCategoryLabel}
                onChange={(e) =>
                  setDraftConfig((prev) => ({ ...prev, leftCategoryLabel: e.target.value }))
                }
                placeholder="Renewable Energy"
                className="w-full px-3 py-2 rounded-lg text-xs font-medium outline-none"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border-hairline)',
                }}
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold mb-1 text-amber-400">
                Category 2 Button Name
              </label>
              <input
                type="text"
                value={draftConfig.rightCategoryLabel}
                onChange={(e) =>
                  setDraftConfig((prev) => ({ ...prev, rightCategoryLabel: e.target.value }))
                }
                placeholder="Non-Renewable Energy"
                className="w-full px-3 py-2 rounded-lg text-xs font-medium outline-none"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border-hairline)',
                }}
              />
            </div>
          </div>

          {/* Add New Sorting Question */}
          <div
            className="p-4 rounded-2xl flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-end"
            style={{
              backgroundColor: 'var(--bg-canvas)',
              border: '1px solid var(--border-hairline)',
            }}
          >
            <div className="flex-1">
              <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>
                Add New Question / Card Item
              </label>
              <input
                type="text"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddDraftItem();
                  }
                }}
                placeholder="e.g., Hydroelectric Dam or Copper Wire"
                className="w-full px-3 py-2 rounded-lg text-xs outline-none"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border-hairline)',
                }}
              />
            </div>
            <div className="sm:w-48">
              <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>
                Correct Category
              </label>
              <select
                value={newItemCat}
                onChange={(e) =>
                  setNewItemCat(e.target.value === 'nonrenewable' ? 'nonrenewable' : 'renewable')
                }
                className="w-full px-3 py-2 rounded-lg text-xs outline-none"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border-hairline)',
                }}
              >
                <option value="renewable">
                  {draftConfig.leftCategoryLabel || 'Category 1'}
                </option>
                <option value="nonrenewable">
                  {draftConfig.rightCategoryLabel || 'Category 2'}
                </option>
              </select>
            </div>
            <button
              type="button"
              onClick={handleAddDraftItem}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold shrink-0"
              style={{
                backgroundColor: 'var(--accent-primary)',
                color: 'var(--accent-on-primary)',
              }}
            >
              <Plus className="w-3.5 h-3.5" />
              Add Item
            </button>
          </div>

          {editorError && (
            <p className="text-xs font-semibold text-red-400">{editorError}</p>
          )}

          {/* Existing Items List */}
          <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
            {draftConfig.items.map((item, idx) => (
              <div
                key={item.id}
                className="p-2.5 rounded-xl flex flex-col sm:flex-row sm:items-center gap-2"
                style={{
                  backgroundColor: 'var(--bg-canvas)',
                  border: '1px solid var(--border-hairline)',
                }}
              >
                <span
                  className="font-mono text-[11px] w-6 shrink-0 text-center"
                  style={{ color: 'var(--text-muted)' }}
                >
                  #{idx + 1}
                </span>
                <input
                  type="text"
                  value={item.name}
                  onChange={(e) => handleUpdateDraftItem(item.id, { name: e.target.value })}
                  className="flex-1 px-3 py-1.5 rounded-lg text-xs font-medium outline-none"
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    border: '1px solid var(--border-hairline)',
                  }}
                />
                <div className="flex items-center gap-2 shrink-0">
                  <select
                    value={item.category}
                    onChange={(e) =>
                      handleUpdateDraftItem(item.id, {
                        category:
                          e.target.value === 'nonrenewable' ? 'nonrenewable' : 'renewable',
                      })
                    }
                    className="px-2.5 py-1.5 rounded-lg text-xs outline-none"
                    style={{
                      backgroundColor: 'var(--bg-surface)',
                      border: '1px solid var(--border-hairline)',
                    }}
                  >
                    <option value="renewable">
                      {draftConfig.leftCategoryLabel || 'Category 1'}
                    </option>
                    <option value="nonrenewable">
                      {draftConfig.rightCategoryLabel || 'Category 2'}
                    </option>
                  </select>
                  <button
                    type="button"
                    onClick={() => handleRemoveDraftItem(item.id)}
                    aria-label={`Remove ${item.name}`}
                    className="p-1.5 rounded-lg text-red-400 hover:opacity-80"
                    style={{ backgroundColor: 'var(--bg-surface)' }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t" style={{ borderColor: 'var(--border-hairline)' }}>
            <button
              type="button"
              onClick={handleRestoreDefaults}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold"
              style={{
                backgroundColor: 'var(--bg-canvas)',
                border: '1px solid var(--border-hairline)',
                color: 'var(--text-secondary)',
              }}
            >
              Restore Default Energy Deck
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold"
                style={{ backgroundColor: 'var(--bg-elevated)' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEditor}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold"
                style={{
                  backgroundColor: 'var(--accent-primary)',
                  color: 'var(--accent-on-primary)',
                }}
              >
                <Check className="w-3.5 h-3.5" />
                Save & Play ({draftConfig.items.length})
              </button>
            </div>
          </div>
        </div>
      ) : done ? (
        <div className="text-center py-10 space-y-3">
          <Trophy className="w-10 h-10 mx-auto text-emerald-400" />
          <h4 className="font-display text-2xl font-bold">
            Sorted {score} / {deck.length} Correctly!
          </h4>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Earned +{score >= passThreshold ? 130 : 50} XP
          </p>
          <button
            type="button"
            onClick={() => reset()}
            className="mt-2 px-5 py-2.5 rounded-xl text-xs font-bold"
            style={{
              backgroundColor: 'var(--accent-primary)',
              color: 'var(--accent-on-primary)',
            }}
          >
            Play Again
          </button>
        </div>
      ) : (
        <div className="space-y-6 py-4">
          <div
            className="p-8 rounded-2xl text-center"
            style={{
              backgroundColor: 'var(--bg-canvas)',
              border: '1px solid var(--border-hairline)',
            }}
          >
            <p className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              {config.promptLabel}
            </p>
            <p className="font-display text-2xl font-bold mt-2">{deck[index]?.name}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => handleSort('renewable')}
              className="py-5 px-4 rounded-2xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-500 transition-colors"
            >
              {config.leftCategoryLabel}
            </button>
            <button
              type="button"
              onClick={() => handleSort('nonrenewable')}
              className="py-5 px-4 rounded-2xl text-sm font-bold text-white bg-amber-600 hover:bg-amber-500 transition-colors"
            >
              {config.rightCategoryLabel}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================================
   4. Cipher Term Decryption
   ============================================================================ */
function scrambleWord(word: string): string {
  const chars = word.split('');
  const scrambled = shuffleArray(chars).join('');
  return scrambled === word ? chars.reverse().join('') : scrambled;
}

function CipherGame({ onFinish }: { onFinish: (xp: number, won: boolean) => void }) {
  const [deck, setDeck] = useState(() => shuffleArray(CIPHER_WORDS));
  const [idx, setIdx] = useState(0);
  const [guess, setGuess] = useState('');
  const [showHint, setShowHint] = useState(false);
  const [solved, setSolved] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [done, setDone] = useState(false);
  const [wrongMsg, setWrongMsg] = useState('');
  const [scrambled, setScrambled] = useState(() => scrambleWord(deck[0].word));

  useEffect(() => {
    if (done) return;
    const t = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setDone(true);
          onFinish(solved >= 3 ? 120 : 40, solved >= 3);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [done, solved, onFinish]);

  const advanceTerm = (currentSolved: number) => {
    setGuess('');
    setShowHint(false);
    setWrongMsg('');
    if (idx + 1 >= deck.length) {
      setDone(true);
      onFinish(currentSolved >= 3 ? 120 : 40, currentSolved >= 3);
    } else {
      const nextIdx = idx + 1;
      setIdx(nextIdx);
      setScrambled(scrambleWord(deck[nextIdx].word));
    }
  };

  const checkGuess = () => {
    const target = deck[idx];
    if (guess.trim().toUpperCase() === target.word) {
      soundEngine.playCorrect();
      const nextSolved = solved + 1;
      setSolved(nextSolved);
      advanceTerm(nextSolved);
    } else {
      soundEngine.playWrong();
      setWrongMsg('Not quite—check the letters or tap Hint.');
    }
  };

  const reset = () => {
    const fresh = shuffleArray(CIPHER_WORDS);
    setDeck(fresh);
    setIdx(0);
    setGuess('');
    setShowHint(false);
    setWrongMsg('');
    setSolved(0);
    setTimeLeft(60);
    setDone(false);
    setScrambled(scrambleWord(fresh[0].word));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display text-xl font-bold">Cipher Term Decryption</h3>
          <p className="text-xs tabular-nums" style={{ color: 'var(--text-muted)' }}>
            Question {Math.min(idx + 1, deck.length)} of {deck.length} · Decrypted: {solved} · Time Left: {timeLeft}s
          </p>
        </div>
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
          style={{ backgroundColor: 'var(--bg-elevated)' }}
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Restart
        </button>
      </div>

      {done ? (
        <div className="text-center py-10 space-y-3">
          <Trophy className="w-10 h-10 mx-auto text-amber-400" />
          <h4 className="font-display text-2xl font-bold">Decrypted {solved} STEM Terms!</h4>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Earned +{solved >= 3 ? 120 : 40} XP
          </p>
          <button
            type="button"
            onClick={reset}
            className="mt-2 px-5 py-2.5 rounded-xl text-xs font-bold"
            style={{ backgroundColor: 'var(--accent-primary)', color: 'var(--accent-on-primary)' }}
          >
            Play Again
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div
            className="p-7 rounded-2xl text-center"
            style={{
              backgroundColor: 'var(--bg-canvas)',
              border: '1px solid var(--border-hairline)',
            }}
          >
            <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
              Unscramble the Encrypted STEM Term ({deck[idx].word.length} letters)
            </p>
            <p className="font-mono text-2xl sm:text-4xl font-bold tracking-[0.22em]">
              {scrambled}
            </p>
            {showHint && (
              <p className="text-xs mt-3" style={{ color: 'var(--accent-primary)' }}>
                Hint: {deck[idx].hint}
              </p>
            )}
            {wrongMsg && (
              <p className="text-xs mt-2 text-red-400 font-medium">{wrongMsg}</p>
            )}
          </div>

          <div className="flex flex-wrap gap-2.5">
            <input
              type="text"
              value={guess}
              onChange={(e) => {
                setGuess(e.target.value);
                if (wrongMsg) setWrongMsg('');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') checkGuess();
              }}
              placeholder="Type decoded word..."
              className="flex-1 min-w-[180px] px-4 py-2.5 rounded-xl text-sm font-mono uppercase"
              style={{
                backgroundColor: 'var(--bg-canvas)',
                border: '1px solid var(--border-hairline)',
              }}
            />
            <button
              type="button"
              onClick={() => setShowHint(true)}
              className="px-3.5 py-2.5 rounded-xl text-xs font-semibold"
              style={{ backgroundColor: 'var(--bg-elevated)' }}
            >
              Hint
            </button>
            <button
              type="button"
              onClick={() => advanceTerm(solved)}
              className="px-3.5 py-2.5 rounded-xl text-xs font-semibold"
              style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
            >
              Skip
            </button>
            <button
              type="button"
              onClick={checkGuess}
              className="px-5 py-2.5 rounded-xl text-sm font-bold"
              style={{ backgroundColor: 'var(--accent-primary)', color: 'var(--accent-on-primary)' }}
            >
              Decrypt
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================================
   5. Rapid Question Rush (60s Survival Trivia)
   ============================================================================ */
function RapidRushGame({ onFinish }: { onFinish: (xp: number, won: boolean) => void }) {
  const [qIdx, setQIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (done) return;
    const t = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setDone(true);
          onFinish(score >= 300 ? 180 : 75, score >= 300);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [done, score, onFinish]);

  const multiplier = streak >= 4 ? 3 : streak >= 2 ? 2 : 1;
  const current = RAPID_RUSH_QUESTIONS[qIdx % RAPID_RUSH_QUESTIONS.length];

  const handlePick = (optIdx: number) => {
    if (done) return;
    if (optIdx === current.ans) {
      soundEngine.playCorrect();
      setScore((s) => s + 100 * multiplier);
      setStreak((st) => st + 1);
    } else {
      soundEngine.playWrong();
      setStreak(0);
    }
    setQIdx((i) => i + 1);
  };

  const reset = () => {
    setQIdx(0);
    setScore(0);
    setStreak(0);
    setTimeLeft(60);
    setDone(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display text-xl font-bold">Rapid Question Rush</h3>
          <p className="text-xs tabular-nums" style={{ color: 'var(--text-muted)' }}>
            Score: {score} · Multiplier: {multiplier}x · Time: {timeLeft}s
          </p>
        </div>
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
          style={{ backgroundColor: 'var(--bg-elevated)' }}
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Restart
        </button>
      </div>

      {done ? (
        <div className="text-center py-10 space-y-3">
          <Trophy className="w-10 h-10 mx-auto text-amber-400" />
          <h4 className="font-display text-2xl font-bold">60-Second Sprint Complete: {score} pts</h4>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Earned +{score >= 300 ? 180 : 75} XP
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="font-display text-xl font-bold">{current.q}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {current.options.map((opt, i) => (
              <button
                key={opt + i}
                type="button"
                onClick={() => handlePick(i)}
                className="p-4 rounded-xl text-left text-sm font-semibold transition-colors hover:opacity-90"
                style={{
                  backgroundColor: 'var(--bg-canvas)',
                  border: '1px solid var(--border-hairline)',
                }}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
