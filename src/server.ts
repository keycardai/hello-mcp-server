import { randomUUID } from "node:crypto";
import { requireBearerAuth } from "@keycardai/mcp-oauth/server/auth/middleware/bearerAuth";
import { mcpAuthMetadataRouter } from "@keycardai/mcp-oauth/server/auth/router";
import { McpServer as McpServerImpl } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport as StreamableHTTPServerTransportImpl } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import express from "express";
import { config } from "./config";
import { createAuthMiddleware } from "./middleware/auth";
import { httpLoggingMiddleware } from "./middleware/logging";
import { getLogger } from "./observability/logger";
import { registerAllTools } from "./tools/index";
import type { McpServer } from "./types/index";

// Create authentication middleware using the local SDK
const authMiddleware = createAuthMiddleware(requireBearerAuth);

// Global storage for per-session servers
const sessionServers: {
  [sessionId: string]: {
    transport: InstanceType<typeof StreamableHTTPServerTransportImpl>;
  };
} = {};

/**
 * Creates and configures a new MCP server instance for each session
 *
 * @returns New configured MCP server with all tools registered
 */
function createMcpServerForSession(): McpServer {
  const mcpServer: McpServer = new McpServerImpl({
    name: "hello-mcp-server",
    version: "1.0.0",
  });

  // Register all available tools for this session
  registerAllTools(mcpServer);

  return mcpServer;
}

/**
 * Creates and configures the Express application
 *
 * @returns Configured Express application
 */
export function createApp(): express.Application {
  const app = express();

  // Parse JSON requests
  app.use(express.json());

  // Add OAuth metadata routes for MCP client discovery
  // These routes allow MCP clients to discover authentication requirements
  app.use(
    mcpAuthMetadataRouter({
      issuer: config.keycardStsIssuerUrl,
      scopesSupported: ['mcp:tools'],
      resourceName: "Hello MCP Server",
    })
  );

  // Add logging middleware for /mcp endpoint
  app.use(httpLoggingMiddleware);

  // Handle MCP protocol requests
  app.post("/mcp", authMiddleware, async (req: express.Request, res: express.Response) => {
    const { sessionId, logger } = req.context;

    logger.debug("Processing MCP request");

    let sessionData: { transport: InstanceType<typeof StreamableHTTPServerTransportImpl> };

    if (sessionId && sessionServers[sessionId]) {
      logger.debug("Using existing session server");
      sessionData = sessionServers[sessionId];
    } else if (!sessionId && isInitializeRequest(req.body)) {
      logger.debug("Creating new session server for initialization request");

      // Create NEW McpServer instance for this session (following official pattern)
      const mcpServer = createMcpServerForSession();

      // Create new transport for initialization request
      const transport = new StreamableHTTPServerTransportImpl({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (newSessionId: string) => {
          req.context.logger.debug("New session initialized", { newSessionId });
          // Store the session data
          sessionServers[newSessionId] = { transport };
        },
      });

      // Clean up when session closes
      transport.onclose = () => {
        logger.debug("Transport closed for session");
        if (transport.sessionId) {
          delete sessionServers[transport.sessionId];
        }
      };

      sessionData = { transport };

      // Connect the MCP server to this transport BEFORE handling request
      // This follows the exact pattern from the official example
      try {
        await mcpServer.connect(transport);
        logger.debug("MCP server connected to transport successfully");
      } catch (error) {
        logger.error("Failed to connect MCP server to transport", {
          error: error instanceof Error ? error.message : "Unknown error",
          stack: error instanceof Error ? error.stack : undefined,
        });
        return res.status(500).json({ error: "Failed to initialize MCP session" });
      }
    } else {
      logger.warn("No sessionId found and not an initialize request");
      return res.status(400).json({ error: "Invalid request" });
    }

    const { transport } = sessionData;

    // Handle the MCP protocol request
    logger.debug("Starting MCP protocol request handling");

    try {
      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      logger.error("Error during transport.handleRequest", {
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      });
      if (!res.headersSent) {
        logger.debug("Sending error response to client");
        return res.status(500).json({
          error: "MCP protocol error",
          details: error instanceof Error ? error.message : "Unknown error",
        });
      } else {
        logger.warn("Cannot send error response - headers already sent");
      }
    }

    logger.debug("MCP request handling completed");
  });

  /**
   * Helper function for handling session-based MCP requests
   */
  const handleSessionRequest = async (req: express.Request, res: express.Response) => {
    const { sessionId, logger } = req.context;

    logger?.debug("Handling session request");

    if (!sessionId || !sessionServers[sessionId]) {
      logger?.warn("Invalid or missing session ID");
      return res.status(400).send("Invalid or missing session ID");
    }

    const { transport } = sessionServers[sessionId];
    await transport.handleRequest(req, res);
  };

  // Handle GET requests for SSE streams
  app.get("/mcp", authMiddleware, handleSessionRequest);

  // Handle DELETE requests for session termination
  app.delete("/mcp", authMiddleware, handleSessionRequest);

  return app;
}

/**
 * Starts the MCP server
 *
 * This function:
 * - Sets up the Express application (no global MCP server)
 * - Starts listening on the configured port
 * - Displays startup information
 */
export function startServer(): void {
  const app = createApp();
  const logger = getLogger().withOperation("server_startup");

  app
    .listen(config.port, () => {
      logger.debug("🚀 Keycard Hello MCP Server started!", {
        endpoint: `${config.baseUrl}/mcp`,
        stsIssuer: config.keycardStsIssuerUrl,
        availableTools: "keycard-logo, whoami",
        architecture: "One MCP server instance per session (prevents race conditions)",
        note: "Using local typescript-mcp-sdk until published to npm",
        observabilityEnabled: config.observability.enableOtel,
        environment: config.observability.environment,
      });
    })
    .on("error", (error: Error) => {
      logger.error("Failed to start server", {
        error: error.message,
        stack: error.stack,
      });
      process.exit(1);
    });
}