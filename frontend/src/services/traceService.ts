import { Trace, Span, Project } from '../types';

// Session interface for grouping traces
export interface Session {
  sessionId: string;
  userId: string;
  clientType: string;
  startTime: string;
  endTime: string;
  durationMs: number;
  traceCount: number;
  errorCount: number;
  traces: Trace[];
}

// User analytics interface
export interface UserAnalytics {
  dau: number;
  wau: number;
  mau: number;
  totalUsers: number;
  newUsersToday: number;
  newUsersThisWeek: number;
  retentionCohort: RetentionCohortData[];
  usersByClient: { client: string; count: number; percentage: number }[];
  activeUserTrend: { date: string; dau: number; wau: number; mau: number }[];
}

export interface RetentionCohortData {
  cohort: string;
  users: number;
  day1: number;
  day7: number;
  day14: number;
  day30: number;
}

// Client analytics interface
export interface ClientAnalytics {
  clients: {
    name: string;
    totalRequests: number;
    uniqueUsers: number;
    errorCount: number;
    errorRate: number;
    avgLatency: number;
    p50Latency: number;
    p95Latency: number;
  }[];
  requestsByClient: { name: string; value: number }[];
  errorsByClient: { name: string; errors: number; total: number }[];
}

// Session analytics interface
export interface SessionAnalytics {
  totalSessions: number;
  avgDuration: number;
  avgRequestsPerSession: number;
  sessionsToday: number;
  durationDistribution: { range: string; count: number }[];
  requestsDistribution: { range: string; count: number }[];
  hourlyPattern: { hour: string; count: number }[];
  sessionsByDay: { date: string; count: number }[];
}

// Performance analytics interface
export interface PerformanceAnalytics {
  avgLatency: number;
  p50Latency: number;
  p90Latency: number;
  p95Latency: number;
  p99Latency: number;
  latencyDistribution: { range: string; count: number }[];
  slowestTraces: { traceId: string; name: string; latencyMs: number; time: string }[];
  latencyByHour: { hour: string; avg: number; p95: number }[];
  latencyTrend: { date: string; avg: number; p95: number }[];
  toolLatencies: { tool: string; avg: number; p50: number; p95: number; count: number; errorRate: number }[];
}

