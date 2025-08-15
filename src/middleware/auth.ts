import type { RequestHandler, AuthInfo } from "../types/index";

// Extend Express Request to include auth property
declare module "express-serve-static-core" {
  interface Request {
    /**
     * Authentication information added by Keycard auth middleware
     * Contains validated user and token information
     */
    auth?: AuthInfo;
  }
}

/**
 * Configuration options for authentication middleware
 */
export interface AuthMiddlewareOptions {
  /** Required OAuth scopes for accessing the MCP server */
  requiredScopes?: string[];
}

/**
 * Creates authentication middleware for protecting MCP endpoints
 *
 * This middleware:
 * - Validates Bearer tokens using Keycard STS
 * - Verifies required OAuth scopes
 * - Adds authentication info to the Express request object
 * - Handles authentication errors gracefully
 *
 * @param requireBearerAuthImpl - The bearerAuth implementation (passed to avoid complex imports)
 * @param options - Configuration options for the middleware
 * @returns Express middleware function
 */
export function createAuthMiddleware(
  requireBearerAuthImpl: (config: { requiredScopes: string[] }) => RequestHandler,
  options: AuthMiddlewareOptions = {}
): RequestHandler {
  const { requiredScopes = [] } = options;
  
  return requireBearerAuthImpl({
    requiredScopes,
  });
}