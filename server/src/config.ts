import { z } from "zod";

const envSchema = z.object({
  // Environment
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().default(3000),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),

  // Supabase
  SUPABASE_URL: z.string().url(),
  SUPABASE_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  // Redis
  REDIS_URL: z.string().url().default("redis://127.0.0.1:6379"),

  // Gemini AI
  GEMINI_API_KEY: z.string().min(1),

  // Google OAuth
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),

  // Encryption
  ENCRYPTION_KEY: z.string().min(32),

  // API
  API_URL: z.string().url().default("http://localhost:3000"),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),

  // Feature flags
  ENABLE_QUEUES: z.coerce.boolean().default(true),
  ENABLE_GSC_SYNC: z.coerce.boolean().default(true),
});

type Env = z.infer<typeof envSchema>;

class Config {
  private env: Env;

  constructor() {
    try {
      this.env = envSchema.parse(process.env);
    } catch (error) {
      console.error(
        "Invalid environment variables:",
        error instanceof Error ? error.message : String(error),
      );
      process.exit(1);
    }
  }

  get nodeEnv() {
    return this.env.NODE_ENV;
  }
  get port() {
    return this.env.PORT;
  }
  get logLevel() {
    return this.env.LOG_LEVEL;
  }
  get supabaseUrl() {
    return this.env.SUPABASE_URL;
  }
  get supabaseKey() {
    return this.env.SUPABASE_KEY;
  }
  get supabaseServiceRoleKey() {
    return this.env.SUPABASE_SERVICE_ROLE_KEY;
  }
  get redisUrl() {
    return this.env.REDIS_URL;
  }
  get geminiApiKey() {
    return this.env.GEMINI_API_KEY;
  }
  get googleClientId() {
    return this.env.GOOGLE_CLIENT_ID;
  }
  get googleClientSecret() {
    return this.env.GOOGLE_CLIENT_SECRET;
  }
  get encryptionKey() {
    return this.env.ENCRYPTION_KEY;
  }
  get apiUrl() {
    return this.env.API_URL;
  }
  get corsOrigin() {
    return this.env.CORS_ORIGIN;
  }
  get enableQueues() {
    return this.env.ENABLE_QUEUES;
  }
  get enableGscSync() {
    return this.env.ENABLE_GSC_SYNC;
  }

  isDevelopment() {
    return this.nodeEnv === "development";
  }
  isProduction() {
    return this.nodeEnv === "production";
  }
  isTest() {
    return this.nodeEnv === "test";
  }

  // AI Model Configuration - all agents use Gemini 3 Pro Preview
  get aiConfig() {
    return {
      strategyModel: "gemini-3-pro-preview",
      executionModel: "gemini-3-pro-preview",
      strategyMaxTokens: 2000,
      executionMaxTokens: 1000,
      strategyTimeout: 60000,
      executionTimeout: 30000,
    };
  }
}

export const config = new Config();
