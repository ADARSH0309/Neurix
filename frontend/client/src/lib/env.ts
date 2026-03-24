/**
 * Environment variable access with validation
 */

interface EnvConfig {
  GROQ_API_KEY: string | undefined;
  IS_CONFIGURED: boolean;
}

function loadEnv(): EnvConfig {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY as string | undefined;
  return {
    GROQ_API_KEY: apiKey,
    IS_CONFIGURED: !!apiKey && apiKey.length > 0 && apiKey !== 'your-api-key-here',
  };
}

export const env = loadEnv();
