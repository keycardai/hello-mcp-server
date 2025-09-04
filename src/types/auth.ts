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

/**
 * Tool handler for tools without arguments (like whoami)
 */
export interface AuthenticatedToolHandlerNoArgs {
  authInfo?: AuthInfo;
}

/**
 * Tool handler for tools with arguments
 * @template Args - The Zod schema shape for the tool arguments
 */
export type AuthenticatedToolHandlerWithArgs<Args extends import("zod").ZodRawShape> = (
  args: import("zod").z.objectOutputType<Args, import("zod").ZodTypeAny>,
  extra: { authInfo?: AuthInfo }
) => import("@modelcontextprotocol/sdk/types.js").CallToolResult | Promise<import("@modelcontextprotocol/sdk/types.js").CallToolResult>;

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