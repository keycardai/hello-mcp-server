# 🔐 Keycard Hello MCP Server

A **production-ready MCP server** demonstrating OAuth 2.0 authentication with Keycard's Security Token Service (STS). This project showcases best practices for building secure, type-safe, and modular MCP servers with enterprise-grade observability.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue)](https://typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green)](https://nodejs.org/)
[![MCP Protocol](https://img.shields.io/badge/MCP-2024--11--05-purple)](https://modelcontextprotocol.io/)
[![OAuth 2.0](https://img.shields.io/badge/OAuth-2.0-orange)](https://oauth.net/2/)

## 🎯 What This Demonstrates

- **🔒 OAuth 2.0 Authentication** - Secure authentication via Keycard STS
- **✨ Type Safety** - Full TypeScript with Zod runtime validation
- **🏗️ Modular Architecture** - Clean separation of concerns for easy extension
- **🚀 Production Ready** - Error handling, validation, and comprehensive logging
- **📚 Educational** - Well-documented code showing MCP best practices
- **🧪 Testing Framework** - Jest with coverage, integration tests, and watch modes
- **📊 Observability** - OpenTelemetry integration with traces and metrics

## 🚀 Quick Start

## 🏗️ Architecture

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│   Cursor    │───▶│  MCP Server  │───▶│ Keycard STS │
│    IDE      │    │ (localhost:  │    │             │
│             │    │     8888)    │    │             │
└─────────────┘    └──────────────┘    └─────────────┘
       │                   │                   │
   OAuth Flow          JWT Validation      Token Issuance
```

### 🔄 Authentication Flow

1. **Cursor** discovers OAuth endpoints from MCP server
2. **User** authenticates via Keycard STS (redirected to identity provider)
3. **Keycard STS** issues JWT access tokens
4. **MCP Server** validates tokens and grants access to tools

### Prerequisites

- **Node.js 18+** and **npm**
- **Cursor IDE** (or any MCP-compatible client)
- **Keycard account** with access to the Console
- **Configured Keycard zone** (for authentication)

### 1. Clone & Install

```bash
git clone https://github.com/keycardai/hello-mcp-server.git
cd hello-mcp-server
npm install
```

### 2. Configure Environment

Create a `.env` file:

```bash
# Required: Your Keycard STS issuer URL
KEYCARD_STS_ISSUER_URL=http://your-zone-id.sts.localdev.keycard.sh

# Optional: Server configuration
PORT=8888
HOST=localhost
```

💡 **Finding your Zone ID**: 
1. Log into the [Keycard Console](https://console.keycard.sh)
2. Navigate to **Zone Settings** 
3. Copy the **Zone ID** (e.g., `ziu95umjk27g7o55663swjipvd`)
4. Replace `your-zone-id` in your STS URL

> **Note**: Use the zone ID, not the zone name or label.

### 3. Start the Server

```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm run build && npm start
```

You should see:
```
🚀 Keycard Hello MCP Server started!
🔗 MCP Endpoint: http://localhost:8888/mcp
🔐 Using Keycard STS Issuer: http://your-zone-id.sts.localdev.keycard.sh
📋 Available tools: keycard-logo, whoami
💡 Connect via Cursor IDE or any MCP-compatible client
```

### 4. Configure Cursor IDE

Add to your Cursor MCP settings:

```json
{
  "mcpServers": {
    "keycard-hello-mcp": {
      "url": "http://localhost:8888/mcp"
    }
  }
}
```

### 5. Test Authentication

1. **Restart Cursor** to pick up the new MCP server
2. **Cursor will show "needs login"** for the server
3. **Click to authenticate** → complete OAuth flow
4. **Use the tools**: `keycard-logo`, `whoami`

## 🛠️ Available Tools

### `keycard-logo`
Displays the official Keycard ASCII art logo.

### `whoami`
Provides detailed information about the authenticated user including:
- Client ID and authentication scopes
- JWT payload with user information
- Token expiration and timing details
- Custom claims and metadata

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `KEYCARD_STS_ISSUER_URL` | Keycard STS issuer URL (use zone ID from Console) | - | ✅ |
| `PORT` | Server port | `8888` | |
| `HOST` | Server host | `localhost` | |
| `LOG_LEVEL` | Logging level | `INFO` | |
| `ENABLE_OTEL` | Enable OpenTelemetry | `true` | |
| `OTEL_SERVICE_NAME` | Service name for telemetry | `hello-mcp-server` | |
| `OTEL_ENVIRONMENT` | Environment for telemetry | `development` | |

### Observability

The server includes comprehensive observability features:

- **Structured Logging**: Environment-aware logging with trace correlation
- **Request Tracing**: Full distributed tracing with OpenTelemetry
- **Metrics Collection**: Performance and usage metrics
- **Health Checks**: Available at `/health`

In development, logs are formatted for console readability. In production, logs are sent to configured OTLP endpoints.

## 🏗️ Architecture

```
src/
├── config.ts              # Configuration management
├── index.ts               # Application entry point
├── server.ts              # Express server setup
├── middleware/            # Express middlewares
│   ├── auth.ts           # Authentication middleware
│   └── logging.ts        # Request logging and tracing
├── observability/         # Telemetry and logging
│   ├── logger.ts         # Structured logger
│   └── telemetry.ts      # OpenTelemetry setup
├── tools/                 # MCP tools
│   ├── index.ts          # Tool registration
│   ├── logo.ts           # Keycard logo tool
│   └── whoami.ts         # User information tool
└── types/                 # Type definitions
    ├── auth.ts           # Authentication types
    └── index.ts          # Exported types
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run integration tests
npm run test:integration

# Watch mode for development
npm run test:watch
```

## 📊 Code Quality

```bash
# Lint code
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format

# Check all (lint + format)
npm run check

# Fix all issues
npm run check:fix
```

## 🔗 MCP Integration

### Claude Desktop

Add to your Claude Desktop config:

```json
{
  "mcpServers": {
    "hello-mcp": {
      "command": "node",
      "args": ["path/to/hello-mcp/dist/index.js"],
      "env": {
        "KEYCARD_STS_ISSUER_URL": "http://your-zone-id.sts.localdev.keycard.sh"
      }
    }
  }
}
```

### Cursor IDE

1. Start the server: `npm run dev`
2. In Cursor, go to Settings > MCP Servers
3. Add server: `http://localhost:8888/mcp`

## 🚦 Health Checks

The server provides a health check endpoint at `/health`:

```bash
curl http://localhost:8888/health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "service": "hello-mcp-server",
  "version": "1.0.0"
}
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and quality checks
5. Submit a pull request

## 📄 License

Apache-2.0 License - see LICENSE file for details.