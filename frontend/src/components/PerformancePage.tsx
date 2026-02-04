import React, { useEffect, useState } from 'react';
import { Project } from '../types';
import { traceService, PerformanceAnalytics, ErrorAnalytics } from '../services/traceService';
import { Clock, AlertCircle, XCircle } from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area, Legend, PieChart, Pie, Cell
} from 'recharts';
import { TraceDetailPage } from './TraceDetailPage';

interface PerformancePageProps {
  project: Project;
}

const COLORS = ['#ef4444', '#f59e0b', '#3b82f6', '#22c55e', '#8b5cf6', '#ec4899'];

// Stat Card Component
const StatCard = ({ title, value, subtitle, icon: Icon, color = 'blue' }: { 
  title: string; 
  value: string | number; 
  subtitle?: string;
  icon: any;
  color?: 'blue' | 'green' | 'amber' | 'red';
}) => {
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    amber: 'bg-amber-50 text-amber-600',
    red: 'bg-red-50 text-red-600'
  };

  return (
    <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
          {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
        </div>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colors[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
};

export const PerformancePage: React.FC<PerformancePageProps> = ({ project }) => {
  const [perfAnalytics, setPerfAnalytics] = useState<PerformanceAnalytics | null>(null);
  const [errorAnalytics, setErrorAnalytics] = useState<ErrorAnalytics | null>(null);
  const [selectedTraceId, setSelectedTraceId] = useState<string | null>(null);
  const [selectedTrace, setSelectedTrace] = useState<any>(null);

  const traceProjectId = project.linkedTraceProjectId || project.name;

  useEffect(() => {
    const loadData = async () => {
      const [perfData, errorData] = await Promise.all([
        traceService.getPerformanceAnalytics(traceProjectId),
        traceService.getErrorAnalytics(traceProjectId)
      ]);
      setPerfAnalytics(perfData);
      setErrorAnalytics(errorData);
    };
    loadData();
  }, [traceProjectId]);

  // Load selected trace details
  useEffect(() => {
    if (selectedTraceId) {
      const loadTrace = async () => {
        const traces = await traceService.getTraces(traceProjectId);
        const trace = traces.find(t => t.trace_id === selectedTraceId);
        setSelectedTrace(trace);
      };
      loadTrace();
    }
  }, [selectedTraceId, traceProjectId]);

  if (selectedTrace) {
    return (
      <TraceDetailPage 
        trace={selectedTrace} 
        onBack={() => {
          setSelectedTrace(null);
          setSelectedTraceId(null);
        }}
        onUserClick={() => {}}
      />
    );
  }

  if (!perfAnalytics || !errorAnalytics) {
    return <div className="p-10 text-center text-slate-500">Loading performance metrics...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard 
          title="Error Rate" 
          value={`${errorAnalytics.errorRate}%`} 
          subtitle="Of all requests"
          icon={AlertCircle}
          color={errorAnalytics.errorRate > 10 ? 'red' : errorAnalytics.errorRate > 5 ? 'amber' : 'green'}
        />
        <StatCard 
          title="Total Errors" 
          value={errorAnalytics.totalErrors} 
          subtitle="All time"
          icon={XCircle}
          color="red"
        />
        <StatCard 
          title="Avg Latency" 
          value={`${perfAnalytics.avgLatency}ms`} 
          subtitle="All requests"
          icon={Clock}
          color="blue"
        />
      </div>

      {/* Charts Row 1: Error Focus */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Error Trend */}
        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
          <h3 className="text-base font-semibold text-slate-900 mb-4">Error Rate Trend</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={errorAnalytics.errorTrend}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} unit="%" />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend />
                <Area type="monotone" dataKey="rate" name="Error Rate" stroke="#ef4444" fill="#fecaca" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Errors by Type */}
        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
          <h3 className="text-base font-semibold text-slate-900 mb-4">Errors by Type</h3>
          <div className="h-64 flex items-center">
            <ResponsiveContainer width="55%" height="100%">
              <PieChart>
                <Pie
                  data={errorAnalytics.errorsByType}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="count"
                  nameKey="type"
                >
                  {errorAnalytics.errorsByType.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-2">
              {errorAnalytics.errorsByType.map((item, index) => (
                <div key={item.type} className="flex items-center gap-2 text-sm">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                  <span className="text-slate-600 truncate flex-1">{item.type}</span>
                  <span className="text-slate-500 text-xs">{item.percentage}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row 2: Latency & Error by Client */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Latency Distribution */}
        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
          <h3 className="text-base font-semibold text-slate-900 mb-4">Response Time Distribution</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={perfAnalytics.latencyDistribution}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="range" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Error Rate by Client */}
        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
          <h3 className="text-base font-semibold text-slate-900 mb-4">Error Rate by Client</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={errorAnalytics.errorsByClient} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" />
                <XAxis type="number" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} unit="%" />
                <YAxis type="category" dataKey="client" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} width={80} />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: number) => [`${value}%`, 'Error Rate']}
                />
                <Bar dataKey="rate" fill="#ef4444" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Tool Performance Table */}
      <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
        <h3 className="text-base font-semibold text-slate-900 mb-4">Tool Performance</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-slate-500 text-xs border-b border-slate-100">
                <th className="text-left font-semibold pb-3">Tool</th>
                <th className="text-right font-semibold pb-3">Requests</th>
                <th className="text-right font-semibold pb-3">Avg Latency</th>
                <th className="text-right font-semibold pb-3">Error Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {perfAnalytics.toolLatencies.map((tool) => {
                const errorRate = tool.errorRate ?? 0;
                return (
                  <tr key={tool.tool} className="text-slate-600 hover:bg-slate-50">
                    <td className="py-3 font-medium text-slate-900">{tool.tool}</td>
                    <td className="py-3 text-right">{tool.count}</td>
                    <td className="py-3 text-right">{tool.avg}ms</td>
                    <td className="py-3 text-right">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        errorRate > 10 ? 'bg-red-100 text-red-700' :
                        errorRate > 5 ? 'bg-amber-100 text-amber-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {errorRate}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Errors Table */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-900">Recent Errors</h3>
          <span className="text-xs text-slate-500">Latest 20 errors</span>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs border-b border-slate-200">
            <tr>
              <th className="px-6 py-3 text-left font-medium">Time</th>
              <th className="px-6 py-3 text-left font-medium">Trace ID</th>
              <th className="px-6 py-3 text-left font-medium">Name</th>
              <th className="px-6 py-3 text-left font-medium">Error Type</th>
              <th className="px-6 py-3 text-left font-medium">Client</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {errorAnalytics.recentErrors.slice(0, 10).map((error) => (
              <tr 
                key={error.traceId}
                className="hover:bg-slate-50/50 cursor-pointer"
                onClick={() => setSelectedTraceId(error.traceId)}
              >
                <td className="px-6 py-3 text-slate-500 text-xs">
                  {new Date(error.time).toLocaleString()}
                </td>
                <td className="px-6 py-3 font-mono text-xs text-slate-500">
                  {error.traceId.substring(0, 8)}...
                </td>
                <td className="px-6 py-3 font-medium text-slate-900">{error.name}</td>
                <td className="px-6 py-3">
                  <span className="inline-flex items-center px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-medium">
                    {error.errorType}
                  </span>
                </td>
                <td className="px-6 py-3">
                  <span className="inline-block px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">
                    {error.client}
                  </span>
                </td>
              </tr>
            ))}
            {errorAnalytics.recentErrors.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                  No errors recorded
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
