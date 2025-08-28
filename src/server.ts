import { randomUUID } from "node:crypto";
import { requireBearerAuth } from "@keycardlabs/mcp-oauth/server/auth/middleware/bearerAuth";
import { mcpAuthMetadataRouter, InferredAuthMetadataOptions } from "@keycardlabs/mcp-oauth/server/auth/router";
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

  // Trust proxy for correct protocol detection behind reverse proxies
  app.set('trust proxy', true);

  // Parse JSON requests
  app.use(express.json());

  // Check if we're in multi-tenant mode
  const isMultiTenant = config.issuerBaseDomain && config.mcpBaseDomain;
  
  if (isMultiTenant) {
    // Multi-tenant mode: dynamic issuer based on Host header
    const multiTenantOptions: InferredAuthMetadataOptions = {
      oauthMetadata: {
        issuer: (req: express.Request) => {
          // Extract zoneId from Host header (e.g., z123.dev.local -> z123)
          const zoneId = req.headers.host?.split('.')[0] || 'default';
          // Use HTTP for local development, HTTPS for production
          const protocol = config.issuerBaseDomain.includes('localdev') ? 'http' : 'https';
          return `${protocol}://${zoneId}.${config.issuerBaseDomain}`;
        }
      },
      scopesSupported: ['mcp:tools'],
      resourceName: "Hello MCP Server",
    };
    app.use(mcpAuthMetadataRouter(multiTenantOptions));
  } else {
    // Single-tenant mode: static issuer (backward compatibility)
    const singleTenantOptions: InferredAuthMetadataOptions = {
      oauthMetadata: {
        issuer: config.keycardStsIssuerUrl
      },
      scopesSupported: ['mcp:tools'],
      resourceName: "Hello MCP Server",
    };
    app.use(mcpAuthMetadataRouter(singleTenantOptions));
  }

  // Mount all routes under /hello
  const helloRouter = express.Router();
  
  // Add logging middleware for /hello/mcp endpoint
  helloRouter.use(httpLoggingMiddleware);

  // Handle MCP protocol requests
  helloRouter.post("/mcp", authMiddleware, async (req: express.Request, res: express.Response) => {
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
  helloRouter.get("/mcp", authMiddleware, handleSessionRequest);

  // Handle DELETE requests for session termination
  helloRouter.delete("/mcp", authMiddleware, handleSessionRequest);
  
  // Debug endpoint to check environment
  app.get('/debug-config', (req, res) => {
    res.json({
      NODE_ENV: process.env.NODE_ENV,
      HOST: process.env.HOST,
      PORT: process.env.PORT,
      baseUrl: config.baseUrl,
      isProduction: process.env.NODE_ENV === "production"
    });
  });

  // Mount the hello router under /hello
  app.use('/hello', helloRouter);

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
      const isMultiTenant = config.issuerBaseDomain && config.mcpBaseDomain;
      logger.debug("🚀 Keycard Hello MCP Server started!", {
        endpoint: `${config.baseUrl}/hello/mcp`,
        mode: isMultiTenant ? 'multi-tenant' : 'single-tenant',
        stsIssuer: isMultiTenant ? `https://{zoneId}.${config.issuerBaseDomain}` : config.keycardStsIssuerUrl,
        issuerBaseDomain: isMultiTenant ? config.issuerBaseDomain : undefined,
        mcpBaseDomain: isMultiTenant ? config.mcpBaseDomain : undefined,
        availableTools: "keycard-logo, whoami",
        architecture: "One MCP server instance per session (prevents race conditions)",
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