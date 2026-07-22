// ── Environment Variables ──────────────────────────────────
// Centralized access to environment variables across all
// platforms (web, iOS, Android).
//
// Priority order:
//   1. Constants.expoConfig.extra  (from app.config.ts — works everywhere)
//   2. process.env.EXPO_PUBLIC_*   (Metro inlines for native as fallback)
// ─────────────────────────────────────────────────────────────

import Constants from 'expo-constants';

interface EnvVars {
  supabaseUrl: string;
  supabaseAnonKey: string;
  aiApiUrl: string;
  aiApiKey: string;
  aiModel: string;
  aiProxyUrl: string;       // Server-side proxy URL (recommended over direct AI calls)
}

function loadEnv(): EnvVars {
  // Try process.env first (Metro inlines EXPO_PUBLIC_* on web),
  // then fall back to Constants.expoConfig.extra (works on native).
  const supabaseUrl =
    getProcessEnv('EXPO_PUBLIC_SUPABASE_URL') ||
    extraKey('supabaseUrl') ||
    '';
  const supabaseAnonKey =
    getProcessEnv('EXPO_PUBLIC_SUPABASE_ANON_KEY') ||
    extraKey('supabaseAnonKey') ||
    '';
  const aiApiUrl =
    getProcessEnv('EXPO_PUBLIC_AI_API_URL') ||
    extraKey('aiApiUrl') ||
    '';
  const aiApiKey =
    getProcessEnv('EXPO_PUBLIC_AI_API_KEY') ||
    extraKey('aiApiKey') ||
    '';
  const aiModel =
    getProcessEnv('EXPO_PUBLIC_AI_MODEL') ||
    extraKey('aiModel') ||
    '';
  const aiProxyUrl =
    getProcessEnv('EXPO_PUBLIC_AI_PROXY_URL') ||
    extraKey('aiProxyUrl') ||
    '';

  return { supabaseUrl, supabaseAnonKey, aiApiUrl, aiApiKey, aiModel, aiProxyUrl };
}

/** Read from Constants.expoConfig.extra (populated by app.config.ts) */
function extraKey(key: string): string | undefined {
  try {
    const extra = Constants.expoConfig?.extra as Record<string, string> | undefined;
    return extra?.[key];
  } catch {
    return undefined;
  }
}

/** Read from process.env (Metro inlines EXPO_PUBLIC_* for web) */
function getProcessEnv(key: string): string | undefined {
  try {
    // Metro replaces process.env.EXPO_PUBLIC_* with string literals at build time.
    // In some web polyfills it's a getter that throws — this try/catch handles that.
    if (typeof process !== 'undefined') {
      const val = (process.env as Record<string, string | undefined>)[key];
      if (val && val !== '') return val;
    }
  } catch {
    // process.env not available (e.g. browser runtime)
  }
  // Metro fallback: the EXPO_PUBLIC_ prefix is a compile-time marker, but if
  // inlining failed, check globalThis which Metro sometimes populates.
  try {
    const g = globalThis as unknown as Record<string, string | undefined>;
    return g[key];
  } catch {
    return undefined;
  }
}

export const ENV = loadEnv();

// ── Startup validation ─────────────────────────────────────
// Fail loudly if required environment is missing, rather than
// silently running with undefined values.
if (!ENV.supabaseUrl || !ENV.supabaseAnonKey) {
  console.error(
    '❌ FATAL: Supabase credentials not configured.\n' +
    '  Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY\n' +
    '  in .env.local (or app.config.ts extra).\n' +
    '  The app will continue but auth and sync will fail.'
  );
}

if (!ENV.supabaseUrl || ENV.supabaseUrl === 'https://your-project.supabase.co') {
  console.warn(
    '⚠️  Using placeholder Supabase credentials.\n' +
    '  Copy .env to .env.local and fill in your real project values.'
  );
}

if (ENV.aiProxyUrl) {
  console.info('✅ AI proxy configured — API key stays server-side.');
} else if (ENV.aiApiKey && ENV.aiApiKey.length > 10) {
  console.warn(
    '⚠️  SECURITY: AI API key is bundled into the client application.\n' +
    '  Anyone who extracts your APK/IPA can make AI calls at your expense.\n' +
    '  For production, set EXPO_PUBLIC_AI_PROXY_URL and remove EXPO_PUBLIC_AI_API_KEY.\n' +
    '  See: supabase/functions/ai-proxy/ for the proxy function.'
  );
} else if (!ENV.aiApiKey) {
  console.info('ℹ️  AI features disabled (no EXPO_PUBLIC_AI_API_KEY or EXPO_PUBLIC_AI_PROXY_URL configured).');
}
