import { Trace, Project } from '../types';

// Helper for random data
const randomItem = <T>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];
const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

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

      const trace: Trace = {
        trace_id: crypto.randomUUID(),
        span_id: crypto.randomUUID(),
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
        user_id: randomItem(users)
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
    
    console.log(`✅ Generated 300 dummy traces for project ${project.name}`);
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
