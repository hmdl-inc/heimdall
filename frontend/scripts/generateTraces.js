import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { randomUUID } from 'crypto';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const randomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// Sample inputs and outputs for realistic dummy data
const sampleQueries = [
  "What is the capital of France?",
  "Explain quantum computing in simple terms",
  "Write a Python function to sort a list",
  "How do I center a div in CSS?",
  "What are the benefits of microservices?",
  "Summarize the latest news about AI",
  "Calculate the compound interest for $10,000",
  "Generate an image of a sunset over mountains",
  "What is the weather forecast for tomorrow?",
  "Translate 'hello world' to Japanese",
  "Debug this code snippet",
  "What's the best way to learn React?",
  "Explain the difference between REST and GraphQL",
  "How do neural networks work?",
  "Write a SQL query to join two tables"
];

const sampleOutputs = [
  "The capital of France is Paris. Paris is the largest city in France and serves as the country's political, economic, and cultural center.",
  "Quantum computing uses quantum bits (qubits) that can exist in multiple states simultaneously, enabling parallel processing of complex calculations.",
  "```python\ndef sort_list(items):\n    return sorted(items)\n```",
  "Use flexbox: `display: flex; justify-content: center; align-items: center;` on the parent container.",
  "Microservices offer scalability, independent deployment, technology flexibility, and easier maintenance of individual components.",
  "Recent AI developments include advances in large language models, multimodal AI systems, and improved reasoning capabilities.",
  "With 5% annual interest compounded monthly over 10 years, $10,000 grows to approximately $16,470.",
  "[Generated image: A beautiful sunset with orange and purple hues over mountain silhouettes]",
  "Tomorrow's forecast: Partly cloudy with a high of 72°F (22°C) and a low of 58°F (14°C).",
  "Translation: 'こんにちは世界' (Konnichiwa sekai)",
  "Found the issue: missing semicolon on line 42. Here's the corrected code...",
  "I recommend starting with the official React documentation, then building small projects to practice.",
  "REST uses HTTP methods and URLs for resources, while GraphQL uses a single endpoint with queries for flexible data fetching.",
  "Neural networks consist of layers of interconnected nodes that process inputs through weighted connections and activation functions.",
  "```sql\nSELECT * FROM users u\nJOIN orders o ON u.id = o.user_id\n```"
];

