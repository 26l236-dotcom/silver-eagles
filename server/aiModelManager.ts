import { GoogleGenAI, ThinkingLevel, type GenerateContentResponse } from '@google/genai';
import type {
  TeacherAiExecutionMeta,
  TeacherAiModelChoice,
  TeacherAiModelInfo,
  TeacherAiModelStatus,
} from '../src/types';

export type ManagedModelKey = Exclude<TeacherAiModelChoice, 'auto'>;

interface ManagedModelConfig {
  id: ManagedModelKey;
  label: string;
  modelId: string;
  tagline: string;
  description: string;
  speedRating: number;
  capabilityRating: number;
  speedLabel: string;
  capabilityLabel: string;
  bestFor: string[];
  configurableEnvVar: string;
  requiresPaidTier: boolean;
  defaultThinking?: ThinkingLevel;
}

const MODEL_CONFIGS: Record<ManagedModelKey, ManagedModelConfig> = {
  'flash-lite': {
    id: 'flash-lite',
    label: 'Gemini Flash Lite',
    modelId: (process.env.GEMINI_FLASH_LITE_MODEL || '').trim() || 'gemini-3.1-flash-lite',
    tagline: 'Ultra-Fast Everyday Assistant',
    description:
      'Lightweight and rapid responses for everyday classroom questions, quick definitions, and rapid quiz checks.',
    speedRating: 5,
    capabilityRating: 3,
    speedLabel: 'Ultra-Fast',
    capabilityLabel: 'Standard',
    bestFor: ['Quick Q&A', 'Rapid Quizzes', 'Warm-ups'],
    configurableEnvVar: 'GEMINI_FLASH_LITE_MODEL',
    requiresPaidTier: false,
  },
  argon: {
    id: 'argon',
    label: 'Gemini Argon',
    modelId: (process.env.GEMINI_ARGON_MODEL || '').trim() || 'gemini-4-argon',
    tagline: 'Advanced Lesson & STEM Architect',
    description:
      'Configurable high-precision model built for structured lesson planning, STEM derivations, and rich educational content.',
    speedRating: 3,
    capabilityRating: 5,
    speedLabel: 'Balanced',
    capabilityLabel: 'Advanced',
    bestFor: ['Lesson Planning', 'STEM Proofs', 'Curriculum Design'],
    configurableEnvVar: 'GEMINI_ARGON_MODEL',
    requiresPaidTier: true,
    defaultThinking: ThinkingLevel.HIGH,
  },
  hydrogen: {
    id: 'hydrogen',
    label: 'Gemini Hydrogen',
    modelId: (process.env.GEMINI_HYDROGEN_MODEL || '').trim() || 'gemini-4-hydrogen',
    tagline: 'Creative & Interactive Educator',
    description:
      'Configurable flagship teaching model engineered for creative strategies, storytelling hooks, and collaborative classroom labs.',
    speedRating: 4,
    capabilityRating: 5,
    speedLabel: 'Fast',
    capabilityLabel: 'High Reasoning',
    bestFor: ['Storytelling', 'Group Activities', 'Interactive Teaching'],
    configurableEnvVar: 'GEMINI_HYDROGEN_MODEL',
    requiresPaidTier: false,
    defaultThinking: ThinkingLevel.HIGH,
  },
};

interface ModelHealthState {
  status: TeacherAiModelStatus;
  statusMessage?: string;
  latencyMs?: number;
  lastCheckedAt?: number;
}

const healthCache: Record<ManagedModelKey, ModelHealthState> = {
  'flash-lite': { status: 'untested' },
  argon: { status: 'untested' },
  hydrogen: { status: 'untested' },
};

export function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export function classifyGeminiError(err: unknown): {
  httpStatus: number;
  healthStatus: TeacherAiModelStatus;
  message: string;
} {
  const raw = err instanceof Error ? err.message : String(err);
  if (/403|PERMISSION_DENIED|API_KEY_INVALID|API key not valid/i.test(raw)) {
    return {
      httpStatus: 403,
      healthStatus: 'unavailable',
      message:
        'Gemini API authorization failed (403). Please verify GEMINI_API_KEY in Settings > Secrets.',
    };
  }
  if (/429|RESOURCE_EXHAUSTED|quota|billing|paid/i.test(raw)) {
    return {
      httpStatus: 429,
      healthStatus: 'billing_required',
      message:
        'Billing-enabled API key or higher quota required for this model in Settings > Secrets.',
    };
  }
  if (/404|NOT_FOUND|not found|not supported/i.test(raw)) {
    return {
      httpStatus: 404,
      healthStatus: 'unavailable',
      message: 'Configured model ID was not found or is unsupported by the active Gemini endpoint.',
    };
  }
  if (/503|UNAVAILABLE|high demand/i.test(raw)) {
    return {
      httpStatus: 503,
      healthStatus: 'unavailable',
      message: 'Model is temporarily experiencing high demand. Automatic fallback or retry is ready.',
    };
  }
  return {
    httpStatus: 502,
    healthStatus: 'unavailable',
    message: `Gemini request failed: ${raw}`,
  };
}

