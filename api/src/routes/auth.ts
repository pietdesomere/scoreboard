import { FastifyRequest, FastifyReply } from "fastify";
import { env } from "../env.js";

type ErrorCode =
  | "INVALID_ARGUMENT"
  | "NOT_FOUND"
  | "CONFLICT"
  | "UNAUTHENTICATED"
  | "INTERNAL";

const statusForCode: Record<ErrorCode, number> = {
  INVALID_ARGUMENT: 400,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNAUTHENTICATED: 401,
  INTERNAL: 500,
};

export function sendError(
  reply: FastifyReply,
  code: ErrorCode,
  message: string
): FastifyReply {
  return reply.status(statusForCode[code]).send({ error: { code, message } });
}

export async function requireAdmin(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const authHeader = request.headers.authorization ?? "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7)
    : "";

  const adminToken = env.ADMIN_TOKEN;
  if (!adminToken || token !== adminToken) {
    sendError(reply, "UNAUTHENTICATED", "Invalid or missing admin token");
  }
}
