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

import { HeimdallClient, traceMCPTool } from "hmdl";

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
  { name: "search-tool", paramNames: ["query", "limit"] }
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
  { name: "calculator", paramNames: ["expression"] }
);

// Test MCP Tool - Weather
const getWeather = traceMCPTool(
  async (city: string) => {
    await randomDelay();
    return {
      city,
      temperature: Math.floor(Math.random() * 15) + 15,
      condition: ["sunny", "cloudy", "rainy"][Math.floor(Math.random() * 3)],
      humidity: Math.floor(Math.random() * 40) + 40
    };
  },
  { name: "weather-tool", paramNames: ["city"] }
);

// Test MCP Tool - Translate
const translate = traceMCPTool(
  async (text: string, targetLang: string) => {
    await randomDelay();
    return {
      original: text,
      translated: `[${targetLang}] ${text}`,
      target_language: targetLang
    };
  },
  { name: "translate-tool", paramNames: ["text", "target_language"] }
);

// Test MCP Tool - Summarize
const summarize = traceMCPTool(
  async (content: string, maxLength: number = 100) => {
    await randomDelay();
    const summary = content.length > maxLength ? content.slice(0, maxLength) + "..." : content;
    return {
      original_length: content.length,
      summary,
      summary_length: summary.length
    };
  },
  { name: "summarize-tool", paramNames: ["content", "max_length"] }
);

async function main() {
  const operations = [
    { name: "Search Tool", fn: () => searchTool("test query", 3) },
    { name: "Calculator", fn: () => calculator("10 * 5 + 2") },
    { name: "Weather Tool", fn: () => getWeather("San Francisco") },
    { name: "Translate Tool", fn: () => translate("Hello world", "es") },
    { name: "Summarize Tool", fn: () => summarize("This is a long text that needs to be summarized.", 20) },
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

