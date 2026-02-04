import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Project, Trace } from '../types';
import { traceService, Session, SessionAnalytics } from '../services/traceService';
import { Search, Clock, Activity, Loader2, BarChart3, TrendingUp, Zap } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { TraceDetailPage } from './TraceDetailPage';
import { UserDetailPage } from './UserDetailPage';

interface SessionsPageProps {
  project: Project;
}

// Stat Card Component
const StatCard = ({ title, value, subtitle, icon: Icon }: { 
  title: string; 
  value: string | number; 
  subtitle?: string;
  icon: any;
}) => (
  <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
        {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
      </div>
      <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center">
        <Icon className="w-5 h-5 text-indigo-600" />
      </div>
    </div>
  </div>
);

// Format duration
const formatDuration = (ms: number) => {
  if (ms < 60000) return `${Math.round(ms / 1000)}s`;
  if (ms < 3600000) return `${Math.round(ms / 60000)}m`;
  return `${Math.round(ms / 3600000 * 10) / 10}h`;
};

const PAGE_SIZE = 50;

export const SessionsPage: React.FC<SessionsPageProps> = ({ project }) => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [analytics, setAnalytics] = useState<SessionAnalytics | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [selectedTrace, setSelectedTrace] = useState<Trace | null>(null);
  const [selectedUser, setSelectedUser] = useState<{ userId: string; traces: Trace[] } | null>(null);
  const [displayLimit, setDisplayLimit] = useState(PAGE_SIZE);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const tableContainerRef = useRef<HTMLDivElement>(null);

  const traceProjectId = project.linkedTraceProjectId || project.name;

  useEffect(() => {
    const loadData = async () => {
      const [sessionsData, analyticsData] = await Promise.all([
        traceService.getSessions(traceProjectId),
        traceService.getSessionAnalytics(traceProjectId)
      ]);
      setSessions(sessionsData);
      setAnalytics(analyticsData);
    };
    loadData();
  }, [traceProjectId]);

  useEffect(() => {
    setDisplayLimit(PAGE_SIZE);
  }, [searchTerm]);

  const filteredSessions = sessions.filter(s => 
    s.userId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.sessionId.includes(searchTerm)
  );

  const hasMore = displayLimit < filteredSessions.length;

  const loadMore = useCallback(() => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    setTimeout(() => {
      setDisplayLimit(prev => Math.min(prev + PAGE_SIZE, filteredSessions.length));
      setIsLoadingMore(false);
    }, 300);
  }, [isLoadingMore, hasMore, filteredSessions.length]);

  useEffect(() => {
    const container = tableContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      if (scrollHeight - scrollTop - clientHeight < 100) {
        loadMore();
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [loadMore]);

  const displayedSessions = filteredSessions.slice(0, displayLimit);

  // Handle navigation from trace detail
  const handleUserClick = (userId: string) => {
    const userTraces = sessions
      .filter(s => s.userId === userId)
      .flatMap(s => s.traces);
    if (userTraces.length > 0) {
      setSelectedTrace(null);
      setSelectedSession(null);
      setSelectedUser({ userId, traces: userTraces });
    }
  };

  // Show trace detail
  if (selectedTrace) {
    return (
      <TraceDetailPage 
        trace={selectedTrace} 
        onBack={() => setSelectedTrace(null)}
        onUserClick={handleUserClick}
      />
    );
  }

  // Show user detail
  if (selectedUser) {
    return (
      <UserDetailPage
        userId={selectedUser.userId}
        traces={selectedUser.traces}
        onBack={() => setSelectedUser(null)}
        onTraceSelect={(trace) => setSelectedTrace(trace)}
      />
    );
  }

  // Show session detail (traces within a session)
  if (selectedSession) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setSelectedSession(null)}
            className="text-sm text-slate-600 hover:text-slate-900 flex items-center gap-1"
          >
            ← Back to Sessions
          </button>
        </div>

        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Session Details</h2>
              <p className="text-sm text-slate-500 mt-1">User: {selectedSession.userId}</p>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <div className="text-slate-500">
                Duration: <span className="font-medium text-slate-900">{formatDuration(selectedSession.durationMs)}</span>
              </div>
              <div className="text-slate-500">
                Requests: <span className="font-medium text-slate-900">{selectedSession.traceCount}</span>
              </div>
              {selectedSession.errorCount > 0 && (
                <div className="text-red-600">
                  Errors: <span className="font-medium">{selectedSession.errorCount}</span>
                </div>
              )}
            </div>
          </div>

          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Time</th>
                <th className="px-4 py-3 text-left font-medium">Name</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">Latency</th>
                <th className="px-4 py-3 text-left font-medium">Client</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {selectedSession.traces.map((trace) => (
                <tr 
                  key={trace.trace_id}
                  className="hover:bg-slate-50/50 cursor-pointer"
                  onClick={() => setSelectedTrace(trace)}
                >
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {new Date(trace.start_time).toLocaleTimeString()}
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-900">{trace.name}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      trace.status === 'OK' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {trace.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{trace.latency_ms}ms</td>
                  <td className="px-4 py-3">
                    <span className="inline-block px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">
                      {trace.client_type}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Analytics Cards */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard 
            title="Total Sessions" 
            value={analytics.totalSessions} 
            subtitle={`${analytics.sessionsToday} today`}
            icon={Activity}
          />
          <StatCard 
            title="Avg Duration" 
            value={formatDuration(analytics.avgDuration)} 
            subtitle="Per session"
            icon={Clock}
          />
          <StatCard 
            title="Avg Requests" 
            value={analytics.avgRequestsPerSession} 
            subtitle="Per session"
            icon={Zap}
          />
          <StatCard 
            title="Sessions Today" 
            value={analytics.sessionsToday} 
            subtitle="Last 24 hours"
            icon={TrendingUp}
          />
        </div>
      )}

      {/* Charts Row */}
      {analytics && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Duration Distribution */}
          <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
            <h3 className="text-base font-semibold text-slate-900 mb-4">Session Duration Distribution</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.durationDistribution}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="range" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Requests per Session Distribution */}
          <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
            <h3 className="text-base font-semibold text-slate-900 mb-4">Requests per Session</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.requestsDistribution}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="range" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="count" fill="#22c55e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Hourly Pattern */}
          <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
            <h3 className="text-base font-semibold text-slate-900 mb-4">Usage Pattern by Hour</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analytics.hourlyPattern}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="hour" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} interval={3} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Area type="monotone" dataKey="count" stroke="#3b82f6" fill="#93c5fd" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Header Controls */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">All Sessions</h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search sessions..." 
            className="pl-9 pr-4 py-2 border border-slate-300 rounded-md text-sm w-64 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Sessions Table */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden flex flex-col" style={{ maxHeight: 'calc(100vh - 500px)' }}>
        <div ref={tableContainerRef} className="overflow-auto flex-1">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 sticky top-0">
              <tr>
                <th className="px-6 py-3 font-medium">User</th>
                <th className="px-6 py-3 font-medium">Start Time</th>
                <th className="px-6 py-3 font-medium">Duration</th>
                <th className="px-6 py-3 font-medium">Requests</th>
                <th className="px-6 py-3 font-medium">Errors</th>
                <th className="px-6 py-3 font-medium">Client</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayedSessions.map((session) => (
                <tr 
                  key={session.sessionId}
                  className="hover:bg-slate-50/50 cursor-pointer"
                  onClick={() => setSelectedSession(session)}
                >
                  <td className="px-6 py-3 font-medium text-slate-900">{session.userId}</td>
                  <td className="px-6 py-3 text-slate-600 text-xs">
                    {new Date(session.startTime).toLocaleString()}
                  </td>
                  <td className="px-6 py-3 text-slate-600">{formatDuration(session.durationMs)}</td>
                  <td className="px-6 py-3">
                    <span className="inline-flex items-center px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-xs font-medium">
                      {session.traceCount}
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    {session.errorCount > 0 ? (
                      <span className="inline-flex items-center px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-medium">
                        {session.errorCount}
                      </span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-3">
                    <span className="inline-block px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">
                      {session.clientType}
                    </span>
                  </td>
                </tr>
              ))}
              {filteredSessions.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    No sessions found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          {isLoadingMore && (
            <div className="flex items-center justify-center py-4 text-slate-500">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              <span className="text-sm">Loading more sessions...</span>
            </div>
          )}
        </div>
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 text-xs text-slate-500 flex justify-between">
          <span>Showing {displayedSessions.length} of {filteredSessions.length} sessions</span>
          <span>{hasMore ? 'Scroll down to load more' : 'End of list'}</span>
        </div>
      </div>
    </div>
  );
};