// Alert/Error analytics interface
export interface ErrorAnalytics {
  totalErrors: number;
  errorRate: number;
  errorsByType: { type: string; count: number; percentage: number }[];
  errorsByClient: { client: string; count: number; rate: number }[];
  errorTrend: { date: string; count: number; rate: number }[];
  recentErrors: { traceId: string; name: string; errorType: string; time: string; client: string }[];
  errorSpikes: { time: string; count: number; severity: 'low' | 'medium' | 'high' }[];
  userSurge: { date: string; count: number; change: number }[];
}

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
  // Load dummy data from JSON file
  async loadDummyData(): Promise<Trace[]> {
    try {
      const response = await fetch('/dummy-data/traces.json');
      if (response.ok) {
        const data = await response.json();
        console.log(`✅ Loaded ${data.length} traces from dummy-data/traces.json`);
        return data;
      }
    } catch (error) {
      console.log('Could not load dummy data file:', error);
    }
    return [];
  },

  async getTraces(projectId: string): Promise<Trace[]> {
    // Return from cache if available
    if (tracesCache[projectId] && tracesCache[projectId].length > 0) {
      return tracesCache[projectId];
    }

    // Try backend API first
    try {
      const response = await fetch(`/api/traces/${projectId}`);
      if (response.ok) {
        const data = await response.json();
        if (data && data.length > 0) {
          tracesCache[projectId] = data;
          return tracesCache[projectId];
        }
      }
    } catch (error) {
      console.log('Backend not available, trying dummy data file');
    }

    // Fall back to dummy data file
    const dummyTraces = await this.loadDummyData();
    if (dummyTraces.length > 0) {
      tracesCache[projectId] = dummyTraces;
      return dummyTraces;
    }

    // Last resort: generate in-memory (for backwards compatibility)
    const traces = this.generateDummyDataInMemory(projectId);
    tracesCache[projectId] = traces;
    return traces;
  },

  // Fallback: Generate dummy data in memory if file not available
  generateDummyDataInMemory(projectId: string): Trace[] {
    const traces: Trace[] = [];
    const now = new Date();
    const tools = ['search_tool', 'calculator', 'image_gen', 'code_interpreter', 'retrieval', 'web_browser', 'file_reader'];
    const errorTypes = ['schema_error', 'tool_error', 'rate_limit_exceeded', 'timeout', 'connection_error', 'validation_error'];
    const clients = ['ChatGPT', 'Claude', 'Cursor', 'Custom', 'MCP'] as const;
    const users = Array.from({ length: 80 }, (_, i) => `user_${1000 + i}`);
    const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

    for (let i = 0; i < 500; i++) {
      const dayWeight = Math.random() * Math.random();
      const timeOffset = Math.floor(dayWeight * THIRTY_DAYS_MS);
      const startTime = new Date(now.getTime() - timeOffset);
      
      const hour = startTime.getHours();
      if (Math.random() > 0.3 && (hour < 8 || hour > 22)) {
        startTime.setHours(randomInt(9, 18));
      }

      const latency = randomInt(50, 2500);
      const endTime = new Date(startTime.getTime() + latency);

      const isError = Math.random() > 0.9;
      const status = isError ? randomItem(['ERROR', 'TIMEOUT', 'CANCELLED'] as const) : 'OK';
      const errorType = isError ? randomItem(errorTypes) : undefined;
      const toolName = randomItem(tools);
      const traceId = crypto.randomUUID();

      const spans = generateSpans(traceId, toolName, startTime, latency, isError);

      const trace: Trace = {
        trace_id: traceId,
        name: `${toolName}_execution`,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        latency_ms: latency,
        org_id: 'org-demo',
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
        user_id: randomItem(users),
        spans
      };

      traces.push(trace);
    }

    traces.sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());
    console.log(`✅ Generated ${traces.length} dummy traces in memory`);
    return traces;
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
  },

  // Get sessions grouped from traces
  async getSessions(projectId: string): Promise<Session[]> {
    const traces = await this.getTraces(projectId);
    
    // Group traces by user and time proximity (30 min gap = new session)
    const SESSION_GAP_MS = 30 * 60 * 1000; // 30 minutes
    const userTraces: Record<string, Trace[]> = {};
    
    traces.forEach(t => {
      if (!userTraces[t.user_id]) userTraces[t.user_id] = [];
      userTraces[t.user_id].push(t);
    });

    const sessions: Session[] = [];
    
    Object.entries(userTraces).forEach(([userId, userTraceList]) => {
      // Sort by time
      userTraceList.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
      
      let currentSession: Trace[] = [];
      let lastTime = 0;
      
      userTraceList.forEach(trace => {
        const traceTime = new Date(trace.start_time).getTime();
        
        if (lastTime === 0 || traceTime - lastTime < SESSION_GAP_MS) {
          currentSession.push(trace);
        } else {
          // Save current session and start new one
          if (currentSession.length > 0) {
            const startTime = currentSession[0].start_time;
            const endTime = currentSession[currentSession.length - 1].end_time;
            sessions.push({
              sessionId: `${userId}_${new Date(startTime).getTime()}`,
              userId,
              clientType: currentSession[0].client_type,
              startTime,
              endTime,
              durationMs: new Date(endTime).getTime() - new Date(startTime).getTime(),
              traceCount: currentSession.length,
              errorCount: currentSession.filter(t => t.status !== 'OK').length,
              traces: currentSession
            });
          }
          currentSession = [trace];
        }
        lastTime = new Date(trace.end_time).getTime();
      });
      
      // Don't forget last session
      if (currentSession.length > 0) {
        const startTime = currentSession[0].start_time;
        const endTime = currentSession[currentSession.length - 1].end_time;
        sessions.push({
          sessionId: `${userId}_${new Date(startTime).getTime()}`,
          userId,
          clientType: currentSession[0].client_type,
          startTime,
          endTime,
          durationMs: new Date(endTime).getTime() - new Date(startTime).getTime(),
          traceCount: currentSession.length,
          errorCount: currentSession.filter(t => t.status !== 'OK').length,
          traces: currentSession
        });
      }
    });
    
    // Sort sessions by start time descending
    sessions.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
    
    return sessions;
  },

  // User Analytics
  async getUserAnalytics(projectId: string): Promise<UserAnalytics> {
    const traces = await this.getTraces(projectId);
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    // Group by user
    const userFirstSeen: Record<string, Date> = {};
    const userLastSeen: Record<string, Date> = {};
    const userClients: Record<string, Set<string>> = {};
    
    traces.forEach(t => {
      const traceDate = new Date(t.start_time);
      if (!userFirstSeen[t.user_id] || traceDate < userFirstSeen[t.user_id]) {
        userFirstSeen[t.user_id] = traceDate;
      }
      if (!userLastSeen[t.user_id] || traceDate > userLastSeen[t.user_id]) {
        userLastSeen[t.user_id] = traceDate;
      }
      if (!userClients[t.user_id]) userClients[t.user_id] = new Set();
      userClients[t.user_id].add(t.client_type);
    });
    
    const allUsers = Object.keys(userFirstSeen);
    const dau = allUsers.filter(u => userLastSeen[u] >= oneDayAgo).length;
    const wau = allUsers.filter(u => userLastSeen[u] >= oneWeekAgo).length;
    const mau = allUsers.filter(u => userLastSeen[u] >= oneMonthAgo).length;
    const newUsersToday = allUsers.filter(u => userFirstSeen[u] >= oneDayAgo).length;
    const newUsersThisWeek = allUsers.filter(u => userFirstSeen[u] >= oneWeekAgo).length;
    
    // Users by client
    const clientUserCount: Record<string, Set<string>> = {};
    Object.entries(userClients).forEach(([userId, clients]) => {
      clients.forEach(client => {
        if (!clientUserCount[client]) clientUserCount[client] = new Set();
        clientUserCount[client].add(userId);
      });
    });
    
    const usersByClient = Object.entries(clientUserCount)
      .map(([client, users]) => ({
        client,
        count: users.size,
        percentage: Math.round((users.size / allUsers.length) * 100)
      }))
      .sort((a, b) => b.count - a.count);
    
    // Retention cohort - track retention for users who signed up in the last 4 weeks
    const retentionCohort: RetentionCohortData[] = [];
    
    // Collect activity dates per user for return visit tracking
    const userActivityDates: Record<string, Set<string>> = {};
    traces.forEach(t => {
      if (!userActivityDates[t.user_id]) userActivityDates[t.user_id] = new Set();
      const dateStr = new Date(t.start_time).toISOString().split('T')[0];
      userActivityDates[t.user_id].add(dateStr);
    });
    
    for (let weekIndex = 3; weekIndex >= 0; weekIndex--) {
      // Set cohort period (7 days from weekIndex weeks ago)
      const cohortEnd = new Date(now.getTime() - weekIndex * 7 * 24 * 60 * 60 * 1000);
      const cohortStart = new Date(cohortEnd.getTime() - 7 * 24 * 60 * 60 * 1000);
      
      // Users who first signed up during this period
      const cohortUsers = allUsers.filter(u => {
        const firstSeen = userFirstSeen[u];
        return firstSeen >= cohortStart && firstSeen < cohortEnd;
      });
      
      if (cohortUsers.length === 0) continue;
      
      // Calculate retention rate for each period
      const calcRetention = (daysAfter: number): number => {
        let retained = 0;
        cohortUsers.forEach(userId => {
          const firstSeenDate = userFirstSeen[userId];
          const targetDate = new Date(firstSeenDate.getTime() + daysAfter * 24 * 60 * 60 * 1000);
          
          // Skip if target date hasn't arrived yet
          if (targetDate > now) return;
          
          const activityDates = userActivityDates[userId];
          
          // Check if there's activity on or after the target date
          if (activityDates) {
            const hasActivity = Array.from(activityDates).some(dateStr => {
              const activityDate = new Date(dateStr);
              const daysDiff = Math.floor((activityDate.getTime() - firstSeenDate.getTime()) / (24 * 60 * 60 * 1000));
              return daysDiff >= daysAfter;
            });
            if (hasActivity) retained++;
          }
        });
        
        // Calculate valid users (those whose target date has passed)
        const validUsers = cohortUsers.filter(userId => {
          const firstSeenDate = userFirstSeen[userId];
          const targetDate = new Date(firstSeenDate.getTime() + daysAfter * 24 * 60 * 60 * 1000);
          return targetDate <= now;
        }).length;
        
        return validUsers > 0 ? Math.round((retained / validUsers) * 100) : -1; // -1 means N/A
      };
      
      // Generate cohort label (MM/DD format)
      const startLabel = `${cohortStart.getMonth() + 1}/${cohortStart.getDate()}`;
      const endLabel = `${cohortEnd.getMonth() + 1}/${cohortEnd.getDate() - 1}`;
      
      retentionCohort.push({
        cohort: `${startLabel} - ${endLabel}`,
        users: cohortUsers.length,
        day1: calcRetention(1),
        day7: calcRetention(7),
        day14: calcRetention(14),
        day30: calcRetention(30)
      });
    }
    
    // Active user trend (last 14 days)
    const activeUserTrend: { date: string; dau: number; wau: number; mau: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const targetDate = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const targetDateStr = targetDate.toISOString().split('T')[0];
      const dayStart = new Date(targetDate);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(targetDate);
      dayEnd.setHours(23, 59, 59, 999);
      
      const weekBefore = new Date(dayEnd.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthBefore = new Date(dayEnd.getTime() - 30 * 24 * 60 * 60 * 1000);
      
      // Count users active on that day (DAU)
      const dauCount = allUsers.filter(u => {
        const lastSeen = userLastSeen[u];
        return lastSeen >= dayStart && lastSeen <= dayEnd;
      }).length;
      
      // Count users active in the week ending on that day (WAU)
      const wauCount = allUsers.filter(u => {
        const lastSeen = userLastSeen[u];
        return lastSeen >= weekBefore && lastSeen <= dayEnd;
      }).length;
      
      // Count users active in the month ending on that day (MAU)
      const mauCount = allUsers.filter(u => {
        const lastSeen = userLastSeen[u];
        return lastSeen >= monthBefore && lastSeen <= dayEnd;
      }).length;
      
      activeUserTrend.push({
        date: targetDateStr.slice(5), // MM-DD format
        dau: dauCount,
        wau: wauCount,
        mau: mauCount
      });
    }
    
    return {
      dau,
      wau,
      mau,
      totalUsers: allUsers.length,
      newUsersToday,
      newUsersThisWeek,
      retentionCohort,
      usersByClient,
      activeUserTrend
    };
  },

  // Session Analytics
  async getSessionAnalytics(projectId: string): Promise<SessionAnalytics> {
    const sessions = await this.getSessions(projectId);
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    const totalSessions = sessions.length;
    const sessionsToday = sessions.filter(s => new Date(s.startTime) >= oneDayAgo).length;
    
    const durations = sessions.map(s => s.durationMs);
    const avgDuration = durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;
    
    const requestCounts = sessions.map(s => s.traceCount);
    const avgRequestsPerSession = requestCounts.length > 0 ? 
      Math.round(requestCounts.reduce((a, b) => a + b, 0) / requestCounts.length * 10) / 10 : 0;
    
    // Duration distribution
    const durationRanges = [
      { range: '< 1min', min: 0, max: 60000 },
      { range: '1-5min', min: 60000, max: 300000 },
      { range: '5-15min', min: 300000, max: 900000 },
      { range: '15-30min', min: 900000, max: 1800000 },
      { range: '> 30min', min: 1800000, max: Infinity }
    ];
    
    const durationDistribution = durationRanges.map(({ range, min, max }) => ({
      range,
      count: sessions.filter(s => s.durationMs >= min && s.durationMs < max).length
    }));
    
    // Requests per session distribution
    const requestRanges = [
      { range: '1-2', min: 1, max: 3 },
      { range: '3-5', min: 3, max: 6 },
      { range: '6-10', min: 6, max: 11 },
      { range: '11-20', min: 11, max: 21 },
      { range: '> 20', min: 21, max: Infinity }
    ];
    
    const requestsDistribution = requestRanges.map(({ range, min, max }) => ({
      range,
      count: sessions.filter(s => s.traceCount >= min && s.traceCount < max).length
    }));
    
    // Hourly pattern
    const hourlyCount: Record<number, number> = {};
    sessions.forEach(s => {
      const hour = new Date(s.startTime).getHours();
      hourlyCount[hour] = (hourlyCount[hour] || 0) + 1;
    });
    
    const hourlyPattern = Array.from({ length: 24 }, (_, i) => ({
      hour: `${i.toString().padStart(2, '0')}:00`,
      count: hourlyCount[i] || 0
    }));
    
    // Sessions by day (last 7 days)
    const sessionsByDay: { date: string; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const targetDate = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = targetDate.toISOString().split('T')[0];
      const dayStart = new Date(targetDate);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(targetDate);
      dayEnd.setHours(23, 59, 59, 999);
      
      const count = sessions.filter(s => {
        const sessionDate = new Date(s.startTime);
        return sessionDate >= dayStart && sessionDate <= dayEnd;
      }).length;
      
      sessionsByDay.push({
        date: dateStr.slice(5), // MM-DD format
        count
      });
    }
    
    return {
      totalSessions,
      avgDuration,
      avgRequestsPerSession,
      sessionsToday,
      durationDistribution,
      requestsDistribution,
      hourlyPattern,
      sessionsByDay
    };
  },

  // Client Analytics
  async getClientAnalytics(projectId: string): Promise<ClientAnalytics> {
    const traces = await this.getTraces(projectId);
    
    const clientStats: Record<string, { 
      requests: number; 
      users: Set<string>; 
      errors: number; 
      latencies: number[] 
    }> = {};
    
    traces.forEach(t => {
      if (!clientStats[t.client_type]) {
        clientStats[t.client_type] = { requests: 0, users: new Set(), errors: 0, latencies: [] };
      }
      clientStats[t.client_type].requests++;
      clientStats[t.client_type].users.add(t.user_id);
      if (t.status !== 'OK') clientStats[t.client_type].errors++;
      clientStats[t.client_type].latencies.push(t.latency_ms);
    });
    
    const clients = Object.entries(clientStats).map(([name, stats]) => {
      stats.latencies.sort((a, b) => a - b);
      const len = stats.latencies.length;
      return {
        name,
        totalRequests: stats.requests,
        uniqueUsers: stats.users.size,
        errorCount: stats.errors,
        errorRate: Math.round((stats.errors / stats.requests) * 100 * 10) / 10,
        avgLatency: Math.round(stats.latencies.reduce((a, b) => a + b, 0) / len),
        p50Latency: stats.latencies[Math.floor(len * 0.5)] || 0,
        p95Latency: stats.latencies[Math.floor(len * 0.95)] || 0
      };
    }).sort((a, b) => b.totalRequests - a.totalRequests);
    
    const requestsByClient = clients.map(c => ({ name: c.name, value: c.totalRequests }));
    const errorsByClient = clients.map(c => ({ name: c.name, errors: c.errorCount, total: c.totalRequests }));
    
    return { clients, requestsByClient, errorsByClient };
  },

  // Performance Analytics
  async getPerformanceAnalytics(projectId: string): Promise<PerformanceAnalytics> {
    const traces = await this.getTraces(projectId);
    
    const latencies = traces.map(t => t.latency_ms).sort((a, b) => a - b);
    const len = latencies.length;
    
    const avgLatency = len > 0 ? Math.round(latencies.reduce((a, b) => a + b, 0) / len) : 0;
    const p50Latency = latencies[Math.floor(len * 0.5)] || 0;
    const p90Latency = latencies[Math.floor(len * 0.9)] || 0;
    const p95Latency = latencies[Math.floor(len * 0.95)] || 0;
    const p99Latency = latencies[Math.floor(len * 0.99)] || 0;
    
    // Latency distribution
    const latencyRanges = [
      { range: '< 100ms', min: 0, max: 100 },
      { range: '100-300ms', min: 100, max: 300 },
      { range: '300-500ms', min: 300, max: 500 },
      { range: '500ms-1s', min: 500, max: 1000 },
      { range: '1-2s', min: 1000, max: 2000 },
      { range: '> 2s', min: 2000, max: Infinity }
    ];
    
    const latencyDistribution = latencyRanges.map(({ range, min, max }) => ({
      range,
      count: traces.filter(t => t.latency_ms >= min && t.latency_ms < max).length
    }));
    
    // Slowest traces
    const slowestTraces = [...traces]
      .sort((a, b) => b.latency_ms - a.latency_ms)
      .slice(0, 10)
      .map(t => ({
        traceId: t.trace_id,
        name: t.name,
        latencyMs: t.latency_ms,
        time: t.start_time
      }));
    
    // Latency by hour
    const hourlyLatencies: Record<number, number[]> = {};
    traces.forEach(t => {
      const hour = new Date(t.start_time).getHours();
      if (!hourlyLatencies[hour]) hourlyLatencies[hour] = [];
      hourlyLatencies[hour].push(t.latency_ms);
    });
    
    const latencyByHour = Array.from({ length: 24 }, (_, i) => {
      const hourLats = hourlyLatencies[i] || [];
      hourLats.sort((a, b) => a - b);
      return {
        hour: `${i.toString().padStart(2, '0')}:00`,
        avg: hourLats.length > 0 ? Math.round(hourLats.reduce((a, b) => a + b, 0) / hourLats.length) : 0,
        p95: hourLats[Math.floor(hourLats.length * 0.95)] || 0
      };
    });
    
    // Latency trend by date
    const dailyLatencies: Record<string, number[]> = {};
    traces.forEach(t => {
      const date = t.start_time.split('T')[0];
      if (!dailyLatencies[date]) dailyLatencies[date] = [];
      dailyLatencies[date].push(t.latency_ms);
    });
    
    const latencyTrend = Object.entries(dailyLatencies)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, lats]) => {
        lats.sort((a, b) => a - b);
        return {
          date: date.substring(5), // MM-DD
          avg: Math.round(lats.reduce((a, b) => a + b, 0) / lats.length),
          p95: lats[Math.floor(lats.length * 0.95)] || 0
        };
      });
    
    // Tool latencies and error rates
    const toolLatencyData: Record<string, number[]> = {};
    const toolErrorData: Record<string, { total: number; errors: number }> = {};
    traces.forEach(t => {
      if (!t.tool_name) return;
      if (!toolLatencyData[t.tool_name]) toolLatencyData[t.tool_name] = [];
      if (!toolErrorData[t.tool_name]) toolErrorData[t.tool_name] = { total: 0, errors: 0 };
      toolLatencyData[t.tool_name].push(t.latency_ms);
      toolErrorData[t.tool_name].total++;
      if (t.status !== 'OK') toolErrorData[t.tool_name].errors++;
    });
    
    const toolLatencies = Object.entries(toolLatencyData)
      .map(([tool, lats]) => {
        lats.sort((a, b) => a - b);
        const errorData = toolErrorData[tool] || { total: 0, errors: 0 };
        const errorRate = errorData.total > 0 
          ? Math.round((errorData.errors / errorData.total) * 100 * 10) / 10 
          : 0;
        return {
          tool,
          avg: Math.round(lats.reduce((a, b) => a + b, 0) / lats.length),
          p50: lats[Math.floor(lats.length * 0.5)] || 0,
          p95: lats[Math.floor(lats.length * 0.95)] || 0,
          count: lats.length,
          errorRate
        };
      })
      .sort((a, b) => b.count - a.count);
    
    return {
      avgLatency,
      p50Latency,
      p90Latency,
      p95Latency,
      p99Latency,
      latencyDistribution,
      slowestTraces,
      latencyByHour,
      latencyTrend,
      toolLatencies
    };
  },

  // Error Analytics
  async getErrorAnalytics(projectId: string): Promise<ErrorAnalytics> {
    const traces = await this.getTraces(projectId);
    
    const errorTraces = traces.filter(t => t.status !== 'OK');
    const totalErrors = errorTraces.length;
    const errorRate = traces.length > 0 ? Math.round((totalErrors / traces.length) * 100 * 10) / 10 : 0;
    
    // Errors by type
    const typeCount: Record<string, number> = {};
    errorTraces.forEach(t => {
      const type = t.error_type || 'unknown';
      typeCount[type] = (typeCount[type] || 0) + 1;
    });
    
    const errorsByType = Object.entries(typeCount)
      .map(([type, count]) => ({
        type,
        count,
        percentage: Math.round((count / totalErrors) * 100)
      }))
      .sort((a, b) => b.count - a.count);
    
    // Errors by client
    const clientErrors: Record<string, { errors: number; total: number }> = {};
    traces.forEach(t => {
      if (!clientErrors[t.client_type]) clientErrors[t.client_type] = { errors: 0, total: 0 };
      clientErrors[t.client_type].total++;
      if (t.status !== 'OK') clientErrors[t.client_type].errors++;
    });
    
    const errorsByClient = Object.entries(clientErrors)
      .map(([client, stats]) => ({
        client,
        count: stats.errors,
        rate: Math.round((stats.errors / stats.total) * 100 * 10) / 10
      }))
      .sort((a, b) => b.count - a.count);
    
    // Error trend by date
    const dailyErrors: Record<string, { errors: number; total: number }> = {};
    traces.forEach(t => {
      const date = t.start_time.split('T')[0];
      if (!dailyErrors[date]) dailyErrors[date] = { errors: 0, total: 0 };
      dailyErrors[date].total++;
      if (t.status !== 'OK') dailyErrors[date].errors++;
    });
    
    const errorTrend = Object.entries(dailyErrors)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, stats]) => ({
        date: date.substring(5),
        count: stats.errors,
        rate: Math.round((stats.errors / stats.total) * 100 * 10) / 10
      }));
    
    // Recent errors
    const recentErrors = [...errorTraces]
      .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime())
      .slice(0, 20)
      .map(t => ({
        traceId: t.trace_id,
        name: t.name,
        errorType: t.error_type || 'unknown',
        time: t.start_time,
        client: t.client_type
      }));
    
    // Error spikes (simplified detection)
    const hourlyErrors: Record<string, number> = {};
    errorTraces.forEach(t => {
      const hour = t.start_time.substring(0, 13); // YYYY-MM-DDTHH
      hourlyErrors[hour] = (hourlyErrors[hour] || 0) + 1;
    });
    
    const avgHourlyErrors = Object.values(hourlyErrors).reduce((a, b) => a + b, 0) / Object.keys(hourlyErrors).length || 1;
    
    const errorSpikes = Object.entries(hourlyErrors)
      .filter(([_, count]) => count > avgHourlyErrors * 1.5)
      .map(([time, count]) => ({
        time,
        count,
        severity: count > avgHourlyErrors * 3 ? 'high' as const : 
                  count > avgHourlyErrors * 2 ? 'medium' as const : 'low' as const
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    
    // User surge detection
    const dailyUsers: Record<string, Set<string>> = {};
    traces.forEach(t => {
      const date = t.start_time.split('T')[0];
      if (!dailyUsers[date]) dailyUsers[date] = new Set();
      dailyUsers[date].add(t.user_id);
    });
    
    const sortedDates = Object.keys(dailyUsers).sort();
    const userSurge = sortedDates.map((date, i) => {
      const count = dailyUsers[date].size;
      const prevCount = i > 0 ? dailyUsers[sortedDates[i - 1]].size : count;
      const change = prevCount > 0 ? Math.round(((count - prevCount) / prevCount) * 100) : 0;
      return { date: date.substring(5), count, change };
    });
    
    return {
      totalErrors,
      errorRate,
      errorsByType,
      errorsByClient,
      errorTrend,
      recentErrors,
      errorSpikes,
      userSurge
    };
  }
};
