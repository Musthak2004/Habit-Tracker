// ─────────────────────────────────────────────────────────────
//  AI Proxy — Supabase Edge Function
//  ─────────────────────────────────────────────────────────────
//  Routes client AI requests to Anthropic / OpenAI-compatible
//  providers. The actual API key lives ONLY in server env vars
//  (set via `supabase secrets set`), never reaching the client.
//
//  Deployment:
//    1. supabase link --project-ref <your-project-ref>
//    2. supabase secrets set AI_API_KEY=<your-key>
//    3. supabase secrets set AI_API_URL=<optional-override>
//    4. supabase secrets set AI_MODEL=<optional-override>
//    5. supabase functions deploy ai-proxy
//       (Omitting --no-verify-jwt means Supabase's gateway verifies
//        the caller's JWT — only authenticated users can call this.)
//
//  Client usage:
//    POST /functions/v1/ai-proxy
//    Authorization: Bearer <supabase-access-token>
//    Content-Type: application/json
//
//    Body: {
//      provider?: 'anthropic' | 'openai'  // auto-detected if omitted
//      system?: string
//      messages: { role: string; content: string }[]
//      temperature?: number
//      maxTokens?: number
//    }
// ─────────────────────────────────────────────────────────────

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

// ── Types ──────────────────────────────────────────────────
interface ProxyRequest {
  provider?: 'anthropic' | 'openai';
  system?: string;
  messages: { role: string; content: string }[];
  temperature?: number;
  maxTokens?: number;
}

interface ProxyResponse {
  content: string;
  model: string;
  usage?: { promptTokens: number; completionTokens: number };
}

// ── Configuration (server-side only — never exposed to client) ──

const AI_API_KEY = Deno.env.get('AI_API_KEY') ?? '';
const AI_MODEL = Deno.env.get('AI_MODEL') ?? 'claude-sonnet-4-20250514';
const AI_API_URL = Deno.env.get('AI_API_URL') ?? ''; // for OpenAI-compatible

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';

// ── Detect provider from settings ──────────────────────────
function detectProvider(url: string): 'openai' | 'anthropic' {
  const lower = url.toLowerCase();
  if (lower.includes('opencode') || lower.includes('deepseek') ||
      lower.includes('openai') || lower.includes('groq') ||
      lower.includes('together') || lower.includes('mistral')) {
    return 'openai';
  }
  return 'anthropic';
}

// ── Call Anthropic API ─────────────────────────────────────
async function callAnthropic(
  messages: { role: string; content: string }[],
  system?: string,
  temperature?: number,
  maxTokens?: number
): Promise<ProxyResponse> {
  const response = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': AI_API_KEY,
      'anthropic-version': ANTHROPIC_VERSION,
    },
    body: JSON.stringify({
      model: AI_MODEL,
      system,
      messages,
      max_tokens: maxTokens ?? 1024,
      temperature: temperature ?? 0.7,
    }),
  });

  if (!response.ok) {
    const err = await response.text().catch(() => 'Unknown error');
    throw new Error(`Anthropic API error ${response.status}: ${err}`);
  }

  const data = await response.json();
  return {
    content: data.content?.[0]?.text ?? '',
    model: data.model ?? AI_MODEL,
    usage: data.usage
      ? { promptTokens: data.usage.input_tokens, completionTokens: data.usage.output_tokens }
      : undefined,
  };
}

// ── Call OpenAI-compatible API ─────────────────────────────
async function callOpenAI(
  messages: { role: string; content: string }[],
  system?: string,
  temperature?: number,
  maxTokens?: number
): Promise<ProxyResponse> {
  const allMessages: { role: string; content: string }[] = [];
  if (system) {
    allMessages.push({ role: 'system', content: system });
  }
  allMessages.push(...messages);

  const baseUrl = AI_API_URL || 'https://api.openai.com/v1';
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${AI_API_KEY}`,
    },
    body: JSON.stringify({
      model: AI_MODEL,
      messages: allMessages,
      max_tokens: maxTokens ?? 1024,
      temperature: temperature ?? 0.7,
    }),
  });

  if (!response.ok) {
    const err = await response.text().catch(() => 'Unknown error');
    throw new Error(`AI API error ${response.status}: ${err}`);
  }

  const data = await response.json();
  return {
    content: data.choices?.[0]?.message?.content ?? '',
    model: data.model ?? AI_MODEL,
    usage: data.usage
      ? { promptTokens: data.usage.prompt_tokens, completionTokens: data.usage.completion_tokens }
      : undefined,
  };
}

// ── Request handler ────────────────────────────────────────
serve(async (req: Request) => {
  // CORS headers (required for web, harmless for mobile)
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // ── Validate API key is configured server-side ───────────
    if (!AI_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'AI proxy not configured. Deployer must set AI_API_KEY secret.' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── Parse request body ──────────────────────────────────
    const body: ProxyRequest = await req.json();

    if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid "messages" array in request body.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── Determine provider ──────────────────────────────────
    const provider = body.provider ?? detectProvider(AI_API_URL);

    // ── Make the API call ───────────────────────────────────
    let result: ProxyResponse;
    if (provider === 'openai') {
      result = await callOpenAI(body.messages, body.system, body.temperature, body.maxTokens);
    } else {
      result = await callAnthropic(body.messages, body.system, body.temperature, body.maxTokens);
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('AI proxy error:', message);

    // Don't leak internal details in production responses
    return new Response(
      JSON.stringify({ error: 'AI request failed. Please try again.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
