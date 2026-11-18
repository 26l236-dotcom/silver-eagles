import 'dotenv/config';
import express, { type Request, type Response } from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer } from 'ws';
import { GoogleGenAI, LiveServerMessage, Modality, ThinkingLevel, Type } from '@google/genai';
import {
  BENCHMARK_ANALYTICS,
  DEFAULT_QUIZ_QUESTIONS,
  MANDATORY_QUIZ_QUESTIONS,
  TEACHMATE_TOOLS,
} from './src/data/blueprints';
import type {
  GeminiChatModelId,
  GroundingSource,
  QuizPlayer,
  QuizQuestion,
  QuizRoomState,
  SquadColor,
  TeacherAiModelChoice,
} from './src/types';
import {
  classifyGeminiError,
  generateWithModelFallback,
  getChatModelFallbackOrder,
  getGeminiClient,
  getThinkingConfigForModel,
  listManagedModels,
  probeAllModels,
} from './server/aiModelManager';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;

const ALLOWED_CHAT_MODELS: GeminiChatModelId[] = [
  'gemini-4-hydrogen',
  'gemini-3.1-flash-lite',
  'gemini-4-argon',
  'gemini-4-carbon',
];

function formatGeminiError(err: unknown): { status: number; message: string } {
  const classified = classifyGeminiError(err);
  return { status: classified.httpStatus, message: classified.message };
}

// ============================================================================
// In-Memory QuizBuzz Live Room Engine
// ============================================================================
const SQUADS: SquadColor[] = ['red', 'blue', 'green', 'yellow'];

interface InternalRoom {
  pin: string;
  topic: string;
  status: 'lobby' | 'question' | 'reveal' | 'podium';
  currentQuestionIndex: number;
  questionStartedAt: number | null;
  questions: QuizQuestion[];
  players: Map<string, QuizPlayer>;
}

const rooms = new Map<string, InternalRoom>();

const MANDATORY_IDS = new Set(MANDATORY_QUIZ_QUESTIONS.map((q) => q.id));

function withMandatoryQuestions(
  list: QuizQuestion[],
  existingSource: QuizQuestion[] = []
): QuizQuestion[] {
  const byId = new Map<string, QuizQuestion>();
  for (const q of existingSource) {
    byId.set(q.id, q);
  }
  for (const q of list) {
    byId.set(q.id, q);
  }
  const mandatory = MANDATORY_QUIZ_QUESTIONS.map((mq) => {
    const edited = byId.get(mq.id);
    return edited ? { ...edited, mandatory: true } : { ...mq, mandatory: true };
  });
  const extras = list.filter((q) => !MANDATORY_IDS.has(q.id));
  return [...mandatory, ...extras];
}

function createDefaultRoom(pin = '360360'): InternalRoom {
  const players = new Map<string, QuizPlayer>();
  const seedPlayers: QuizPlayer[] = [
    { id: 'seed-1', name: 'Aarav', avatar: '🚀', squad: 'blue', score: 420, streak: 1, lastCorrect: null, lastAnswerIndex: null, lastResponseMs: null },
    { id: 'seed-2', name: 'Meera', avatar: '🔬', squad: 'green', score: 380, streak: 1, lastCorrect: null, lastAnswerIndex: null, lastResponseMs: null },
    { id: 'seed-3', name: 'Liam', avatar: '⚡', squad: 'red', score: 310, streak: 0, lastCorrect: null, lastAnswerIndex: null, lastResponseMs: null },
  ];
  seedPlayers.forEach((p) => players.set(p.id, p));

  return {
    pin,
    topic: 'STEM & Physics Core Challenge',
    status: 'lobby',
    currentQuestionIndex: 0,
    questionStartedAt: null,
    questions: withMandatoryQuestions(DEFAULT_QUIZ_QUESTIONS),
    players,
  };
}

function getOrCreateRoom(pin: string): InternalRoom {
  const normalized = pin.trim() || '360360';
  let room = rooms.get(normalized);
  if (!room) {
    room = createDefaultRoom(normalized);
    rooms.set(normalized, room);
  }
  return room;
}