export function getThinkingConfigForModel(modelId: string): { thinkingLevel: ThinkingLevel } | undefined {
  if (modelId === 'gemini-4-hydrogen') {
    return { thinkingLevel: ThinkingLevel.HIGH };
  }
  if (modelId === 'gemini-4-argon' || modelId === 'gemini-4-carbon') {
    return { thinkingLevel: ThinkingLevel.HIGH };
  }
  // gemini-3.1-flash-lite defaults to MINIMAL and stays fastest without extra thinking config
  return undefined;
}

export function listManagedModels(): {
  hasApiKey: boolean;
  models: TeacherAiModelInfo[];
} {
  const hasApiKey = Boolean(getGeminiClient());
  const keys: ManagedModelKey[] = ['flash-lite', 'argon', 'hydrogen'];

  const models: TeacherAiModelInfo[] = keys.map((key) => {
    const cfg = MODEL_CONFIGS[key];
    const cached = healthCache[key];
    let status: TeacherAiModelStatus = cached.status;
    let statusMessage = cached.statusMessage;

    if (!hasApiKey) {
      status = 'unavailable';
      statusMessage = 'GEMINI_API_KEY is not configured in Settings > Secrets.';
    }

    return {
      id: cfg.id,
      label: cfg.label,
      modelId: cfg.modelId,
      tagline: cfg.tagline,
      description: cfg.description,
      speedRating: cfg.speedRating,
      capabilityRating: cfg.capabilityRating,
      speedLabel: cfg.speedLabel,
      capabilityLabel: cfg.capabilityLabel,
      bestFor: cfg.bestFor,
      configurableEnvVar: cfg.configurableEnvVar,
      requiresPaidTier: cfg.requiresPaidTier,
      status,
      statusMessage,
      latencyMs: cached.latencyMs,
      lastCheckedAt: cached.lastCheckedAt,
    };
  });

  return { hasApiKey, models };
}

export async function probeAllModels(): Promise<{
  hasApiKey: boolean;
  models: TeacherAiModelInfo[];
}> {
  const ai = getGeminiClient();
  if (!ai) {
    return listManagedModels();
  }

  const keys: ManagedModelKey[] = ['flash-lite', 'argon', 'hydrogen'];

  await Promise.all(
    keys.map(async (key) => {
      const cfg = MODEL_CONFIGS[key];
      const started = Date.now();
      try {
        await ai.models.generateContent({
          model: cfg.modelId,
          contents: 'Reply with OK.',
          ...(cfg.modelId === 'gemini-4-hydrogen'
            ? { config: { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } } }
            : {}),
        });
        healthCache[key] = {
          status: 'available',
          statusMessage: 'Verified online and ready.',
          latencyMs: Date.now() - started,
          lastCheckedAt: Date.now(),
        };
      } catch (err) {
        const classified = classifyGeminiError(err);
        healthCache[key] = {
          status: classified.healthStatus,
          statusMessage: classified.message,
          latencyMs: Date.now() - started,
          lastCheckedAt: Date.now(),
        };
      }
    })
  );

  return listManagedModels();
}

export function resolveAutoChoice(
  prompt: string,
  style: string
): {
  primaryKey: ManagedModelKey;
  reason: string;
} {
  const text = `${prompt} ${style}`.toLowerCase();

  const isQuickSimple =
    prompt.trim().length < 75 &&
    /\b(define|what is|quiz|mcq|flashcard|quick|summary|summarize|list|warm[- ]?up|interactive quizzes)\b/i.test(
      text
    ) &&
    !/\b(derive|proof|syllabus|unit plan|lesson plan|curriculum|rubric)\b/i.test(text);

  if (isQuickSimple) {
    return {
      primaryKey: 'flash-lite',
      reason: 'Selected Gemini Flash Lite for rapid classroom Q&A or quiz generation.',
    };
  }

  const isHeavyLessonPlan =
    /\b(lesson plan|curriculum|unit|syllabus|derive|derivation|equation|physics|calculus|quantum|chemistry|lab blueprint|problem-solving)\b/i.test(
      text
    );

  // Use Argon for heavy lesson planning only when not already known to require billing/unavailable
  if (
    isHeavyLessonPlan &&
    healthCache.argon.status !== 'billing_required' &&
    healthCache.argon.status !== 'unavailable'
  ) {
    return {
      primaryKey: 'argon',
      reason: 'Selected Gemini Argon for structured lesson planning and advanced STEM content.',
    };
  }

  return {
    primaryKey: 'hydrogen',
    reason:
      'Selected Gemini Hydrogen for creative teaching strategies, clear explanations, and interactive learning.',
  };
}

