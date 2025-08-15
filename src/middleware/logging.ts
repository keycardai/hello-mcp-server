import { randomUUID } from "node:crypto";
import { type Context, context, propagation, SpanKind, trace } from "@opentelemetry/api";
import type { NextFunction, Request, Response } from "express";
import { createMcpLogger, type IMcpLogger } from "../observability/logger";
import { getSessionIdFromHeaders } from "../types/index";

export interface RequestContext {
  requestId: string;
  sessionId?: string;
  traceId?: string;
  spanId?: string;
  otelContext?: Context;
  logger: IMcpLogger;
}

declare global {
  namespace Express {
    interface Request {
      context: RequestContext;
      requestStartTime: number;
    }
  }
}

export function createLoggingMiddleware(operation: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    req.requestStartTime = Date.now();

    const parentContext = propagation.extract(context.active(), req.headers);
    const activeSpan = trace.getSpan(parentContext);
    let requestId: string;
    let traceId: string | undefined;
    let spanId: string | undefined;

    if (activeSpan) {
      const spanContext = activeSpan.spanContext();
      traceId = spanContext.traceId;
      spanId = spanContext.spanId;

      const baggage = propagation.getBaggage(parentContext);
      requestId = baggage?.getEntry("requestId")?.value || randomUUID().substring(0, 8);
    } else {
      requestId = randomUUID().substring(0, 8);
    }

    const sessionId = getSessionIdFromHeaders(req.headers);
    const logger = createMcpLogger(sessionId, requestId, undefined, operation);

    req.context = {
      requestId,
      sessionId,
      traceId,
      spanId,
      otelContext: parentContext,
      logger,
    };

    const tracer = trace.getTracer("mcp-server-middleware");
    const span = tracer.startSpan(
      `${req.method} ${req.route?.path || req.url}`,
      {
        kind: SpanKind.SERVER,
        attributes: {
          "http.method": req.method,
          "http.url": req.url,
          "http.route": req.route?.path || req.url,
          "http.user_agent": req.headers["user-agent"] || "",
          "mcp.operation": operation,
          "mcp.session_id": sessionId || "",
          "mcp.request_id": requestId,
        },
      },
      parentContext
    );

    const activeContext = trace.setSpan(parentContext, span);

    req.context.logger.debug("Incoming request", {
      method: req.method,
      url: req.url,
      contentType: req.headers["content-type"],
      contentLength: req.headers["content-length"],
      userAgent: req.headers["user-agent"],
      hasSessionId: !!sessionId,
      traceId: req.context.traceId,
      spanId: req.context.spanId,
      operation,
      hasParentContext: !!activeSpan,
    });

    res.on("finish", () => {
      const duration = Date.now() - req.requestStartTime;

      if (span) {
        span.setAttributes({
          "http.status_code": res.statusCode,
          "http.response.duration_ms": duration,
        });

        if (res.statusCode >= 400) {
          span.recordException(new Error(`HTTP ${res.statusCode}`));
        }

        span.end();
      }

      req.context.logger.debug("Response finished", {
        statusCode: res.statusCode,
        requestDuration: `${duration}ms`,
        traceId: req.context.traceId,
      });
    });

    res.on("close", () => {
      req.context.logger.debug("Response closed", { traceId: req.context.traceId });
    });

    res.on("error", (error) => {
      if (span) {
        span.recordException(error);
        span.setStatus({ code: 2, message: error.message });
      }

      req.context.logger.error("Response error", {
        error: error.message,
        stack: error.stack,
        traceId: req.context.traceId,
      });
    });

    context.with(activeContext, () => {
      next();
    });
  };
}

export const httpLoggingMiddleware = createLoggingMiddleware("http_request");
export const mcpLoggingMiddleware = createLoggingMiddleware("mcp_request");
export const generalLoggingMiddleware = createLoggingMiddleware("general");

export function getCurrentRequestContext(req: Request) {
  return req.context;
}