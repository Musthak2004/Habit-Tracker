// ─────────────────────────────────────────────────────────────
//  AI Client — OpenAI-compatible API wrapper
//  Supports Anthropic Claude, DeepSeek, OpenAI, or any
//  OpenAI-compatible endpoint via environment config.
//
//  Configure via .env:
//    EXPO_PUBLIC_AI_API_URL   — base URL (default: Anthropic's
//                               OpenAI-compatible endpoint)
//    EXPO_PUBLIC_AI_API_KEY   — API key
//    EXPO_PUBLIC_AI_MODEL     — model name (default: claude-sonnet-4-20250514)
// ─────────────────────────────────────────────────────────────

import { supabase } from './supabase';
import { ENV } from './env';

// ── Configuration ────────────────────────────────────────────
//
// AI calls go through ONE of two paths:
//
//   Path A — Server-side proxy (RECOMMENDED for production)
//     Set EXPO_PUBLIC_AI_PROXY_URL to your Supabase Edge Function
//     or Cloudflare Worker URL. The API key lives ONLY on the
//     server. See: supabase/functions/ai-proxy/
//
//   Path B — Direct client-side calls (legacy/dev only)
//     The API key is bundled into the client app at build time
//     via EXPO_PUBLIC_AI_API_KEY. Anyone can extract it from
//     your APK/IPA. Use only for local development.
//
const CONFIG = {
  // Server-side proxy (recommended)
  PROXY_URL: ENV.aiProxyUrl,
  // Anthropic native API (fallback)
  ANTHROPIC_API_URL: 'https://api.anthropic.com/v1/messages',
  ANTHROPIC_VERSION: '2023-06-01',
  // OpenAI-compatible fallback
  OPENAI_API_URL: ENV.aiApiUrl,
  API_KEY: ENV.aiApiKey,
  MODEL: ENV.aiModel || 'claude-sonnet-4-20250514',
  MAX_TOKENS: 1024,
  TEMPERATURE: 0.7,
};

// Detect provider: if URL contains "deepseek" or user set their own URL, use OpenAI format
function isOpenAICompatible(): boolean {
  const url = CONFIG.OPENAI_API_URL.toLowerCase();
  return (
    url.includes('opencode') ||
    url.includes('deepseek') ||
    url.includes('openai') ||
    url.includes('groq') ||
    url.includes('together') ||
    url.includes('mistral') ||
    (url.length > 0 && !url.includes('anthropic'))
  );
}

// ── Message types ────────────────────────────────────────────
export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIRequestOptions {
  system?: string;
  messages: AIMessage[];
  temperature?: number;
  maxTokens?: number;
}

export interface AIResponse {
  content: string;
  model: string;
  usage?: { promptTokens: number; completionTokens: number };
}

// ── API call (Anthropic native format) ───────────────────────
async function callAnthropic(opts: AIRequestOptions): Promise<AIResponse> {
  const response = await fetch(CONFIG.ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': CONFIG.API_KEY,
      'anthropic-version': CONFIG.ANTHROPIC_VERSION,
    },
    body: JSON.stringify({
      model: CONFIG.MODEL,
      system: opts.system,
      messages: opts.messages,
      max_tokens: opts.maxTokens ?? CONFIG.MAX_TOKENS,
      temperature: opts.temperature ?? CONFIG.TEMPERATURE,
    }),
  });

  if (!response.ok) {
    const err = await response.text().catch(() => 'Unknown error');
    throw new Error(`Anthropic API error ${response.status}: ${err}`);
  }

  const data = await response.json();

  return {
    content: data.content?.[0]?.text ?? '',
    model: data.model ?? CONFIG.MODEL,
    usage: data.usage
      ? {
          promptTokens: data.usage.input_tokens,
          completionTokens: data.usage.output_tokens,
        }
      : undefined,
  };
}

// ── API call (OpenAI-compatible format) ──────────────────────
async function callOpenAI(opts: AIRequestOptions): Promise<AIResponse> {
  const messages: { role: string; content: string }[] = [];

  if (opts.system) {
    messages.push({ role: 'system', content: opts.system });
  }
  messages.push(...opts.messages);

  const response = await fetch(`${CONFIG.OPENAI_API_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${CONFIG.API_KEY}`,
    },
    body: JSON.stringify({
      model: CONFIG.MODEL,
      messages,
      max_tokens: opts.maxTokens ?? CONFIG.MAX_TOKENS,
      temperature: opts.temperature ?? CONFIG.TEMPERATURE,
    }),
  });

  if (!response.ok) {
    const err = await response.text().catch(() => 'Unknown error');
    throw new Error(`AI API error ${response.status}: ${err}`);
  }

  const data = await response.json();

  return {
    content: data.choices?.[0]?.message?.content ?? '',
    model: data.model ?? CONFIG.MODEL,
    usage: data.usage
      ? {
          promptTokens: data.usage.prompt_tokens,
          completionTokens: data.usage.completion_tokens,
        }
      : undefined,
  };
}