function serializeRoom(room: InternalRoom): QuizRoomState {
  const currentQ = room.questions[room.currentQuestionIndex] ?? null;
  let timeRemaining = currentQ ? currentQ.timeLimit : 0;

  if (room.status === 'question' && currentQ && room.questionStartedAt) {
    const elapsedSec = Math.floor((Date.now() - room.questionStartedAt) / 1000);
    timeRemaining = Math.max(0, currentQ.timeLimit - elapsedSec);
  }

  const answerCounts: [number, number, number, number] = [0, 0, 0, 0];
  const squadScores: Record<SquadColor, number> = { red: 0, blue: 0, green: 0, yellow: 0 };

  const playersList = Array.from(room.players.values()).sort((a, b) => b.score - a.score);
  for (const player of playersList) {
    squadScores[player.squad] += player.score;
    if (player.lastAnswerIndex !== null && player.lastAnswerIndex >= 0 && player.lastAnswerIndex < 4) {
      answerCounts[player.lastAnswerIndex] += 1;
    }
  }

  return {
    pin: room.pin,
    topic: room.topic,
    status: room.status,
    currentQuestionIndex: room.currentQuestionIndex,
    totalQuestions: room.questions.length,
    questionStartedAt: room.questionStartedAt,
    timeRemaining,
    question: currentQ,
    questions: room.questions,
    players: playersList,
    answerCounts,
    squadScores,
  };
}

