import type { FastifyReply, FastifyRequest } from "fastify";
import { supabase } from "../lib/supabase.js";
import { AuthError, NotFoundError } from "../utils/errors.js";

export async function authenticate(
  request: FastifyRequest,
  _reply: FastifyReply,
) {
  const authHeader = request.headers.authorization;
  if (!authHeader) {
    throw new AuthError("Missing authorization header");
  }

  const token = authHeader.replace("Bearer ", "");
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) {
    throw new AuthError("Invalid or expired token");
  }

  request.user = user;
}

export async function verifyProjectOwnership(
  request: FastifyRequest,
  _reply: FastifyReply,
) {
  const { projectId } = request.params as { projectId: string };
  const user = request.user;

  if (!user) {
    throw new AuthError("User not authenticated");
  }

  const { data: project, error } = await supabase
    .from("projects")
    .select("user_id")
    .eq("id", projectId)
    .single();

  if (error || !project) {
    throw new NotFoundError("Project not found");
  }

  if (project.user_id !== user.id) {
    throw new AuthError("You do not have permission to access this project");
  }
}
