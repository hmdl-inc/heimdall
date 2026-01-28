/**
 * Test script for Heimdall JavaScript SDK integration with backend and frontend.
 * 
 * Usage:
 *   cd heimdall/tests
 *   npm install
 *   npx tsx test_js_sdk.ts [project_id]
 */

// Get project ID from command line or use default
const PROJECT_ID = process.argv[2] || "test-js-sdk";

// Set environment variables for local development
process.env.HEIMDALL_ENDPOINT = "http://localhost:4318";
process.env.HEIMDALL_ENABLED = "true";
process.env.HEIMDALL_PROJECT_ID = PROJECT_ID;
process.env.HEIMDALL_SERVICE_NAME = "js-sdk-test";
process.env.HEIMDALL_ENVIRONMENT = "test";

import { HeimdallClient, traceMCPTool, traceMCPResource, traceMCPPrompt, observe } from "hmdl";

// Initialize the client
const client = new HeimdallClient();

console.log("=".repeat(60));
console.log("Heimdall JavaScript SDK Integration Test");
console.log("=".repeat(60));
console.log(`Project ID: ${PROJECT_ID}`);
console.log();

// Helper for random delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const randomDelay = () => delay(Math.random() * 100 + 30);

// Test MCP Tool - Search
const searchTool = traceMCPTool(
  async (query: string, limit: number = 10) => {
    await randomDelay();
    const results = Array.from({ length: Math.min(limit, 5) }, (_, i) => ({
      id: i,
      title: `Result ${i} for '${query}'`,
      score: Math.random() * 0.3 + 0.7
    }));
    return { query, total_results: results.length, results };
  },
  { name: "test-search-tool" }
);

// Test MCP Tool - Calculator
const calculator = traceMCPTool(
  async (expression: string) => {
    await randomDelay();
    try {
      const result = eval(expression);
      return { expression, result, status: "success" };
    } catch (e) {
      return { expression, error: String(e), status: "error" };
    }
  },
  { name: "test-calculator" }
);

// Test MCP Resource - File Reader
const readFile = traceMCPResource(
  async (uri: string) => {
    await randomDelay();
    return `Content of file: ${uri}`;
  },
  { name: "test-file-reader" }
);

// Test MCP Prompt - Code Generator
const generatePrompt = traceMCPPrompt(
  async (language: string, task: string) => {
    await randomDelay();
    return [
      { role: "system", content: `You are an expert ${language} programmer.` },
      { role: "user", content: `Write ${language} code to: ${task}` }
    ];
  },
  { name: "test-code-gen" }
);

// Test nested operation
const processData = observe(
  async (data: Record<string, unknown>) => {
    await randomDelay();
    return { original: data, processed_at: Date.now(), status: "processed" };
  },
  { name: "test-process-data" }
);

async function main() {
  const operations = [
    { name: "Search Tool", fn: () => searchTool("test query", 3) },
    { name: "Calculator", fn: () => calculator("10 * 5 + 2") },
    { name: "File Reader", fn: () => readFile("file://test/readme.md") },
    { name: "Prompt Generator", fn: () => generatePrompt("TypeScript", "sort list") },
    { name: "Process Data", fn: () => processData({ test: "data" }) },
  ];

  let successCount = 0;
  for (const { name, fn } of operations) {
    console.log(`Running: ${name}...`);
    try {
      const result = await fn();
      console.log(`  ✓ Success: ${JSON.stringify(result).slice(0, 60)}...`);
      successCount++;
    } catch (e) {
      console.log(`  ✗ Error: ${e}`);
    }
    console.log();
  }

  // Flush traces
  console.log("Flushing traces...");
  await client.flush();
  await delay(1000);

  console.log();
  console.log("=".repeat(60));
  console.log(`Test completed! ${successCount}/${operations.length} operations succeeded.`);
  console.log(`Project ID: ${PROJECT_ID}`);
  console.log();
  console.log("To view traces:");
  console.log("  1. Open http://localhost:5173");
  console.log("  2. Go to Settings -> Link SDK Project");
  console.log(`  3. Link project '${PROJECT_ID}'`);
  console.log("  4. Go to Tracing to see the traces");
  console.log("=".repeat(60));

  await client.shutdown();
}

main().catch(console.error);