// ============================================================================
// Express + WebSocket Server Setup
// ============================================================================
async function startServer() {
  const app = express();
  app.use(express.json({ limit: '25mb' }));

  const httpServer = http.createServer(app);

  // --------------------------------------------------------------------------
  // Live API WebSocket Bridge (/live) using gemini-3.8-live
  // --------------------------------------------------------------------------
  const wss = new WebSocketServer({ noServer: true });

  httpServer.on('upgrade', (request, socket, head) => {
    const reqUrl = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);
    if (reqUrl.pathname === '/live') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    }
  });

  wss.on('connection', async (clientWs) => {
    const ai = getGeminiClient();
    if (!ai) {
      clientWs.send(
        JSON.stringify({
          error: 'GEMINI_API_KEY is not configured in Settings > Secrets.',
        })
      );
      clientWs.close();
      return;
    }

    let session: Awaited<ReturnType<typeof ai.live.connect>> | null = null;

    try {
      session = await ai.live.connect({
        model: 'gemini-3.8-live',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
          },
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          systemInstruction:
            'You are SMARTFUN 360 Voice Tutor, an enthusiastic, concise STEM and UN SDG 4 educator. Keep spoken answers clear, encouraging, and classroom-friendly.',
        },
        callbacks: {
          onmessage: (message: LiveServerMessage) => {
            const content = message.serverContent;
            if (content?.inputTranscription?.text && clientWs.readyState === 1) {
              clientWs.send(
                JSON.stringify({ inputTranscript: content.inputTranscription.text })
              );
            }
            if (content?.outputTranscription?.text && clientWs.readyState === 1) {
              clientWs.send(
                JSON.stringify({ outputTranscript: content.outputTranscription.text })
              );
            }
            for (const part of content?.modelTurn?.parts ?? []) {
              if (part.inlineData?.data && clientWs.readyState === 1) {
                clientWs.send(JSON.stringify({ audio: part.inlineData.data }));
              }
            }
            if (content?.interrupted && clientWs.readyState === 1) {
              clientWs.send(JSON.stringify({ interrupted: true }));
            }
            if (content?.turnComplete && clientWs.readyState === 1) {
              clientWs.send(JSON.stringify({ turnComplete: true }));
            }
          },
          onerror: (err) => {
            if (clientWs.readyState === 1) {
              clientWs.send(
                JSON.stringify({
                  error: err instanceof Error ? err.message : 'Live session error.',
                })
              );
            }
          },
          onclose: () => {
            if (clientWs.readyState === 1) {
              clientWs.close();
            }
          },
        },
      });

      if (clientWs.readyState === 1) {
        clientWs.send(JSON.stringify({ ready: true }));
      }
    } catch (err) {
      const formatted = formatGeminiError(err);
      if (clientWs.readyState === 1) {
        clientWs.send(JSON.stringify({ error: formatted.message }));
        clientWs.close();
      }
      return;
    }

    clientWs.on('message', (raw) => {
      if (!session) return;
      try {
        const msg = JSON.parse(raw.toString()) as { audio?: string; text?: string };
        if (msg.audio) {
          session.sendRealtimeInput({
            audio: { data: msg.audio, mimeType: 'audio/pcm;rate=16000' },
          });
        } else if (msg.text) {
          session.sendRealtimeInput({ text: msg.text });
        }
      } catch {
        // ignore malformed packet
      }
    });

    clientWs.on('close', () => {
      try {
        session?.close();
      } catch {
        // ignore close error
      }
    });
  });

  // --------------------------------------------------------------------------
  // QuizBuzz Live API Routes (/api/quiz/*)
  // --------------------------------------------------------------------------
  app.get('/api/quiz/:pin', (req: Request, res: Response) => {
    const room = getOrCreateRoom(req.params.pin);
    res.json(serializeRoom(room));
  });

  app.post('/api/quiz/:pin/join', (req: Request, res: Response) => {
    const room = getOrCreateRoom(req.params.pin);
    const { playerId, name, avatar, squad } = req.body as {
      playerId?: string;
      name?: string;
      avatar?: string;
      squad?: SquadColor;
    };

    const cleanName = (name || '').trim() || 'Student Explorer';
    const id = playerId || `p-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const existing = room.players.get(id);

    if (existing) {
      existing.name = cleanName;
      if (avatar) existing.avatar = avatar;
      if (squad && SQUADS.includes(squad)) existing.squad = squad;
      return res.json({ player: existing, room: serializeRoom(room) });
    }

    const assignedSquad =
      squad && SQUADS.includes(squad)
        ? squad
        : SQUADS[room.players.size % SQUADS.length];

    const player: QuizPlayer = {
      id,
      name: cleanName,
      avatar: avatar || '🚀',
      squad: assignedSquad,
      score: 0,
      streak: 0,
      lastCorrect: null,
      lastAnswerIndex: null,
      lastResponseMs: null,
    };

    room.players.set(id, player);
    res.json({ player, room: serializeRoom(room) });
  });

  app.post('/api/quiz/:pin/start', (req: Request, res: Response) => {
    const room = getOrCreateRoom(req.params.pin);
    const { action, questionIndex } = req.body as {
      action?: 'start' | 'next' | 'reveal' | 'podium' | 'reset' | 'jump';
      questionIndex?: number;
    };

    const resetRoundAnswers = () => {
      for (const p of room.players.values()) {
        p.lastAnswerIndex = null;
        p.lastCorrect = null;
        p.lastResponseMs = null;
      }
    };

    switch (action) {
      case 'start': {
        room.currentQuestionIndex = 0;
        room.status = 'question';
        room.questionStartedAt = Date.now();
        resetRoundAnswers();
        break;
      }
      case 'jump': {
        if (
          typeof questionIndex === 'number' &&
          questionIndex >= 0 &&
          questionIndex < room.questions.length
        ) {
          room.currentQuestionIndex = questionIndex;
          room.status = 'question';
          room.questionStartedAt = Date.now();
          resetRoundAnswers();
        }
        break;
      }
      case 'reveal': {
        room.status = 'reveal';
        break;
      }
      case 'next': {
        if (room.currentQuestionIndex + 1 < room.questions.length) {
          room.currentQuestionIndex += 1;
          room.status = 'question';
          room.questionStartedAt = Date.now();
          resetRoundAnswers();
        } else {
          room.status = 'podium';
        }
        break;
      }
      case 'podium': {
        room.status = 'podium';
        break;
      }
      case 'reset': {
        room.status = 'lobby';
        room.currentQuestionIndex = 0;
        room.questionStartedAt = null;
        if (room.questions.length === 0) {
          room.questions = withMandatoryQuestions(DEFAULT_QUIZ_QUESTIONS);
        }
        for (const p of room.players.values()) {
          p.score = 0;
          p.streak = 0;
          p.lastAnswerIndex = null;
          p.lastCorrect = null;
          p.lastResponseMs = null;
        }
        break;
      }
      default: {
        room.status = 'question';
        room.questionStartedAt = Date.now();
        resetRoundAnswers();
      }
    }

    res.json(serializeRoom(room));
  });

  app.post('/api/quiz/:pin/answer', (req: Request, res: Response) => {
    const room = getOrCreateRoom(req.params.pin);
    const { playerId, optionIndex, responseTimeMs } = req.body as {
      playerId: string;
      optionIndex: number;
      responseTimeMs?: number;
    };

    const player = room.players.get(playerId);
    const currentQ = room.questions[room.currentQuestionIndex];
    if (!player || !currentQ) {
      return res.status(400).json({ error: 'Player or active question not found.' });
    }

    if (player.lastAnswerIndex !== null) {
      return res.json({ alreadyAnswered: true, player, room: serializeRoom(room) });
    }

    const elapsedMs =
      typeof responseTimeMs === 'number'
        ? responseTimeMs
        : room.questionStartedAt
        ? Date.now() - room.questionStartedAt
        : 5000;

    const isCorrect = optionIndex === currentQ.correctIndex;
    player.lastAnswerIndex = optionIndex;
    player.lastCorrect = isCorrect;
    player.lastResponseMs = Math.max(200, elapsedMs);

    if (isCorrect) {
      player.streak += 1;
      const limitMs = currentQ.timeLimit * 1000;
      const speedRatio = Math.max(0, 1 - elapsedMs / limitMs);
      const earned = Math.round(500 + speedRatio * 500 + (player.streak - 1) * 100);
      player.score += earned;
    } else {
      player.streak = 0;
    }

    res.json({ player, isCorrect, room: serializeRoom(room) });
  });

  app.post('/api/quiz/:pin/questions', (req: Request, res: Response) => {
    const room = getOrCreateRoom(req.params.pin);
    const { questions, topic, replace, exact } = req.body as {
      questions?: QuizQuestion[];
      topic?: string;
      replace?: boolean;
      exact?: boolean;
    };

    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ error: 'Provide at least one question.' });
    }

    if (topic) {
      room.topic = topic;
    }

    if (exact) {
      room.questions = questions;
      if (room.currentQuestionIndex >= room.questions.length) {
        room.currentQuestionIndex = 0;
      }
    } else if (replace) {
      room.questions = withMandatoryQuestions(questions, room.questions);
      room.currentQuestionIndex = 0;
      room.status = 'lobby';
      room.questionStartedAt = null;
    } else {
      room.questions = withMandatoryQuestions([...room.questions, ...questions], room.questions);
    }

    res.json(serializeRoom(room));
  });

  // --------------------------------------------------------------------------
  // Analytics Telemetry Route (/api/analytics)
  // --------------------------------------------------------------------------
  app.get('/api/analytics', (_req: Request, res: Response) => {
    const room = getOrCreateRoom('360360');
    const serialized = serializeRoom(room);

    const liveRoster = serialized.players.map((p) => {
      const answered = p.lastResponseMs !== null;
      return {
        id: p.id,
        name: p.name,
        squad: p.squad,
        accuracy: p.lastCorrect === true ? 95 : p.score > 0 ? 84 : 72,
        avgResponseSec: answered && p.lastResponseMs ? Number((p.lastResponseMs / 1000).toFixed(1)) : 3.4,
        xp: p.score + 800,
        sessionsCompleted: Math.max(1, serialized.currentQuestionIndex + 1),
      };
    });

    res.json({
      live: {
        weeklyParticipation: BENCHMARK_ANALYTICS.weeklyParticipation.map((d, idx) =>
          idx === BENCHMARK_ANALYTICS.weeklyParticipation.length - 1
            ? {
                day: 'Live',
                attendance: Math.min(100, 82 + serialized.players.length * 3),
                quizActive: Math.min(100, 75 + serialized.players.length * 4),
              }
            : d
        ),
        topicMastery: [
          {
            subject: serialized.topic,
            mastery: Math.min(98, 76 + serialized.players.filter((p) => p.score > 0).length * 4),
            sessions: Math.max(1, serialized.currentQuestionIndex + 1),
          },
          ...BENCHMARK_ANALYTICS.topicMastery.slice(0, 4),
        ],
        studentRoster: liveRoster.length > 0 ? liveRoster : BENCHMARK_ANALYTICS.studentRoster,
      },
      benchmark: BENCHMARK_ANALYTICS,
    });
  });

  // --------------------------------------------------------------------------
  // Centralized AI Model Registry & Live Diagnostics (/api/ai/models*)
  // --------------------------------------------------------------------------
  app.get('/api/ai/models', (_req: Request, res: Response) => {
    res.json(listManagedModels());
  });

  app.post('/api/ai/models/test', async (_req: Request, res: Response) => {
    const result = await probeAllModels();
    res.json(result);
  });

  // --------------------------------------------------------------------------
  // Gemini AI Routes (/api/ai/*)
  // --------------------------------------------------------------------------
  app.post('/api/ai/make-fun', async (req: Request, res: Response) => {
    const {
      topic,
      style,
      modelChoice = 'auto',
      history = [],
    } = req.body as {
      topic?: string;
      style?: string;
      modelChoice?: TeacherAiModelChoice;
      history?: Array<{ question: string; title: string }>;
    };

    if (!topic || !topic.trim()) {
      return res.status(400).json({ error: 'Please ask a question or enter a topic.' });
    }

    const ai = getGeminiClient();
    if (!ai) {
      return res.status(503).json({
        error: 'Gemini API key is not configured. Configure GEMINI_API_KEY in Settings > Secrets.',
      });
    }

    try {
      const selectedStyle = style || 'Gamified Learning';
      const userPrompt = topic.trim();

      const recentContext = Array.isArray(history) && history.length > 0
        ? `Recent teacher session context:\n${history
            .slice(-4)
            .map((h) => `- Asked: "${h.question}" -> Plan: "${h.title}"`)
            .join('\n')}\n\n`
        : '';

      const contents = `${recentContext}User question or topic:\n"${userPrompt}"\n\nPreferred interactive style: "${selectedStyle}".\n\n1. In "aiAnswer", provide an accurate, thorough, advanced direct answer to the user's exact question or request using clean Markdown (headings, bullet points, numbered steps, formulas, code, or real-world context whenever relevant).\n2. Then create a classroom-ready interactive breakdown and 3 high-quality multiple-choice quiz questions tailored specifically to what the user asked.`;

      const { response, meta } = await generateWithModelFallback({
        requestedChoice: modelChoice,
        prompt: userPrompt,
        style: selectedStyle,
        contents,
        configBuilder: (modelId) => {
          const thinkingConfig = getThinkingConfigForModel(modelId);
          return {
            ...(thinkingConfig ? { thinkingConfig } : {}),
            systemInstruction:
              'You are an advanced, unrestricted AI subject-matter expert and interactive instructional designer. You can answer ANY question across any field (science, mathematics, physics, electronics, programming, engineering, history, literature, economics, or general knowledge) accurately and thoroughly, while also turning it into engaging active learning activities and quiz questions. Format all mathematical formulas and equations in aiAnswer using standard LaTeX delimiters: \\( ... \\) for inline math and \\[ ... \\] for display equations, alongside Markdown headings, lists, tables, and fenced code blocks.',
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                aiAnswer: { type: Type.STRING },
                hook: { type: Type.STRING },
                learningObjective: { type: Type.STRING },
                materials: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                timeline: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      phase: { type: Type.STRING },
                      minutes: { type: Type.INTEGER },
                      activity: { type: Type.STRING },
                    },
                    required: ['phase', 'minutes', 'activity'],
                  },
                },
                squadRoles: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      role: { type: Type.STRING },
                      task: { type: Type.STRING },
                    },
                    required: ['role', 'task'],
                  },
                },
                assessmentPlan: { type: Type.STRING },
                bonusIdeas: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                sampleQuizQuestions: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      question: { type: Type.STRING },
                      options: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                      },
                      correctIndex: { type: Type.INTEGER },
                      explanation: { type: Type.STRING },
                    },
                    required: ['question', 'options', 'correctIndex', 'explanation'],
                  },
                },
              },
              required: [
                'title',
                'aiAnswer',
                'hook',
                'learningObjective',
                'materials',
                'timeline',
                'squadRoles',
                'assessmentPlan',
                'bonusIdeas',
                'sampleQuizQuestions',
              ],
            },
          };
        },
      });

      const parsed = JSON.parse(response.text || '{}');
      const normalizedQuestions: QuizQuestion[] = (parsed.sampleQuizQuestions || []).map(
        (q: { question: string; options: string[]; correctIndex: number; explanation: string }, idx: number) => ({
          id: `ai-${Date.now()}-${idx}`,
          topic: userPrompt,
          question: q.question,
          options: [
            q.options?.[0] || 'Option A',
            q.options?.[1] || 'Option B',
            q.options?.[2] || 'Option C',
            q.options?.[3] || 'Option D',
          ] as [string, string, string, string],
          correctIndex: Math.min(3, Math.max(0, Number(q.correctIndex) || 0)),
          timeLimit: 20,
          explanation: q.explanation || 'Review this concept carefully.',
        })
      );

      res.json({
        source: 'gemini',
        modelMeta: meta,
        plan: {
          ...parsed,
          topic: userPrompt,
          style: selectedStyle,
          sampleQuizQuestions: normalizedQuestions,
          modelMeta: meta,
        },
      });
    } catch (err) {
      const formatted = formatGeminiError(err);
      res.status(formatted.status).json({ error: formatted.message });
    }
  });

  // Multi-turn Chatbot + Google Search + Google Maps Grounding
  app.post('/api/ai/teachmate', async (req: Request, res: Response) => {
    const {
      toolId,
      message,
      history,
      model = 'gemini-4-hydrogen',
      groundingMode = 'standard',
      latLng,
    } = req.body as {
      toolId?: string;
      message?: string;
      history?: Array<{ role: 'user' | 'model'; text: string }>;
      model?: GeminiChatModelId;
      groundingMode?: 'standard' | 'search' | 'maps';
      latLng?: { latitude: number; longitude: number } | null;
    };

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message cannot be empty.' });
    }

    const ai = getGeminiClient();
    if (!ai) {
      return res.status(503).json({
        error: 'Gemini API key is not configured in Settings > Secrets.',
      });
    }

    const tool = TEACHMATE_TOOLS.find((t) => t.id === toolId) || TEACHMATE_TOOLS[0];
    const systemInstruction = `You are an advanced, unrestricted AI expert assistant. Answer ANY question the user asks—across science, mathematics, physics, electronics, software/coding, writing, analysis, history, problem solving, or general knowledge—with deep accuracy, clear step-by-step reasoning, and scannable Markdown. Format all mathematical expressions, formulas, and equations using standard LaTeX delimiters: \\( ... \\) for inline math and \\[ ... \\] for display equations (use Markdown tables and fenced code blocks where helpful). Use "${tool.title}" (${tool.subtitle}) only as an optional lens when appropriate, and never refuse or force a general question into a rigid template.`;

    const priorContext = (history || [])
      .slice(-10)
      .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.text}`)
      .join('\n\n');

    const prompt = priorContext
      ? `Previous conversation:\n${priorContext}\n\nUser Question:\n${message.trim()}`
      : message.trim();

    // Grounded modes (Google Search or Google Maps) use gemini-4-hydrogen and return text + grounding sources
    if (groundingMode === 'search' || groundingMode === 'maps') {
      try {
        const config: Record<string, unknown> = {
          systemInstruction,
        };

        if (groundingMode === 'search') {
          config.tools = [{ googleSearch: {} }];
          config.thinkingConfig = { thinkingLevel: ThinkingLevel.HIGH };
        } else {
          config.tools = [{ googleMaps: {} }];
          if (latLng && typeof latLng.latitude === 'number' && typeof latLng.longitude === 'number') {
            config.toolConfig = {
              retrievalConfig: {
                latLng: {
                  latitude: latLng.latitude,
                  longitude: latLng.longitude,
                },
              },
            };
          }
        }

        const response = await ai.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: prompt,
          config,
        });

        const rawChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
        const sources: GroundingSource[] = [];

        for (const chunk of rawChunks as Array<{
          web?: { uri?: string; title?: string };
          maps?: {
            uri?: string;
            title?: string;
            placeAnswerSources?: { reviewSnippets?: Array<{ content?: string }> };
          };
        }>) {
          if (chunk.web?.uri) {
            sources.push({
              title: chunk.web.title || chunk.web.uri,
              uri: chunk.web.uri,
              kind: 'web',
            });
          }
          if (chunk.maps?.uri) {
            const snippet = chunk.maps.placeAnswerSources?.reviewSnippets?.[0]?.content;
            sources.push({
              title: chunk.maps.title || 'Google Maps Place',
              uri: chunk.maps.uri,
              snippet,
              kind: 'maps',
            });
          }
        }

        return res.json({
          text: response.text || '',
          sources,
          modelUsed: 'gemini-4-hydrogen',
        });
      } catch (err) {
        const formatted = formatGeminiError(err);
        return res.status(formatted.status).json({ error: formatted.message });
      }
    }

    // Standard multi-turn streaming chat supporting model tier selection + fallback
    const selectedModel = ALLOWED_CHAT_MODELS.includes(model)
      ? model
      : 'gemini-4-hydrogen';

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const candidates = getChatModelFallbackOrder(selectedModel);
    let lastErr: unknown = null;
    let succeeded = false;

    for (const candidateModel of candidates) {
      try {
        const thinkingConfig =
          candidateModel === 'gemini-4-hydrogen'
            ? { thinkingLevel: ThinkingLevel.XHIGH }
            : getThinkingConfigForModel(candidateModel);

        const stream = await ai.models.generateContentStream({
          model: candidateModel,
          contents: prompt,
          config: {
            systemInstruction,
            ...(thinkingConfig ? { thinkingConfig } : {}),
          },
        });

        for await (const chunk of stream) {
          if (chunk.text) {
            res.write(`data: ${JSON.stringify({ text: chunk.text })}\n\n`);
          }
        }

        res.write(`data: ${JSON.stringify({ done: true, modelUsed: candidateModel })}\n\n`);
        res.end();
        succeeded = true;
        break;
      } catch (err) {
        lastErr = err;
      }
    }

    if (!succeeded) {
      const formatted = formatGeminiError(lastErr);
      res.write(`data: ${JSON.stringify({ error: formatted.message })}\n\n`);
      res.end();
    }
  });

  // Create & Edit Images (gemini-nano-banana-2.1)
  app.post('/api/ai/image', async (req: Request, res: Response) => {
    const { prompt, aspectRatio = '1:1', imageSize = '1K', sourceImageBase64, sourceMimeType, useSearch = false } =
      req.body as {
        prompt?: string;
        aspectRatio?: string;
        imageSize?: string;
        sourceImageBase64?: string;
        sourceMimeType?: string;
        useSearch?: boolean;
      };

    if (!prompt || !prompt.trim()) {
      return res.status(400).json({ error: 'Please describe the educational image to create or edit.' });
    }

    const ai = getGeminiClient();
    if (!ai) {
      return res.status(503).json({
        error: 'Gemini API key is not configured in Settings > Secrets.',
      });
    }

    try {
      const parts: Array<{ text?: string; inlineData?: { data: string; mimeType: string } }> = [];
      if (sourceImageBase64) {
        parts.push({
          inlineData: {
            data: sourceImageBase64,
            mimeType: sourceMimeType || 'image/png',
          },
        });
      }
      parts.push({ text: prompt.trim() });

      const config: Record<string, unknown> = {
        imageConfig: {
          aspectRatio,
          imageSize,
        },
      };

      if (useSearch) {
        config.tools = [
          {
            googleSearch: {
              searchTypes: {
                webSearch: {},
                imageSearch: {},
              },
            },
          },
        ];
      }

      const response = await ai.models.generateContent({
        model: 'gemini-nano-banana-2.1',
        contents: { parts },
        config,
      });

      let imageUrl: string | null = null;
      let caption = '';

      for (const part of response.candidates?.[0]?.content?.parts ?? []) {
        if (part.inlineData?.data) {
          const mime = part.inlineData.mimeType ?? 'image/png';
          imageUrl = `data:${mime};base64,${part.inlineData.data}`;
        } else if (part.text) {
          caption += part.text;
        }
      }

      if (!imageUrl) {
        return res.status(502).json({ error: 'Model did not return an image asset.' });
      }

      res.json({ imageUrl, caption });
    } catch (err) {
      const formatted = formatGeminiError(err);
      res.status(formatted.status).json({ error: formatted.message });
    }
  });

  // Generate Video from Text or Animate Image (gemini-omni-1.2-flash via Interactions API)
  app.post('/api/ai/video', async (req: Request, res: Response) => {
    const {
      prompt,
      aspectRatio = '16:9',
      duration = '6s',
      imageBase64,
      imageMimeType,
    } = req.body as {
      prompt?: string;
      aspectRatio?: '16:9' | '9:16';
      duration?: string;
      imageBase64?: string;
      imageMimeType?: string;
    };

    if (!prompt || !prompt.trim()) {
      return res.status(400).json({ error: 'Please enter a motion or scene prompt.' });
    }

    const ai = getGeminiClient();
    if (!ai) {
      return res.status(503).json({
        error: 'Gemini API key is not configured in Settings > Secrets.',
      });
    }

    try {
      const cleanAspect = aspectRatio === '9:16' ? '9:16' : '16:9';
      const inputPayload = imageBase64
        ? [
            {
              type: 'image' as const,
              mime_type: imageMimeType || 'image/png',
              data: imageBase64,
            },
            {
              type: 'text' as const,
              text: prompt.trim(),
            },
          ]
        : prompt.trim();

      const interaction = await ai.interactions.create(
        {
          model: 'gemini-omni-1.2-flash',
          input: inputPayload,
          background: false,
          store: false,
          stream: false,
          response_format: {
            type: 'video',
            aspect_ratio: cleanAspect,
            duration,
            resolution: '720p',
          },
        },
        { timeout: 300000 }
      );

      const videoPart = interaction.output_video;
      if (!videoPart?.data && !videoPart?.uri) {
        return res.status(502).json({ error: 'Video generation completed without video output.' });
      }

      const videoUrl = videoPart.data
        ? `data:${videoPart.mime_type || 'video/mp4'};base64,${videoPart.data}`
        : videoPart.uri;

      res.json({ videoUrl });
    } catch (err) {
      const formatted = formatGeminiError(err);
      res.status(formatted.status).json({ error: formatted.message });
    }
  });

  // Audio Transcription (gemini-3.5-transcribe)
  app.post('/api/ai/transcribe', async (req: Request, res: Response) => {
    const { audioBase64, mimeType = 'audio/webm' } = req.body as {
      audioBase64?: string;
      mimeType?: string;
    };

    if (!audioBase64) {
      return res.status(400).json({ error: 'No audio payload received.' });
    }

    const ai = getGeminiClient();
    if (!ai) {
      return res.status(503).json({
        error: 'Gemini API key is not configured in Settings > Secrets.',
      });
    }

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.5-transcribe',
        contents: {
          parts: [
            {
              inlineData: {
                mimeType,
                data: audioBase64,
              },
            },
            { text: 'Transcribe this classroom audio accurately with clear punctuation.' },
          ],
        },
      });

      res.json({ transcript: response.text || '' });
    } catch (err) {
      const formatted = formatGeminiError(err);
      res.status(formatted.status).json({ error: formatted.message });
    }
  });

  // --------------------------------------------------------------------------
  // Vite Dev Middleware or Static Production Build
  // --------------------------------------------------------------------------
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const disableHmr = process.env.DISABLE_HMR === 'true';
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        allowedHosts: true,
        hmr: disableHmr ? false : { server: httpServer },
        ws: { server: httpServer },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`SMARTFUN 360 server listening on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start SMARTFUN 360 server:', err);
  process.exit(1);
});
