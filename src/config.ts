import "dotenv/config";

/**
 * Server configuration interface
 */
export interface ServerConfig {
  port: string;
  host: string;
  baseUrl: string;
  keycardStsIssuerUrl: string;
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
  const BASE_URL = `http://${HOST}:${PORT}`;
  const KEYCARD_STS_ISSUER_URL = process.env.KEYCARD_STS_ISSUER_URL;

  const SERVICE_NAME = process.env.OTEL_SERVICE_NAME || "hello-mcp-server";
  const SERVICE_VERSION = process.env.OTEL_SERVICE_VERSION || "1.0.0";
  const ENVIRONMENT = process.env.OTEL_ENVIRONMENT || process.env.NODE_ENV || "development";
  const ENABLE_OTEL = process.env.ENABLE_OTEL !== "false";
  const OTLP_ENDPOINT = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || "http://localhost:4318";

  if (!KEYCARD_STS_ISSUER_URL) {
    throw new Error(
      "❌ FATAL: KEYCARD_STS_ISSUER_URL is not defined in your .env file.\n" +
        "💡 Please set this to your Keycard STS URL, for example:\n" +
        "   KEYCARD_STS_ISSUER_URL=http://default-zone-abc123.sts.localdev.keycard.sh"
    );
  }

  return {
    port: PORT,
    host: HOST,
    baseUrl: BASE_URL,
    keycardStsIssuerUrl: KEYCARD_STS_ISSUER_URL,
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