function generateSpans(traceId, toolName, startTime, totalLatency, isError) {
  const spans = [];
  const rootSpanId = randomUUID();
  
  const query = randomItem(sampleQueries);
  const output = isError ? `Error: Failed to process request` : randomItem(sampleOutputs);

  // Root span (the trace itself)
  const rootSpan = {
    span_id: rootSpanId,
    name: toolName.replace('_', '-'),
    type: 'TRACE',
    start_time: startTime.toISOString(),
    end_time: new Date(startTime.getTime() + totalLatency).toISOString(),
    latency_ms: totalLatency,
    status: isError ? 'ERROR' : 'OK',
    input: query,
    output: output,
    metadata: {
      model: randomItem(['gpt-4', 'gpt-4-turbo', 'claude-3-opus', 'claude-3-sonnet']),
      temperature: (Math.random()).toFixed(1),
    }
  };
  spans.push(rootSpan);

  let currentTime = startTime.getTime();
  let remainingLatency = totalLatency;

  // Add child spans based on tool type
  if (toolName === 'retrieval' || toolName === 'search_tool' || toolName === 'web_browser') {
    // Embedding span
    const embedLatency = Math.floor(remainingLatency * 0.15);
    const embedSpan = {
      span_id: randomUUID(),
      parent_span_id: rootSpanId,
      name: 'prompt-embedding',
      type: 'GENERATION',
      start_time: new Date(currentTime).toISOString(),
      end_time: new Date(currentTime + embedLatency).toISOString(),
      latency_ms: embedLatency,
      status: 'OK',
      input: query,
      output: `[0.${randomInt(100, 999)}, 0.${randomInt(100, 999)}, -0.${randomInt(100, 999)}, ...]`,
      metadata: {
        model: 'text-embedding-3-small',
        dimensions: 1536
      }
    };
    spans.push(embedSpan);
    currentTime += embedLatency;
    remainingLatency -= embedLatency;

    // Vector store span
    const vecLatency = Math.floor(remainingLatency * 0.25);
    const vecSpan = {
      span_id: randomUUID(),
      parent_span_id: rootSpanId,
      name: 'vector-store-search',
      type: 'SPAN',
      start_time: new Date(currentTime).toISOString(),
      end_time: new Date(currentTime + vecLatency).toISOString(),
      latency_ms: vecLatency,
      status: 'OK',
      input: `Search query: "${query.substring(0, 50)}..."`,
      output: `Found ${randomInt(3, 10)} relevant documents with similarity scores [0.${randomInt(85, 99)}, 0.${randomInt(75, 90)}, ...]`,
      metadata: {
        index: 'main-index',
        top_k: 5
      }
    };
    spans.push(vecSpan);
    currentTime += vecLatency;
    remainingLatency -= vecLatency;
  }

  if (toolName === 'code_interpreter' || toolName === 'file_reader') {
    // Code parsing span
    const parseLatency = Math.floor(remainingLatency * 0.1);
    const parseSpan = {
      span_id: randomUUID(),
      parent_span_id: rootSpanId,
      name: 'code-parsing',
      type: 'SPAN',
      start_time: new Date(currentTime).toISOString(),
      end_time: new Date(currentTime + parseLatency).toISOString(),
      latency_ms: parseLatency,
      status: 'OK',
      input: 'Parse and validate code request',
      output: 'Code parsed successfully, language: Python',
      metadata: {
        language: 'python',
        lines: randomInt(5, 50)
      }
    };
    spans.push(parseSpan);
    currentTime += parseLatency;
    remainingLatency -= parseLatency;

    // Execution span
    const execLatency = Math.floor(remainingLatency * 0.3);
    const execSpan = {
      span_id: randomUUID(),
      parent_span_id: rootSpanId,
      name: 'code-execution',
      type: 'SPAN',
      start_time: new Date(currentTime).toISOString(),
      end_time: new Date(currentTime + execLatency).toISOString(),
      latency_ms: execLatency,
      status: isError ? 'ERROR' : 'OK',
      input: '```python\nresult = process_data(input)\nprint(result)\n```',
      output: isError ? 'ExecutionError: Variable not defined' : 'Execution completed successfully\nOutput: [1, 2, 3, 4, 5]',
      metadata: {
        sandbox: 'isolated',
        memory_mb: randomInt(128, 512)
      }
    };
    spans.push(execSpan);
    currentTime += execLatency;
    remainingLatency -= execLatency;
  }

  if (toolName === 'image_gen') {
    // Prompt enhancement span
    const enhanceLatency = Math.floor(remainingLatency * 0.15);
    const enhanceSpan = {
      span_id: randomUUID(),
      parent_span_id: rootSpanId,
      name: 'prompt-enhancement',
      type: 'GENERATION',
      start_time: new Date(currentTime).toISOString(),
      end_time: new Date(currentTime + enhanceLatency).toISOString(),
      latency_ms: enhanceLatency,
      status: 'OK',
      input: query,
      output: `Enhanced prompt: "${query}, highly detailed, professional photography, 8k resolution, cinematic lighting"`,
      metadata: {
        enhancement_model: 'prompt-optimizer-v2'
      }
    };
    spans.push(enhanceSpan);
    currentTime += enhanceLatency;
    remainingLatency -= enhanceLatency;

    // Image generation span
    const genLatency = Math.floor(remainingLatency * 0.7);
    const genSpan = {
      span_id: randomUUID(),
      parent_span_id: rootSpanId,
      name: 'image-generation',
      type: 'GENERATION',
      start_time: new Date(currentTime).toISOString(),
      end_time: new Date(currentTime + genLatency).toISOString(),
      latency_ms: genLatency,
      status: isError ? 'ERROR' : 'OK',
      input: 'Generate image from enhanced prompt',
      output: isError ? 'Error: Content policy violation' : `Image generated successfully: img_${randomUUID().substring(0, 8)}.png (1024x1024)`,
      metadata: {
        model: 'dall-e-3',
        size: '1024x1024',
        quality: 'hd'
      }
    };
    spans.push(genSpan);
    currentTime += genLatency;
    remainingLatency -= genLatency;
  }

  // Final generation span (LLM call)
  if (remainingLatency > 50) {
    const genSpan = {
      span_id: randomUUID(),
      parent_span_id: rootSpanId,
      name: 'llm-generation',
      type: 'GENERATION',
      start_time: new Date(currentTime).toISOString(),
      end_time: new Date(currentTime + remainingLatency).toISOString(),
      latency_ms: remainingLatency,
      status: isError ? 'ERROR' : 'OK',
      input: `System: You are a helpful assistant.\nUser: ${query}`,
      output: output,
      metadata: {
        model: randomItem(['gpt-4', 'gpt-4-turbo', 'claude-3-opus']),
        input_tokens: randomInt(50, 500),
        output_tokens: randomInt(100, 800),
        stop_reason: isError ? 'error' : 'end_turn'
      }
    };
    spans.push(genSpan);
  }

  return spans;
}

