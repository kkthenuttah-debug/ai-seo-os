import { config } from 'dotenv';

config();

export const env = {
  // Server
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3001'),
  HOST: process.env.HOST || '0.0.0.0',

  // Supabase
  SUPABASE_URL: process.env.SUPABASE_URL || '',
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || '',
  SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY || '',

  // Redis
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',

  // Gemini AI
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',

  // Google OAuth (for GSC)
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || '',
  GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/api/integrations/gsc/callback',

  // JWT
  JWT_SECRET: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',

  // App
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
  API_URL: process.env.API_URL || 'http://localhost:3001',

  // Webhooks
  WEBHOOK_SECRET: process.env.WEBHOOK_SECRET || '',
  WEBHOOK_IP_WHITELIST: process.env.WEBHOOK_IP_WHITELIST || '',
} as const;

export function validateEnv(): void {
  const required = [
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
  ];

  const missing = required.filter(key => !env[key as keyof typeof env]);

  if (missing.length > 0) {
    console.warn(`Warning: Missing environment variables: ${missing.join(', ')}`);
  }
}
