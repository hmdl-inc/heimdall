<div align="center">
<img width="1200" height="475" alt="Heimdall Banner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />

# Heimdall

**Open Source Observability Platform for MCP Servers and AI Applications**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

</div>

## Overview

Heimdall is a comprehensive observability platform designed for monitoring Model Context Protocol (MCP) servers and AI/LLM applications. Built on OpenTelemetry standards, it provides real-time tracing, metrics, and insights into your AI infrastructure.

### Key Features

- 🔍 **Real-time Tracing** - Track every tool call, resource access, and prompt execution
- 📊 **Dashboard Analytics** - Visualize latency, error rates, and usage patterns
- 🔌 **Easy Integration** - Simple SDK decorators for Python and JavaScript/TypeScript
- 🏠 **Self-hosted** - Run entirely on your own infrastructure
- 📈 **OpenTelemetry Native** - Built on industry-standard observability protocols

## Architecture

```
┌─────────────────┐     OTLP/HTTP      ┌─────────────────┐
│   MCP Server    │ ──────────────────▶│  Heimdall       │
│   + SDK         │    Port 4318       │  Backend        │
└─────────────────┘                    └────────┬────────┘
                                                │
                                                │ REST API
                                                │
                                       ┌────────▼────────┐
                                       │  Heimdall       │
                                       │  Frontend       │
                                       │  Port 5173      │
                                       └─────────────────┘
```

## Quick Start

> 📖 For detailed setup instructions, see [QUICKSTART.md](./QUICKSTART.md)

### Prerequisites

- Node.js 18+
- Python 3.9+ (for Python SDK)

### 1. Start the Backend

```bash
cd backend
npm install
npm run dev
```

### 2. Start the Frontend

```bash
cd frontend
npm install
npm run dev
```

### 3. Open the Dashboard

Navigate to http://localhost:5173 and create an account.

## SDK Integration

Heimdall provides SDKs for instrumenting your MCP servers:

| SDK | Package | Installation |
|-----|---------|--------------|
| Python | `hmdl` | `pip install -e ../heimdall-python` |
| JavaScript/TypeScript | `hmdl` | `npm install ../heimdall-js` |

### Python Example

```python
import os
os.environ["HEIMDALL_ENDPOINT"] = "http://localhost:4318"
os.environ["HEIMDALL_PROJECT_ID"] = "your-project-id"
os.environ["HEIMDALL_ENABLED"] = "true"

from hmdl import HeimdallClient, trace_mcp_tool

client = HeimdallClient()

@trace_mcp_tool()
def my_tool(query: str) -> dict:
    return {"result": "success"}

result = my_tool("test")
client.flush()
```

### JavaScript/TypeScript Example

```typescript
import { HeimdallClient, traceMCPTool } from 'hmdl';

process.env.HEIMDALL_ENDPOINT = "http://localhost:4318";
process.env.HEIMDALL_PROJECT_ID = "your-project-id";
process.env.HEIMDALL_ENABLED = "true";

const client = new HeimdallClient();

const myTool = traceMCPTool(
  async (query: string) => ({ result: "success" }),
  { name: "my-tool" }
);

await myTool("test");
await client.flush();
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `HEIMDALL_ENDPOINT` | Backend OTLP endpoint | `http://localhost:4318` |
| `HEIMDALL_PROJECT_ID` | Project ID for trace grouping | `default` |
| `HEIMDALL_ENABLED` | Enable/disable tracing | `true` |
| `HEIMDALL_SERVICE_NAME` | Service name in traces | `mcp-server` |
| `HEIMDALL_ENVIRONMENT` | Environment tag | `development` |

## Project Structure

```
heimdall/
├── backend/          # OTLP receiver and API server
├── frontend/         # React dashboard
├── tests/            # SDK integration tests
├── QUICKSTART.md     # Detailed setup guide
└── README.md         # This file

heimdall-python/      # Python SDK
heimdall-js/          # JavaScript/TypeScript SDK
```

## Running Tests

Test the SDK integration with the backend:

```bash
# Python SDK test
cd tests
source .venv/bin/activate
python test_python_sdk.py

# JavaScript SDK test
cd tests
npm run test:js
```

## Documentation

- [Quick Start Guide](./QUICKSTART.md) - Get up and running in 5 minutes
- [Python SDK README](../heimdall-python/README.md) - Python SDK documentation
- [JavaScript SDK README](../heimdall-js/README.md) - JavaScript SDK documentation

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