function generateTraces() {
  const traces = [];
  const now = new Date();
  const tools = ['search_tool', 'calculator', 'image_gen', 'code_interpreter', 'retrieval', 'web_browser', 'file_reader'];
  const errorTypes = ['schema_error', 'tool_error', 'rate_limit_exceeded', 'timeout', 'connection_error', 'validation_error'];
  const clients = ['ChatGPT', 'Claude', 'Cursor', 'Custom', 'MCP'];
  const users = Array.from({ length: 80 }, (_, i) => `user_${1000 + i}`);
  const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

  // Using demo project's org and project IDs
  const orgId = 'org-demo';
  const projectId = 'proj-demo';

  // Generate session IDs for each user (each user has 2-5 sessions)
  const userSessions = {};
  users.forEach(userId => {
    const sessionCount = randomInt(2, 5);
    userSessions[userId] = Array.from({ length: sessionCount }, () => randomUUID());
  });

  for (let i = 0; i < 500; i++) {
    // Spread over 30 days with some clustering (more recent = more traces)
    const dayWeight = Math.random() * Math.random(); // Bias towards recent
    const timeOffset = Math.floor(dayWeight * THIRTY_DAYS_MS);
    const startTime = new Date(now.getTime() - timeOffset);

    // Add hour variation for realistic patterns (more activity during work hours)
    const hour = startTime.getHours();
    if (Math.random() > 0.3 && (hour < 8 || hour > 22)) {
      startTime.setHours(randomInt(9, 18));
    }

    const latency = randomInt(50, 2500);
    const endTime = new Date(startTime.getTime() + latency);

    const isError = Math.random() > 0.9;
    const status = isError ? randomItem(['ERROR', 'TIMEOUT', 'CANCELLED']) : 'OK';
    const errorType = isError ? randomItem(errorTypes) : undefined;
    const toolName = randomItem(tools);
    const traceId = randomUUID();
    const userId = randomItem(users);
    const sessionId = randomItem(userSessions[userId]);

    // Generate spans for this trace
    const spans = generateSpans(traceId, toolName, startTime, latency, isError);

    const trace = {
      trace_id: traceId,
      name: `${toolName}_execution`,
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      latency_ms: latency,
      org_id: orgId,
      project_id: projectId,
      environment: Math.random() > 0.2 ? 'prod' : 'staging',
      release_id: `sha-${Math.random().toString(16).substring(2, 8)}`,
      status,
      error_type: errorType,
      retry_count: isError ? randomInt(0, 2) : 0,
      tool_name: toolName,
      tool_version: randomItem(['v1.0.0', 'v1.0.1', 'v1.0.2', 'v1.1.0']),
      client_type: randomItem(clients),
      region: randomItem(['us-east-1', 'us-west-2', 'eu-west-1', 'ap-northeast-2', 'ap-southeast-1']),
      user_id: userId,
      session_id: sessionId,
      spans
    };

    traces.push(trace);
  }

  // Sort by date descending
  traces.sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());

  return traces;
}

// Generate and save
const traces = generateTraces();

// Create output directory if it doesn't exist
const outputDir = join(__dirname, '..', 'public', 'dummy-data');
if (!existsSync(outputDir)) {
  mkdirSync(outputDir, { recursive: true });
}

// Save traces
const tracesPath = join(outputDir, 'traces.json');
writeFileSync(tracesPath, JSON.stringify(traces, null, 2));
console.log(`✅ Generated ${traces.length} dummy traces at ${tracesPath}`);

// Generate summary stats
const stats = {
  totalTraces: traces.length,
  uniqueUsers: [...new Set(traces.map(t => t.user_id))].length,
  clients: [...new Set(traces.map(t => t.client_type))],
  tools: [...new Set(traces.map(t => t.tool_name))],
  errorCount: traces.filter(t => t.status !== 'OK').length,
  dateRange: {
    start: traces[traces.length - 1].start_time,
    end: traces[0].start_time
  }
};

console.log('\n📊 Data Summary:');
console.log(`   - Total traces: ${stats.totalTraces}`);
console.log(`   - Unique users: ${stats.uniqueUsers}`);
console.log(`   - Clients: ${stats.clients.join(', ')}`);
console.log(`   - Tools: ${stats.tools.join(', ')}`);
console.log(`   - Error count: ${stats.errorCount} (${(stats.errorCount / stats.totalTraces * 100).toFixed(1)}%)`);
console.log(`   - Date range: ${stats.dateRange.start.split('T')[0]} to ${stats.dateRange.end.split('T')[0]}`);
