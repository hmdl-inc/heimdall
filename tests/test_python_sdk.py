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
from hmdl import HeimdallClient, trace_mcp_tool, trace_mcp_resource, trace_mcp_prompt, observe

# Initialize the client
client = HeimdallClient()

print("=" * 60)
print("Heimdall Python SDK Integration Test")
print("=" * 60)
print(f"Endpoint: {client.config.endpoint}")
print(f"Project ID: {client.config.project_id}")
print(f"Service: {client.config.service_name}")
print()


@trace_mcp_tool(name="test-search-tool")
def search_tool(query: str, limit: int = 10) -> dict:
    """Test search tool."""
    time.sleep(random.uniform(0.05, 0.15))
    results = [
        {"id": i, "title": f"Result {i} for '{query}'", "score": random.uniform(0.7, 1.0)}
        for i in range(min(limit, 5))
    ]
    return {"query": query, "total_results": len(results), "results": results}


@trace_mcp_tool(name="test-calculator")
def calculator(expression: str) -> dict:
    """Test calculator tool."""
    time.sleep(random.uniform(0.03, 0.1))
    try:
        result = eval(expression)
        return {"expression": expression, "result": result, "status": "success"}
    except Exception as e:
        return {"expression": expression, "error": str(e), "status": "error"}


@trace_mcp_resource(name="test-file-reader")
def read_file(uri: str) -> str:
    """Test file reader resource."""
    time.sleep(random.uniform(0.03, 0.1))
    return f"Content of file: {uri}"


@trace_mcp_prompt(name="test-code-gen")
def generate_prompt(language: str, task: str) -> list:
    """Test prompt generator."""
    time.sleep(random.uniform(0.02, 0.05))
    return [
        {"role": "system", "content": f"You are an expert {language} programmer."},
        {"role": "user", "content": f"Write {language} code to: {task}"}
    ]


@observe(name="test-process-data")
def process_data(data: dict) -> dict:
    """Test data processing."""
    time.sleep(random.uniform(0.05, 0.1))
    return {"original": data, "processed_at": time.time(), "status": "processed"}


def main():
    """Run test operations to generate traces."""
    operations = [
        ("Search Tool", lambda: search_tool("test query", limit=3)),
        ("Calculator", lambda: calculator("10 * 5 + 2")),
        ("File Reader", lambda: read_file("file://test/readme.md")),
        ("Prompt Generator", lambda: generate_prompt("Python", "sort list")),
        ("Process Data", lambda: process_data({"test": "data"})),
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

