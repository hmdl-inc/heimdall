#!/usr/bin/env python3
"""
Test script for Heimdall Python SDK integration with backend and frontend.

Usage:
    cd heimdall/tests
    python3 -m venv .venv
    source .venv/bin/activate
    pip install -e ../../heimdall-python
    python test_python_sdk.py [project_id]
"""

import os
import sys
import time
import random

# Get project ID from command line or use default
PROJECT_ID = sys.argv[1] if len(sys.argv) > 1 else "test-python-sdk"

# Set environment variables for local development
os.environ["HEIMDALL_ENDPOINT"] = "http://localhost:4318"
os.environ["HEIMDALL_ENABLED"] = "true"
os.environ["HEIMDALL_PROJECT_ID"] = PROJECT_ID
os.environ["HEIMDALL_SERVICE_NAME"] = "python-sdk-test"
os.environ["HEIMDALL_ENVIRONMENT"] = "test"

# Import the SDK
from hmdl import HeimdallClient, trace_mcp_tool

# Initialize the client
client = HeimdallClient()

print("=" * 60)
print("Heimdall Python SDK Integration Test")
print("=" * 60)
print(f"Endpoint: {client.config.endpoint}")
print(f"Project ID: {client.config.project_id}")
print(f"Service: {client.config.service_name}")
print()


@trace_mcp_tool(name="search-tool")
def search_tool(query: str, limit: int = 10) -> dict:
    """Search tool for finding documents."""
    time.sleep(random.uniform(0.05, 0.15))
    results = [
        {"id": i, "title": f"Result {i} for '{query}'", "score": random.uniform(0.7, 1.0)}
        for i in range(min(limit, 5))
    ]
    return {"query": query, "total_results": len(results), "results": results}


@trace_mcp_tool(name="calculator")
def calculator(expression: str) -> dict:
    """Calculator tool for evaluating expressions."""
    time.sleep(random.uniform(0.03, 0.1))
    try:
        result = eval(expression)
        return {"expression": expression, "result": result, "status": "success"}
    except Exception as e:
        return {"expression": expression, "error": str(e), "status": "error"}


@trace_mcp_tool(name="weather-tool")
def get_weather(city: str) -> dict:
    """Weather tool for getting weather information."""
    time.sleep(random.uniform(0.05, 0.1))
    return {
        "city": city,
        "temperature": random.randint(15, 30),
        "condition": random.choice(["sunny", "cloudy", "rainy"]),
        "humidity": random.randint(40, 80)
    }


@trace_mcp_tool(name="translate-tool")
def translate(text: str, target_lang: str) -> dict:
    """Translation tool for translating text."""
    time.sleep(random.uniform(0.05, 0.1))
    return {
        "original": text,
        "translated": f"[{target_lang}] {text}",
        "target_language": target_lang
    }


@trace_mcp_tool(name="summarize-tool")
def summarize(content: str, max_length: int = 100) -> dict:
    """Summarization tool for summarizing content."""
    time.sleep(random.uniform(0.05, 0.1))
    summary = content[:max_length] + "..." if len(content) > max_length else content
    return {
        "original_length": len(content),
        "summary": summary,
        "summary_length": len(summary)
    }


def main():
    """Run test operations to generate traces."""
    operations = [
        ("Search Tool", lambda: search_tool("test query", limit=3)),
        ("Calculator", lambda: calculator("10 * 5 + 2")),
        ("Weather Tool", lambda: get_weather("San Francisco")),
        ("Translate Tool", lambda: translate("Hello world", "es")),
        ("Summarize Tool", lambda: summarize("This is a long text that needs to be summarized.", 20)),
    ]

    success_count = 0
    for name, operation in operations:
        print(f"Running: {name}...")
        try:
            result = operation()
            print(f"  ✓ Success: {str(result)[:60]}...")
            success_count += 1
        except Exception as e:
            print(f"  ✗ Error: {e}")
        print()

    # Flush traces
    print("Flushing traces...")
    client.flush()
    time.sleep(1)

    print()
    print("=" * 60)
    print(f"Test completed! {success_count}/{len(operations)} operations succeeded.")
    print(f"Project ID: {PROJECT_ID}")
    print()
    print("To view traces:")
    print("  1. Open http://localhost:5173")
    print("  2. Go to Settings -> Link SDK Project")
    print(f"  3. Link project '{PROJECT_ID}'")
    print("  4. Go to Tracing to see the traces")
    print("=" * 60)


if __name__ == "__main__":
    main()

