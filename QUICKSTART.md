# Heimdall Quick Start Guide

Get started with Heimdall observability for your MCP servers in 5 minutes.

## Prerequisites

- Node.js 18+
- Python 3.9+ (for Python SDK)

## 1. Start the Heimdall Stack

### Backend Server (Port 4318)

```bash
cd heimdall/backend
npm install
npm run dev
```

### Frontend Dashboard (Port 5173)

```bash
cd heimdall/frontend
npm install
npm run dev
```

Open http://localhost:5173 in your browser.

## 2. Create a Project

1. Sign up or log in to the Heimdall dashboard
2. Create an organization and project
3. Go to **Settings** to find your **Project ID**

## 3. Install the SDK

### Python

```bash
pip install -e ./heimdall-python
# Or when published: pip install hmdl
```

### JavaScript/TypeScript

```bash
npm install ./heimdall-js
# Or when published: npm install hmdl
```

## 4. Configure Your MCP Server

Set these environment variables:

```bash
export HEIMDALL_ENDPOINT="http://localhost:4318"
export HEIMDALL_ORG_ID="your-org-id"          # From Settings page
export HEIMDALL_PROJECT_ID="your-project-id"  # From Settings page
export HEIMDALL_ENABLED="true"
```

### Python Example

```python
import os
os.environ["HEIMDALL_ENDPOINT"] = "http://localhost:4318"
os.environ["HEIMDALL_ORG_ID"] = "your-org-id"
os.environ["HEIMDALL_PROJECT_ID"] = "your-project-id"
os.environ["HEIMDALL_ENABLED"] = "true"

from hmdl import HeimdallClient, trace_mcp_tool

client = HeimdallClient()

@trace_mcp_tool()
def my_mcp_tool(query: str, limit: int = 10) -> dict:
    # Your tool logic here
    return {"result": "success", "query": query, "limit": limit}

# Run your tool
result = my_mcp_tool("test query", limit=5)

# Flush traces before exit
client.flush()
```

> **Note**: Python SDK automatically captures parameter names using introspection, so inputs are displayed as `{"query": "test query", "limit": 5}`.

### JavaScript Example

```typescript
import { HeimdallClient, traceMCPTool } from 'hmdl';

process.env.HEIMDALL_ENDPOINT = "http://localhost:4318";
process.env.HEIMDALL_ORG_ID = "your-org-id";
process.env.HEIMDALL_PROJECT_ID = "your-project-id";
process.env.HEIMDALL_ENABLED = "true";

const client = new HeimdallClient();

const myMCPTool = traceMCPTool(
  async (query: string, limit: number = 10) => {
    // Your tool logic here
    return { result: "success", query, limit };
  },
  { name: "my-mcp-tool", paramNames: ["query", "limit"] }
);

// Run your tool
await myMCPTool("test query", 5);

// Flush traces before exit
await client.flush();
```

> **Note**: Use the `paramNames` option to display inputs as named objects (e.g., `{"query": "test query", "limit": 5}`) instead of arrays (`["test query", 5]`).

## 5. View Traces

1. Go to the Heimdall dashboard at http://localhost:5173
2. Navigate to **Settings** → **Link SDK Project**
3. Click **Link** next to your SDK project to view its traces
4. Go to **Tracing** to see all your traces

## Linking Existing SDK Traces

If you already have traces from an SDK with a different project ID:

1. Go to **Settings** in the dashboard
2. Scroll to **Link SDK Project**
3. You'll see all projects that have SDK traces
4. Click **Link** to connect that project's traces to your dashboard

## Running the Tests

### Python SDK Test

```bash
cd heimdall/tests
python3 -m venv .venv
source .venv/bin/activate
pip install -e ../../heimdall-python
python test_python_sdk.py
```

### JavaScript SDK Test

```bash
cd heimdall/tests
npm install
npm run test:js
```

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

## Need Help?

- Check the SDK READMEs for detailed configuration options:
  - [Python SDK](../heimdall-python/README.md)
  - [JavaScript SDK](../heimdall-js/README.md)
- View test code in the `heimdall/tests/` directory

