import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { env } from "../lib/config.js";
import { logger } from "../lib/logger.js";
import { supabaseAdmin, supabaseAnonServer } from "../lib/supabase.js";
import { authenticate } from "../middleware/auth.js";
import { AuthError, ValidationError } from "../utils/errors.js";

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  companyName: z.string().optional(),
  company: z.string().optional(), // frontend may send "company"
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const profileUpdateSchema = z.object({
  company_name: z.string().optional(),
});

const passwordResetSchema = z.object({
  email: z.string().email(),
});

export async function authRoutes(app: FastifyInstance) {
  app.post("/auth/signup", async (request) => {
    try {
      const body = signupSchema.parse(request.body);
      const companyName = body.companyName ?? body.company ?? null;

      if (!env.SUPABASE_SERVICE_KEY) {
        throw new AuthError("Server auth is not configured. Set SUPABASE_SERVICE_KEY for signup.");
      }

      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email: body.email,
        password: body.password,
        email_confirm: true,
      });

      if (error) throw new AuthError(error.message);
      if (!data.user) throw new AuthError("Failed to create user");

      const { error: dbError } = await supabaseAdmin.from("users").insert({
        id: data.user.id,
        email: body.email,
        auth_id: data.user.id,
        company_name: companyName,
      });

      if (dbError) {
        logger.error({ dbError }, "Signup: failed to create user record");
        throw new AuthError("Account was created but profile setup failed. Please try logging in.");
      }

      // admin.createUser does not return a session; sign in with anon client to get tokens
      const { data: signInData, error: signInError } = await supabaseAnonServer.auth.signInWithPassword({
        email: body.email,
        password: body.password,
      });
      if (signInError || !signInData?.session) {
        throw new AuthError("Account created. Please sign in with your email and password.");
      }

      const session = signInData.session;
      return {
        session: {
          access_token: session.access_token,
          refresh_token: session.refresh_token ?? "",
        },
        user: {
          id: signInData.user.id,
          email: signInData.user.email ?? body.email,
        },
      };
    } catch (err) {
      if (err instanceof AuthError || err instanceof ValidationError) throw err;
      if (err && typeof err === "object" && "name" in err && (err as { name: string }).name === "ZodError") throw err;
      logger.error({ err }, "Signup unexpected error");
      throw new AuthError("Signup failed. Please try again or sign in if you already have an account.");
    }
  });

  app.post("/auth/login", async (request) => {
    const body = loginSchema.parse(request.body);

    const { data, error } = await supabaseAnonServer.auth.signInWithPassword({
      email: body.email,
      password: body.password,
    });

    if (error) throw new AuthError(error.message);
    const session = data.session;
    if (!session) throw new AuthError("No session returned");

    return {
      session: {
        access_token: session.access_token,
        refresh_token: session.refresh_token ?? "",
      },
      user: {
        id: data.user.id,
        email: data.user.email ?? body.email,
      },
    };
  });

  app.post("/auth/logout", async () => {
    await supabaseAnonServer.auth.signOut().catch(() => {});
    return { success: true };
  });

  app.post("/auth/refresh", async (request) => {
    const { refresh_token } = request.body as { refresh_token: string };
    if (!refresh_token) {
      throw new ValidationError("Refresh token is required");
    }

    const { data, error } = await supabaseAnonServer.auth.refreshSession({
      refresh_token,
    });

    if (error) throw new AuthError(error.message);
    const session = data.session;
    if (!session) throw new AuthError("No session returned");

    return {
      session: {
        access_token: session.access_token,
        refresh_token: session.refresh_token ?? "",
      },
      user: {
        id: data.user?.id,
        email: data.user?.email,
      },
    };
  });

  app.post("/auth/password-reset", async (request) => {
    const { email } = passwordResetSchema.parse(request.body);
    const { error } = await supabaseAnonServer.auth.resetPasswordForEmail(email);
    if (error) throw new AuthError(error.message);
    return { success: true };
  });

  app.get("/auth/me", { preHandler: authenticate }, async (request) => {
    const user = request.user;
    if (!user) throw new AuthError();

    const { data: profile, error } = await supabaseAdmin
      .from("users")
      .select("id, email, company_name")
      .eq("id", user.id)
      .maybeSingle();

    if (error) throw error;

    if (profile) return profile;

    const { error: upsertError } = await supabaseAdmin.from("users").upsert(
      {
        id: user.id,
        email: user.email ?? "",
        auth_id: user.id,
        company_name: null,
      },
      { onConflict: "id", ignoreDuplicates: true }
    );
    if (upsertError && !String(upsertError.message).includes("users_email_key")) {
      throw upsertError;
    }

    return {
      id: user.id,
      email: user.email ?? "",
      company_name: null,
    };
  });

  app.patch("/auth/profile", { preHandler: authenticate }, async (request) => {
    const user = request.user;
    if (!user) throw new AuthError();
    const body = profileUpdateSchema.parse(request.body);

    const { data: profile, error } = await supabaseAdmin
      .from("users")
      .update(body)
      .eq("id", user.id)
      .select()
      .single();

    if (error) throw error;

    return profile;
  });
}
