import process from "node:process";
import { context, trace } from "@opentelemetry/api";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { Resource } from "@opentelemetry/resources";
import { LoggerProvider, SimpleLogRecordProcessor } from "@opentelemetry/sdk-logs";
import { NodeSDK } from "@opentelemetry/sdk-node";

const resource = new Resource({
  "service.name": process.env.OTEL_SERVICE_NAME || "hello-mcp-server",
  "service.version": process.env.OTEL_SERVICE_VERSION || "1.0.0",
  "deployment.environment": process.env.OTEL_ENVIRONMENT || "development",
});

const loggerProvider = new LoggerProvider({
  resource,
});

const isDevelopment =
  process.env.NODE_ENV === "localdev" || !process.env.OTEL_EXPORTER_OTLP_LOGS_ENDPOINT;

if (!isDevelopment) {
  const otlpExporter = new OTLPLogExporter({
    url: process.env.OTEL_EXPORTER_OTLP_LOGS_ENDPOINT,
  });
  loggerProvider.addLogRecordProcessor(new SimpleLogRecordProcessor(otlpExporter));
  console.log(`📊 Production mode: Logs sent to ${process.env.OTEL_EXPORTER_OTLP_LOGS_ENDPOINT}`);
} else {
  console.log("📝 Development mode: Clean console logs enabled");
}

const logger = loggerProvider.getLogger("mcp-server-logger");

function createCleanConsoleLogger() {
  const formatMessage = (
    level: string,
    message: string,
    attributes: Record<string, unknown> = {}
  ) => {
    const timestamp = new Date().toISOString().slice(11, 23);
    const levelIcon =
      {
        DEBUG: "🐛",
        INFO: "ℹ️ ",
        WARN: "⚠️ ",
        ERROR: "❌",
      }[level] || "📝";

    // Filter out repetitive base attributes for cleaner output
    const baseAttributesToFilter = ['service', 'version', 'environment', 'operation'];
    const filteredAttributes = Object.fromEntries(
      Object.entries(attributes).filter(([key]) => !baseAttributesToFilter.includes(key))
    );
    
    const attrs = Object.keys(filteredAttributes).length > 0 ? ` ${JSON.stringify(filteredAttributes)}` : "";

    return `${timestamp} ${levelIcon} ${message}${attrs}`;
  };

  return {
    info: (message: string, attributes: Record<string, unknown> = {}) =>
      console.log(formatMessage("INFO", message, attributes)),
    error: (message: string, attributes: Record<string, unknown> = {}) =>
      console.error(formatMessage("ERROR", message, attributes)),
    warn: (message: string, attributes: Record<string, unknown> = {}) =>
      console.warn(formatMessage("WARN", message, attributes)),
    debug: (message: string, attributes: Record<string, unknown> = {}) =>
      console.log(formatMessage("DEBUG", message, attributes)),
  };
}

function createOtelLogger() {
  return {
    info: (message: string, attributes: Record<string, unknown> = {}) => {
      const activeSpan = trace.getSpan(context.active());
      const traceId = activeSpan ? activeSpan.spanContext().traceId : "no-trace-id";
      logger.emit({
        body: message,
        severityText: "INFO",
        attributes: { ...attributes, traceId },
      });
    },
    error: (message: string, attributes: Record<string, unknown> = {}) => {
      const activeSpan = trace.getSpan(context.active());
      const traceId = activeSpan ? activeSpan.spanContext().traceId : "no-trace-id";
      logger.emit({
        body: message,
        severityText: "ERROR",
        attributes: { ...attributes, traceId },
      });
    },
    warn: (message: string, attributes: Record<string, unknown> = {}) => {
      const activeSpan = trace.getSpan(context.active());
      const traceId = activeSpan ? activeSpan.spanContext().traceId : "no-trace-id";
      logger.emit({
        body: message,
        severityText: "WARN",
        attributes: { ...attributes, traceId },
      });
    },
    debug: (message: string, attributes: Record<string, unknown> = {}) => {
      const activeSpan = trace.getSpan(context.active());
      const traceId = activeSpan ? activeSpan.spanContext().traceId : "no-trace-id";
      logger.emit({
        body: message,
        severityText: "DEBUG",
        attributes: { ...attributes, traceId },
      });
    },
  };
}

export const customLogger = isDevelopment ? createCleanConsoleLogger() : createOtelLogger();

const traceExporter = process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT
  ? new OTLPTraceExporter({
      url: process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT,
    })
  : undefined;

const sdk = new NodeSDK({
  ...(traceExporter && { traceExporter }),
  instrumentations: [
    getNodeAutoInstrumentations({
      "@opentelemetry/instrumentation-fs": {
        enabled: false,
      },
    }),
  ],
  resource,
});

let isInitialized = false;

export function initializeTelemetry(): void {
  if (isInitialized) {
    return;
  }

  sdk.start();
  isInitialized = true;

  process.on("SIGTERM", () => {
    sdk
      .shutdown()
      .then(() => customLogger.info("Telemetry shutdown complete"))
      .finally(() => process.exit(0));
  });
}

export async function shutdownTelemetry(): Promise<void> {
  if (isInitialized) {
    await sdk.shutdown();
    isInitialized = false;
  }
}

export { customLogger as logger };