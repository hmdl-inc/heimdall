import { Trace, Span, Project } from '../types';

// Helper for random data
const randomItem = <T>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];
const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

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
];

const generateSpans = (traceId: string, toolName: string, startTime: Date, totalLatency: number, isError: boolean): Span[] => {
  const spans: Span[] = [];
  const rootSpanId = crypto.randomUUID();
  
  const query = randomItem(sampleQueries);
  const output = isError ? `Error: Failed to process request` : randomItem(sampleOutputs);

  // Root span (the trace itself)
  const rootSpan: Span = {
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
      temperature: Math.random().toFixed(1),
    }
  };
  spans.push(rootSpan);

  let currentTime = startTime.getTime();
  let remainingLatency = totalLatency;

  // Add child spans based on tool type
  if (toolName === 'retrieval' || toolName === 'search_tool') {
    // Embedding span
    const embedLatency = Math.floor(remainingLatency * 0.15);
    const embedSpan: Span = {
      span_id: crypto.randomUUID(),
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
    const vecSpan: Span = {
      span_id: crypto.randomUUID(),
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

    // Context preparation span
    const ctxLatency = Math.floor(remainingLatency * 0.1);
    const ctxSpan: Span = {
      span_id: crypto.randomUUID(),
      parent_span_id: rootSpanId,
      name: 'context-preparation',
      type: 'SPAN',
      start_time: new Date(currentTime).toISOString(),
      end_time: new Date(currentTime + ctxLatency).toISOString(),
      latency_ms: ctxLatency,
      status: 'OK',
      input: 'Prepare context from retrieved documents',
      output: `Context prepared: ${randomInt(500, 2000)} tokens`,
      metadata: {
        max_tokens: 4096
      }
    };
    spans.push(ctxSpan);
    currentTime += ctxLatency;
    remainingLatency -= ctxLatency;
  }

  if (toolName === 'code_interpreter') {
    // Code parsing span
    const parseLatency = Math.floor(remainingLatency * 0.1);
    const parseSpan: Span = {
      span_id: crypto.randomUUID(),
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
    const execSpan: Span = {
      span_id: crypto.randomUUID(),
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
    const enhanceSpan: Span = {
      span_id: crypto.randomUUID(),
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
    const genSpan: Span = {
      span_id: crypto.randomUUID(),
      parent_span_id: rootSpanId,
      name: 'image-generation',
      type: 'GENERATION',
      start_time: new Date(currentTime).toISOString(),
      end_time: new Date(currentTime + genLatency).toISOString(),
      latency_ms: genLatency,
      status: isError ? 'ERROR' : 'OK',
      input: 'Generate image from enhanced prompt',
      output: isError ? 'Error: Content policy violation' : `Image generated successfully: img_${crypto.randomUUID().substring(0, 8)}.png (1024x1024)`,
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
    const genSpan: Span = {
      span_id: crypto.randomUUID(),
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
};

// Cache for traces to avoid repeated fetches
let tracesCache: Record<string, Trace[]> = {};

// Time range filter helper (hoursAgo = 0 means all time, no filtering)
const filterByTimeRange = (traces: Trace[], hoursAgo: number): Trace[] => {
  if (hoursAgo === 0) return traces;
  const cutoffTime = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);
  return traces.filter(t => new Date(t.start_time) >= cutoffTime);
};

export const traceService = {
  // Ensure dummy data exists for a project (generates if needed)
  async ensureDummyData(project: Project) {
    // Check if we already have traces for this project
    const existingTraces = await this.getTraces(project.id);
    if (existingTraces.length > 0) {
      console.log(`✅ Traces already exist for project ${project.name}`);
      return;
    }

    // Generate new traces
    const traces: Trace[] = [];
    const now = new Date();
    const tools = ['search_tool', 'calculator', 'image_gen', 'code_interpreter', 'retrieval'];
    const errorTypes = ['schema_error', 'tool_error', 'rate_limit_exceeded', 'timeout'];
    const clients = ['ChatGPT', 'Claude', 'Cursor', 'Custom'] as const;
    const users = Array.from({ length: 50 }, (_, i) => `user_${1000 + i}`);

    for (let i = 0; i < 300; i++) {
      const timeOffset = randomInt(0, 7 * 24 * 60 * 60 * 1000);
      const startTime = new Date(now.getTime() - timeOffset);
      const latency = randomInt(50, 2000);
      const endTime = new Date(startTime.getTime() + latency);

      const isError = Math.random() > 0.9;
      const status = isError ? randomItem(['ERROR', 'TIMEOUT', 'CANCELLED'] as const) : 'OK';
      const errorType = isError ? randomItem(errorTypes) : undefined;
      const toolName = randomItem(tools);
      const traceId = crypto.randomUUID();

      // Generate spans for this trace
      const spans = generateSpans(traceId, toolName, startTime, latency, isError);

      const trace: Trace = {
        trace_id: traceId,
        name: `${toolName}_execution`,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        latency_ms: latency,
        org_id: project.organizationId,
        project_id: project.id,
        environment: Math.random() > 0.2 ? 'prod' : 'staging',
        release_id: `sha-${Math.random().toString(16).substring(2, 8)}`,
        status,
        error_type: errorType,
        retry_count: isError ? randomInt(0, 2) : 0,
        tool_name: toolName,
        tool_version: 'v1.0.2',
        client_type: randomItem(clients),
        region: randomItem(['us-east-1', 'eu-west-1', 'ap-northeast-2']),
        user_id: randomItem(users),
        spans
      };

      traces.push(trace);
    }

    // Sort by date descending
    traces.sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());

    // Save to file
    await fetch('/api/traces', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId: project.id, data: traces }),
    });

    // Update cache
    tracesCache[project.id] = traces;
    
    console.log(`✅ Generated 300 dummy traces with spans for project ${project.name}`);
  },

  async getTraces(projectId: string): Promise<Trace[]> {
    // Return from cache if available
    if (tracesCache[projectId]) {
      return tracesCache[projectId];
    }

    try {
      const response = await fetch(`/api/traces/${projectId}`);
      const data = await response.json();
      tracesCache[projectId] = data || [];
      return tracesCache[projectId];
    } catch (error) {
      console.error('Error fetching traces:', error);
      return [];
    }
  },

  // Clear cache (useful when project changes)
  clearCache() {
    tracesCache = {};
  },

  // Get traces filtered by time range
  async getTracesFiltered(projectId: string, hoursAgo: number): Promise<Trace[]> {
    const allTraces = await this.getTraces(projectId);
    return filterByTimeRange(allTraces, hoursAgo);
  },

  // Aggregations for Dashboard
  async getStats(projectId: string, hoursAgo: number = 24) {
    const allTraces = await this.getTraces(projectId);
    const traces = filterByTimeRange(allTraces, hoursAgo);

    // 1. Total Traces
    const totalTraces = traces.length;

    // 2. Error Rate
    const errorCount = traces.filter(t => t.status !== 'OK').length;
    const errorRate = totalTraces > 0 ? Math.round((errorCount / totalTraces) * 100) : 0;

    // 3. Error Breakdown
    const errorBreakdown = traces
      .filter(t => t.status !== 'OK' && t.error_type)
      .reduce((acc, curr) => {
        acc[curr.error_type!] = (acc[curr.error_type!] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    // 4. Daily Volume (Last 7 days)
    const dailyVolume: Record<string, number> = {};
    traces.forEach(t => {
      const date = t.start_time.split('T')[0].substring(5); // MM-DD
      dailyVolume[date] = (dailyVolume[date] || 0) + 1;
    });
    const chartData = Object.entries(dailyVolume)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([name, value]) => ({ name, value }));

    // 5. Client Distribution
    const clientCounts: Record<string, number> = {};
    traces.forEach(t => {
      clientCounts[t.client_type] = (clientCounts[t.client_type] || 0) + 1;
    });
    const maxClientCount = Math.max(...Object.values(clientCounts), 1);
    const clientData = Object.entries(clientCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([label, count]) => ({
        label,
        count,
        width: `${Math.round((count / maxClientCount) * 100)}%`
      }));

    // 6. Tool Latencies (p50, p90, etc)
    const toolStats: Record<string, number[]> = {};
    traces.forEach(t => {
      if (!t.tool_name) return;
      if (!toolStats[t.tool_name]) toolStats[t.tool_name] = [];
      toolStats[t.tool_name].push(t.latency_ms);
    });

    const latencyTable = Object.entries(toolStats).map(([name, latencies]) => {
      latencies.sort((a, b) => a - b);
      const p50 = latencies[Math.floor(latencies.length * 0.5)];
      const p90 = latencies[Math.floor(latencies.length * 0.9)];
      const p95 = latencies[Math.floor(latencies.length * 0.95)];
      const p99 = latencies[Math.floor(latencies.length * 0.99)];
      return { name, p50, p90, p95, p99, count: latencies.length };
    }).sort((a, b) => b.count - a.count).slice(0, 5);

    // 7. Top Tools for Bar Chart
    const topTools = latencyTable.map(t => ({
      name: t.name,
      count: t.count,
      width: `${Math.round((t.count / totalTraces) * 100)}%`
    }));

    return {
      totalTraces,
      errorRate,
      errorBreakdown,
      chartData,
      clientData,
      latencyTable,
      topTools
    };
  }
};
