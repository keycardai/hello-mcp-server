# Hello MCP Server

A production-ready MCP (Model Context Protocol) server demonstrating Keycard's authentication and identity capabilities with enterprise-grade observability, testing, and development tooling.

## ✨ Features

- **🔐 OAuth Authentication**: Integration with Keycard STS for secure authentication
- **📊 Observability Stack**: OpenTelemetry integration with logs, traces, and metrics
- **🏗️ Advanced Architecture**: Structured logging, request tracing, and middleware system
- **🧪 Testing Framework**: Jest with coverage, integration tests, and watch modes
- **🔧 Code Quality**: Biome for linting, formatting, and code checking
- **⚡ Development Experience**: Hot reload, path resolution, comprehensive npm scripts

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- A Keycard account with access to the Console
- A configured Keycard zone (for authentication)

### Installation

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Configure your Keycard STS URL in .env
# Get your zone ID from the Keycard Console > Zone Settings
KEYCARD_STS_ISSUER_URL=http://your-zone-id.sts.localdev.keycard.sh
```

### Finding Your Zone ID

1. Log into the [Keycard Console](https://console.keycard.sh)
2. Navigate to **Zone Settings** 
3. Copy the **Zone ID** (e.g., `ziu95umjk27g7o55663swjipvd`)
4. Use it in your STS URL: `http://your-zone-id.sts.localdev.keycard.sh`

> **Note**: The zone ID is a unique identifier for your Keycard zone, not the zone name or label.

### Development

```bash
# Start development server with hot reload
npm run dev

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run integration tests
npm run test:integration

# Code quality checks
npm run lint
npm run format
npm run check
```

### Production

```bash
# Build the project
npm run build

# Start production server
npm start
```

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