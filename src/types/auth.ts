import { z } from "zod";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";

export const JWTPayloadSchema = z.object({
  sub: z.string().optional(),
  iss: z.string().optional(),
  aud: z.string().optional(),
  client_id: z.string().optional(),
  exp: z.number().positive().optional(),
  iat: z.number().positive().optional(),
  scope: z.string().optional(),
}).passthrough();

export const SessionIdHeaderSchema = z.string().min(1);

export type JWTPayload = z.infer<typeof JWTPayloadSchema>;

export interface AuthenticatedToolHandler {
  authInfo?: AuthInfo;
}

export function parseJWTPayload(obj: unknown): JWTPayload | null {
  try {
    return JWTPayloadSchema.parse(obj);
  } catch {
    return null;
  }
}

export function getSessionIdFromHeaders(headers: Record<string, unknown>): string | undefined {
  const sessionId = headers["mcp-session-id"];
  try {
    return SessionIdHeaderSchema.parse(sessionId);
  } catch {
    return undefined;
  }
}