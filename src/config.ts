import "dotenv/config";

/**
 * Server configuration interface
 */
export interface ServerConfig {
  port: string;
  host: string;
  baseUrl: string;
  keycardStsIssuerUrl: string;
  issuerBaseDomain: string;
  mcpBaseDomain: string;
  observability: {
    serviceName: string;
    serviceVersion: string;
    environment: string;
    enableOtel: boolean;
    otlpEndpoint: string;
  };
}

/**
 * Validates and returns the server configuration
 *
 * This function:
 * - Loads environment variables using dotenv
 * - Validates required configuration values
 * - Provides sensible defaults for optional values
 * - Throws descriptive errors for missing required values
 *
 * @returns Validated server configuration
 * @throws Error if required environment variables are missing
 */
export function getConfig(): ServerConfig {
  const PORT = process.env.PORT || "8888";
  const HOST = process.env.HOST || "localhost";
  // Use HTTPS for production, HTTP for local development
  const NODE_ENV = process.env.NODE_ENV || "development";
  const isProduction = NODE_ENV === "production";
  const protocol = isProduction ? "https" : "http";
  const BASE_URL = isProduction ? `${protocol}://${HOST}` : `${protocol}://${HOST}:${PORT}`;
  const KEYCARD_STS_ISSUER_URL = process.env.KEYCARD_STS_ISSUER_URL;
  const ISSUER_BASE_DOMAIN = process.env.ISSUER_BASE_DOMAIN;
  const MCP_BASE_DOMAIN = process.env.MCP_BASE_DOMAIN;

  const SERVICE_NAME = process.env.OTEL_SERVICE_NAME || "hello-mcp-server";
  const SERVICE_VERSION = process.env.OTEL_SERVICE_VERSION || "1.0.0";
  const ENVIRONMENT = process.env.OTEL_ENVIRONMENT || process.env.NODE_ENV || "development";
  const ENABLE_OTEL = process.env.ENABLE_OTEL !== "false";
  const OTLP_ENDPOINT = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || "http://localhost:4318";

  // For backward compatibility, KEYCARD_STS_ISSUER_URL is still required in single-tenant mode
  // In multi-tenant mode, ISSUER_BASE_DOMAIN and MCP_BASE_DOMAIN are required
  const isMultiTenant = ISSUER_BASE_DOMAIN && MCP_BASE_DOMAIN;
  
  if (!isMultiTenant && !KEYCARD_STS_ISSUER_URL) {
    throw new Error(
      "❌ FATAL: Either KEYCARD_STS_ISSUER_URL (single-tenant) or ISSUER_BASE_DOMAIN + MCP_BASE_DOMAIN (multi-tenant) must be defined.\n" +
        "💡 Single-tenant example:\n" +
        "   KEYCARD_STS_ISSUER_URL=http://default-zone-abc123.sts.localdev.keycard.sh\n" +
        "💡 Multi-tenant example:\n" +
        "   ISSUER_BASE_DOMAIN=sts.localdev.keycard.sh\n" +
        "   MCP_BASE_DOMAIN=mcp.localdev.keycard.sh"
    );
  }
  
  if (isMultiTenant && (!ISSUER_BASE_DOMAIN || !MCP_BASE_DOMAIN)) {
    throw new Error(
      "❌ FATAL: For multi-tenant mode, both ISSUER_BASE_DOMAIN and MCP_BASE_DOMAIN are required.\n" +
        "💡 Example:\n" +
        "   ISSUER_BASE_DOMAIN=sts.localdev.keycard.sh\n" +
        "   MCP_BASE_DOMAIN=mcp.localdev.keycard.sh"
    );
  }

  return {
    port: PORT,
    host: HOST,
    baseUrl: BASE_URL,
    keycardStsIssuerUrl: KEYCARD_STS_ISSUER_URL || '', // Fallback for multi-tenant mode
    issuerBaseDomain: ISSUER_BASE_DOMAIN || '',
    mcpBaseDomain: MCP_BASE_DOMAIN || '',
    observability: {
      serviceName: SERVICE_NAME,
      serviceVersion: SERVICE_VERSION,
      environment: ENVIRONMENT,
      enableOtel: ENABLE_OTEL,
      otlpEndpoint: OTLP_ENDPOINT,
    },
  };
}

export const config = getConfig();