import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { supabase, supabaseAdmin } from "../lib/supabase.js";
import { authenticate } from "../middleware/auth.js";
import { AuthError, ValidationError } from "../utils/errors.js";

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  companyName: z.string().optional(),
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
    const body = signupSchema.parse(request.body);

    const { data, error } = await supabase.auth.signUp({
      email: body.email,
      password: body.password,
    });

    if (error) throw new AuthError(error.message);
    if (!data.user) throw new AuthError("Failed to create user");

    // Create user record in DB
    const { error: dbError } = await supabaseAdmin.from("users").insert({
      id: data.user.id,
      email: body.email,
      auth_id: data.user.id,
      company_name: body.companyName || null,
    });

    if (dbError) {
      // If DB record creation fails, we might want to delete the auth user,
      // but Supabase doesn't easily allow that from the client.
      // For now, just log and throw.
      console.error("Failed to create user record:", dbError);
    }

    return {
      session: data.session,
      user: {
        id: data.user.id,
        email: data.user.email,
      },
    };
  });

  app.post("/auth/login", async (request) => {
    const body = loginSchema.parse(request.body);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: body.email,
      password: body.password,
    });

    if (error) throw new AuthError(error.message);

    return {
      session: data.session,
      user: {
        id: data.user.id,
        email: data.user.email,
      },
    };
  });

  app.post("/auth/logout", async (request) => {
    const { error } = await supabase.auth.signOut();
    if (error) throw new AuthError(error.message);
    return { success: true };
  });

  app.post("/auth/refresh", async (request) => {
    const { refresh_token } = request.body as { refresh_token: string };
    if (!refresh_token) {
      throw new ValidationError("Refresh token is required");
    }

    const { data, error } = await supabase.auth.refreshSession({
      refresh_token,
    });

    if (error) throw new AuthError(error.message);

    return {
      session: data.session,
      user: {
        id: data.user?.id,
        email: data.user?.email,
      },
    };
  });

  app.post("/auth/password-reset", async (request) => {
    const { email } = passwordResetSchema.parse(request.body);
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) throw new AuthError(error.message);
    return { success: true };
  });

  app.get("/auth/me", { preHandler: authenticate }, async (request) => {
    const user = request.user;
    if (!user) throw new AuthError();

    const { data: profile, error } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("id", user.id)
      .single();

    if (error) throw error;

    return profile;
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
