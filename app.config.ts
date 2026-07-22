// ── Expo Config ────────────────────────────────────────────
// Reads environment variables at build time and exposes them
// via Constants.expoConfig.extra so all platforms (web, iOS,
// Android) can access them reliably.

export default ({ config }: { config: Record<string, any> }) => ({
  ...config,
  extra: {
    ...config.extra,
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
    aiApiUrl: process.env.EXPO_PUBLIC_AI_API_URL ?? '',
    aiApiKey: process.env.EXPO_PUBLIC_AI_API_KEY ?? '',
    aiModel: process.env.EXPO_PUBLIC_AI_MODEL ?? '',
    aiProxyUrl: process.env.EXPO_PUBLIC_AI_PROXY_URL ?? '',
  },
});