function buildFallbackOrder(primaryKey: ManagedModelKey): ManagedModelKey[] {
  if (primaryKey === 'argon') {
    return ['argon', 'hydrogen', 'flash-lite'];
  }
  if (primaryKey === 'hydrogen') {
    return ['hydrogen', 'flash-lite', 'argon'];
  }
  return ['flash-lite', 'hydrogen', 'argon'];
}

export async function generateWithModelFallback(params: {
  requestedChoice: TeacherAiModelChoice;
  prompt: string;
  style: string;
  contents: string;
  configBuilder: (modelId: string) => Record<string, unknown>;
}): Promise<{
  response: GenerateContentResponse;
  meta: TeacherAiExecutionMeta;
}> {
  const ai = getGeminiClient();
  if (!ai) {
    throw new Error('NO_GEMINI_KEY');
  }

  const validChoice: TeacherAiModelChoice =
    params.requestedChoice === 'flash-lite' ||
    params.requestedChoice === 'argon' ||
    params.requestedChoice === 'hydrogen' ||
    params.requestedChoice === 'auto'
      ? params.requestedChoice
      : 'auto';

  let primaryKey: ManagedModelKey;
  let autoReason: string | undefined;

  if (validChoice === 'auto') {
    const resolved = resolveAutoChoice(params.prompt, params.style);
    primaryKey = resolved.primaryKey;
    autoReason = resolved.reason;
  } else {
    primaryKey = validChoice;
  }

  const primaryConfig = MODEL_CONFIGS[primaryKey];
  const requestedLabel =
    validChoice === 'auto' ? `Auto Select (${primaryConfig.label})` : primaryConfig.label;

  const order = buildFallbackOrder(primaryKey);
  const errors: Array<{ key: ManagedModelKey; message: string; httpStatus: number }> = [];
  const overallStart = Date.now();

  for (let i = 0; i < order.length; i++) {
    const candidateKey = order[i];
    const candidate = MODEL_CONFIGS[candidateKey];

    // Skip candidates already known to require billing/404, or recently (<60s) unavailable, if others remain
    const cachedHealth = healthCache[candidateKey];
    const isRecentlyUnavailable =
      cachedHealth.status === 'unavailable' &&
      typeof cachedHealth.lastCheckedAt === 'number' &&
      Date.now() - cachedHealth.lastCheckedAt < 60_000;

    if (
      i > 0 &&
      (cachedHealth.status === 'billing_required' || isRecentlyUnavailable) &&
      i < order.length - 1
    ) {
      continue;
    }

    const attemptStart = Date.now();
    try {
      const response = await ai.models.generateContent({
        model: candidate.modelId,
        contents: params.contents,
        config: params.configBuilder(candidate.modelId),
      });

      const latencyMs = Date.now() - attemptStart;
      healthCache[candidateKey] = {
        status: 'available',
        statusMessage: 'Verified online and ready.',
        latencyMs,
        lastCheckedAt: Date.now(),
      };

      const fallbackUsed = candidateKey !== primaryKey;
      return {
        response,
        meta: {
          requestedChoice: validChoice,
          requestedLabel,
          resolvedModelId: primaryConfig.modelId,
          actualModelId: candidate.modelId,
          actualModelLabel: candidate.label,
          fallbackUsed,
          fallbackReason: fallbackUsed
            ? `${primaryConfig.label} (${primaryConfig.modelId}) was unavailable (${errors[0]?.message || 'request error'}); automatically fell back to ${candidate.label}.`
            : undefined,
          autoReason,
          latencyMs: Date.now() - overallStart,
        },
      };
    } catch (err) {
      const classified = classifyGeminiError(err);
      healthCache[candidateKey] = {
        status: classified.healthStatus,
        statusMessage: classified.message,
        latencyMs: Date.now() - attemptStart,
        lastCheckedAt: Date.now(),
      };
      errors.push({
        key: candidateKey,
        message: classified.message,
        httpStatus: classified.httpStatus,
      });

      // If API key itself is invalid (403) across free/standard models, don't retry pointless fallbacks
      if (classified.httpStatus === 403 && !candidate.requiresPaidTier) {
        break;
      }
    }
  }

  const firstErr = errors[0];
  const combinedError = new Error(firstErr?.message || 'All configured AI models failed.') as Error & {
    httpStatus?: number;
  };
  combinedError.httpStatus = firstErr?.httpStatus || 502;
  throw combinedError;
}

export function getChatModelFallbackOrder(requestedModel: string): string[] {
  const all = [
    MODEL_CONFIGS.hydrogen.modelId,
    MODEL_CONFIGS['flash-lite'].modelId,
    MODEL_CONFIGS.argon.modelId,
    'gemini-4-carbon',
  ];
  const unique = Array.from(new Set([requestedModel, ...all]));
  return unique;
}
