import { Trace } from '../types';

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

// Cache for traces to avoid repeated fetches
let tracesCache: Record<string, Trace[]> = {};

// Time range filter helper (hoursAgo = 0 means all time, no filtering)
const filterByTimeRange = (traces: Trace[], hoursAgo: number): Trace[] => {
  if (hoursAgo === 0) return traces;
  const cutoffTime = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);
  return traces.filter(t => new Date(t.start_time) >= cutoffTime);
};

export const traceService = {
  async getTraces(projectId: string): Promise<Trace[]> {
    // Return from cache if available
    if (tracesCache[projectId] && tracesCache[projectId].length > 0) {
      return tracesCache[projectId];
    }

    // Fetch from backend API
    try {
      const response = await fetch(`/api/traces/${projectId}`);
      if (response.ok) {
        const data = await response.json();
        tracesCache[projectId] = data || [];
        return tracesCache[projectId];
      }
    } catch (error) {
      console.error('Failed to fetch traces from backend:', error);
    }

    // Return empty array if backend is not available
    return [];
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
    const sessions: Session[] = [];

    // Check if traces have explicit session_id from SDK
    const tracesWithSessionId = traces.filter(t => t.session_id);

    if (tracesWithSessionId.length > 0) {
      // Group by actual session_id from SDK
      const sessionGroups: Record<string, Trace[]> = {};

      traces.forEach(t => {
        const sessionKey = t.session_id || `${t.user_id}_${new Date(t.start_time).getTime()}`;
        if (!sessionGroups[sessionKey]) sessionGroups[sessionKey] = [];
        sessionGroups[sessionKey].push(t);
      });

      Object.entries(sessionGroups).forEach(([sessionId, sessionTraces]) => {
        sessionTraces.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
        const startTime = sessionTraces[0].start_time;
        const endTime = sessionTraces[sessionTraces.length - 1].end_time;
        sessions.push({
          sessionId,
          userId: sessionTraces[0].user_id,
          clientType: sessionTraces[0].client_type,
          startTime,
          endTime,
          durationMs: new Date(endTime).getTime() - new Date(startTime).getTime(),
          traceCount: sessionTraces.length,
          errorCount: sessionTraces.filter(t => t.status !== 'OK').length,
          traces: sessionTraces
        });
      });
    } else {
      // Fallback: Group traces by user and time proximity (30 min gap = new session)
      const SESSION_GAP_MS = 30 * 60 * 1000; // 30 minutes
      const userTraces: Record<string, Trace[]> = {};

      traces.forEach(t => {
        if (!userTraces[t.user_id]) userTraces[t.user_id] = [];
        userTraces[t.user_id].push(t);
      });

      Object.entries(userTraces).forEach(([userId, userTraceList]) => {
        userTraceList.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

        let currentSession: Trace[] = [];
        let lastTime = 0;

        userTraceList.forEach(trace => {
          const traceTime = new Date(trace.start_time).getTime();

          if (lastTime === 0 || traceTime - lastTime < SESSION_GAP_MS) {
            currentSession.push(trace);
          } else {
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
    }

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
        let validUsers = 0;

        // Single pass through cohort users to calculate both retained and validUsers
        cohortUsers.forEach(userId => {
          const firstSeenDate = userFirstSeen[userId];
          const targetDate = new Date(firstSeenDate.getTime() + daysAfter * 24 * 60 * 60 * 1000);

          // Skip if target date hasn't arrived yet
          if (targetDate > now) return;

          // This user is valid (target date has passed)
          validUsers++;

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
