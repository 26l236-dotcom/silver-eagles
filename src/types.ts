export type UserRole = 'teacher' | 'student' | 'evaluator';

export type PaletteId = 'cyber' | 'mocha' | 'forest';

export type ThemeMode = 'dark' | 'light';

export type ModuleId =
  | 'home'
  | 'teacher'
  | 'teachmate'
  | 'quizbuzz'
  | 'student'
  | 'smartboard'
  | 'lab3d'
  | 'mediastudio'
  | 'analytics'
  | 'arduino'
  | 'sdg4';

export type GeminiChatModelId =
  | 'gemini-4-hydrogen'
  | 'gemini-3.1-flash-lite'
  | 'gemini-4-argon'
  | 'gemini-4-carbon';

export type GroundingMode = 'standard' | 'search' | 'maps';

export interface GroundingSource {
  title: string;
  uri: string;
  snippet?: string;
  kind: 'web' | 'maps';
}

export interface AuthUser {
  role: UserRole;
  name: string;
  avatar: string;
  institution: string;
  email?: string;
  roomPin?: string;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: [string, string, string, string];
  correctIndex: number;
  timeLimit: number;
  explanation: string;
  topic: string;
  mandatory?: boolean;
}

export type SquadColor = 'red' | 'blue' | 'green' | 'yellow';

export interface QuizPlayer {
  id: string;
  name: string;
  avatar: string;
  squad: SquadColor;
  score: number;
  streak: number;
  lastCorrect: boolean | null;
  lastAnswerIndex: number | null;
  lastResponseMs: number | null;
}

export type QuizRoomStatus = 'lobby' | 'question' | 'reveal' | 'podium';

export interface QuizRoomState {
  pin: string;
  topic: string;
  status: QuizRoomStatus;
  currentQuestionIndex: number;
  totalQuestions: number;
  questionStartedAt: number | null;
  timeRemaining: number;
  question: QuizQuestion | null;
  questions: QuizQuestion[];
  players: QuizPlayer[];
  answerCounts: [number, number, number, number];
  squadScores: Record<SquadColor, number>;
}

export interface FunLessonPlan {
  title: string;
  topic: string;
  style: string;
  aiAnswer?: string;
  hook: string;
  learningObjective: string;
  materials: string[];
  timeline: Array<{
    phase: string;
    minutes: number;
    activity: string;
  }>;
  squadRoles: Array<{
    role: string;
    task: string;
  }>;
  assessmentPlan: string;
  bonusIdeas: string[];
  sampleQuizQuestions: QuizQuestion[];
}

export interface TeachMateTool {
  id: string;
  title: string;
  subtitle: string;
  placeholder: string;
  suggestedPrompts: string[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
  modelUsed?: GeminiChatModelId;
  groundingMode?: GroundingMode;
  sources?: GroundingSource[];
}

export interface ChatSession {
  id: string;
  toolId: string;
  toolTitle: string;
  title: string;
  updatedAt: number;
  messages: ChatMessage[];
}

export interface StudentProgress {
  xp: number;
  streakDays: number;
  gamesPlayed: number;
  wins: number;
  badges: string[];
}

export interface AnalyticsSnapshot {
  weeklyParticipation: Array<{ day: string; attendance: number; quizActive: number }>;
  topicMastery: Array<{ subject: string; mastery: number; sessions: number }>;
  studentRoster: Array<{
    id: string;
    name: string;
    squad: SquadColor;
    accuracy: number;
    avgResponseSec: number;
    xp: number;
    sessionsCompleted: number;
  }>;
}