// ── API call through server-side proxy (recommended) ────────
async function callAIviaProxy(opts: AIRequestOptions): Promise<AIResponse> {
  const session = await supabase.auth.getSession();
  const token = session?.data?.session?.access_token;

  // Don't send a provider hint — the proxy detects the provider from its
  // own server-side env vars (AI_API_URL). The client shouldn't override this.
  const response = await fetch(CONFIG.PROXY_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      system: opts.system,
      messages: opts.messages,
      maxTokens: opts.maxTokens ?? CONFIG.MAX_TOKENS,
      temperature: opts.temperature ?? CONFIG.TEMPERATURE,
    }),
  });

  if (!response.ok) {
    // Don't forward the response body to the caller (could leak internal details).
    // A 401 means the caller's session is expired — the app should re-auth.
    if (response.status === 401) {
      throw new Error('AI proxy requires authentication. Sign in again.');
    }
    throw new Error('AI request failed. Please try again.');
  }

  const data = await response.json();
  return {
    content: data.content ?? '',
    model: data.model ?? CONFIG.MODEL,
    usage: data.usage ?? undefined,
  };
}

// ── Public API ───────────────────────────────────────────────
export async function callAI(opts: AIRequestOptions): Promise<AIResponse> {
  // Path A: Use server-side proxy if configured (recommended)
  if (CONFIG.PROXY_URL) {
    return callAIviaProxy(opts);
  }

  // Path B: Direct client-side call (legacy — API key is in the bundle)
  if (!CONFIG.API_KEY) {
    // Graceful fallback when no API key is configured
    return {
      content: '',
      model: 'none',
    };
  }

  return isOpenAICompatible() ? callOpenAI(opts) : callAnthropic(opts);
}

// ── Coaching-specific prompts ────────────────────────────────

const COACHING_SYSTEM_PROMPT = `You are a supportive, insightful habit coach. Your job is to analyze a user's habit data and generate a short, personalized motivational message (1-3 sentences).

Rules:
- Be encouraging and specific, reference their actual data
- Vary your tone: sometimes tough-love, sometimes gentle, sometimes playful
- If they have a "worst" habit, suggest ONE concrete, tiny action they could take
- Never shame, frame gaps as opportunities
- Keep it under 280 characters
- Do not use em dashes (—). Use commas, colons, or periods instead.
- Return ONLY the message text, no labels or prefixes`;

export function buildCoachingPrompt(habitData: {
  name: string;
  type: string;
  currentStreak: number;
  longestStreak: number;
  consistency: number;
  weeklyCount: number;
  targetCount: number;
}): AIMessage[] {
  return [
    {
      role: 'user',
      content: `Write a short coaching nudge for this habit:
- Habit: "${habitData.name}" (${habitData.type})
- Current streak: ${habitData.currentStreak} days
- Longest streak: ${habitData.longestStreak} days
- Consistency: ${habitData.consistency}%
- This week: ${habitData.weeklyCount}/${habitData.targetCount * 7} completions
- Target: ${habitData.targetCount} per day

Generate a short, personalized nudge:`,
    },
  ];
}

// ── Reflection-specific prompts ──────────────────────────────

const REFLECTION_SYSTEM_PROMPT = `You are an analytical habit coach generating weekly/monthly reflection reports.

Given a user's habit data, produce a JSON object with this exact structure:
{
  "summary": "2-3 sentence human-readable summary covering overall performance",
  "bestHabit": "name of habit with highest consistency",
  "bestConsistency": number (0-100),
  "worstHabit": "name of habit with lowest consistency",
  "worstConsistency": number (0-100),
  "overallConsistency": number (0-100),
  "topStreak": number (longest streak across all habits),
  "totalCompletions": number,
  "habitSummaries": [
    {
      "name": "habit name",
      "consistency": number,
      "streak": number,
      "trend": "up" | "down" | "stable",
      "insight": "one-sentence observation about this habit"
    }
  ],
  "insights": ["2-3 key observations about their patterns"],
  "recommendations": ["2-3 actionable suggestions for improvement"]
}

Rules:
- Be data-driven and specific
- Identify meaningful patterns, not just stats
- Recommendations should be concrete and achievable
- Keep summary conversational but professional
- Do not use em dashes (—). Use commas, colons, or periods instead.
- Return ONLY valid JSON, no markdown or extra text`;

export function buildReflectionPrompt(
  periodType: 'weekly' | 'monthly',
  habits: {
    name: string;
    streak: number;
    consistency: number;
    weeklyCount: number;
    monthlyCount: number;
    totalCompletions: number;
  }[]
): { system: string; messages: AIMessage[] } {
  const habitLines = habits
    .map(
      (h) =>
        `- ${h.name}: streak=${h.streak}d, consistency=${h.consistency}%, weekly=${h.weeklyCount}, monthly=${h.monthlyCount}, total=${h.totalCompletions}`
    )
    .join('\n');

  return {
    system: REFLECTION_SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Generate a ${periodType} reflection report for this habit data:\n\n${habitLines}`,
      },
    ],
  };
}

// ── Quick check: is AI available? ────────────────────────────
export function isAIConfigured(): boolean {
  return CONFIG.API_KEY.length > 0;
}

export function getAIModel(): string {
  return CONFIG.MODEL;
}
