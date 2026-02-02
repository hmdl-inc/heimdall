import React, { useEffect, useState } from 'react';
import { Project, Trace } from '../types';
import { traceService, ClientAnalytics } from '../services/traceService';
import { Monitor, AlertCircle, Users, Activity, Zap, Clock } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { TraceDetailPage } from './TraceDetailPage';

interface ClientsPageProps {
  project: Project;
}

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

// Stat Card Component
const StatCard = ({ title, value, subtitle, icon: Icon, color = 'blue' }: { 
  title: string; 
  value: string | number; 
  subtitle?: string;
  icon: any;
  color?: 'blue' | 'green' | 'red' | 'amber';
}) => {
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    red: 'bg-red-50 text-red-600',
    amber: 'bg-amber-50 text-amber-600'
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

export const ClientsPage: React.FC<ClientsPageProps> = ({ project }) => {
  const [analytics, setAnalytics] = useState<ClientAnalytics | null>(null);
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [clientTraces, setClientTraces] = useState<Trace[]>([]);
  const [selectedTrace, setSelectedTrace] = useState<Trace | null>(null);

  const traceProjectId = project.linkedTraceProjectId || project.id;

  useEffect(() => {
    const loadData = async () => {
      const data = await traceService.getClientAnalytics(traceProjectId);
      setAnalytics(data);
    };
    loadData();
  }, [traceProjectId]);

  // Load traces for selected client
  useEffect(() => {
    if (selectedClient) {
      const loadClientTraces = async () => {
        const traces = await traceService.getTraces(traceProjectId);
        setClientTraces(traces.filter(t => t.client_type === selectedClient).slice(0, 100));
      };
      loadClientTraces();
    }
  }, [selectedClient, traceProjectId]);

  // Show trace detail
  if (selectedTrace) {
    return (
      <TraceDetailPage 
        trace={selectedTrace} 
        onBack={() => setSelectedTrace(null)}
        onUserClick={() => {}}
      />
    );
  }

  // Show client detail
  if (selectedClient && analytics) {
    const clientData = analytics.clients.find(c => c.name === selectedClient);
    
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setSelectedClient(null)}
            className="text-sm text-slate-600 hover:text-slate-900 flex items-center gap-1"
          >
            ← Back to Clients
          </button>
        </div>

        {clientData && (
          <>
            <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Monitor className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">{selectedClient}</h2>
                  <p className="text-sm text-slate-500">Client Analytics</p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-slate-50 rounded-lg">
                  <p className="text-sm text-slate-500">Total Requests</p>
                  <p className="text-2xl font-bold text-slate-900">{clientData.totalRequests}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-lg">
                  <p className="text-sm text-slate-500">Unique Users</p>
                  <p className="text-2xl font-bold text-slate-900">{clientData.uniqueUsers}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-lg">
                  <p className="text-sm text-slate-500">Error Rate</p>
                  <p className={`text-2xl font-bold ${clientData.errorRate > 5 ? 'text-red-600' : 'text-slate-900'}`}>
                    {clientData.errorRate}%
                  </p>
                </div>
                <div className="p-4 bg-slate-50 rounded-lg">
                  <p className="text-sm text-slate-500">Avg Latency</p>
                  <p className="text-2xl font-bold text-slate-900">{clientData.avgLatency}ms</p>
                </div>
              </div>
            </div>

            {/* Recent Traces */}
            <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200">
                <h3 className="text-base font-semibold text-slate-900">Recent Traces from {selectedClient}</h3>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500 text-xs border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3 text-left font-medium">Time</th>
                    <th className="px-6 py-3 text-left font-medium">Name</th>
                    <th className="px-6 py-3 text-left font-medium">Status</th>
                    <th className="px-6 py-3 text-left font-medium">Latency</th>
                    <th className="px-6 py-3 text-left font-medium">User</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {clientTraces.map((trace) => (
                    <tr 
                      key={trace.trace_id}
                      className="hover:bg-slate-50/50 cursor-pointer"
                      onClick={() => setSelectedTrace(trace)}
                    >
                      <td className="px-6 py-3 text-slate-500 text-xs">
                        {new Date(trace.start_time).toLocaleString()}
                      </td>
                      <td className="px-6 py-3 font-medium text-slate-900">{trace.name}</td>
                      <td className="px-6 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          trace.status === 'OK' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {trace.status}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-slate-600">{trace.latency_ms}ms</td>
                      <td className="px-6 py-3 text-slate-600">{trace.user_id}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    );
  }

  if (!analytics) {
    return <div className="p-10 text-center text-slate-500">Loading client analytics...</div>;
  }

  const totalRequests = analytics.clients.reduce((sum, c) => sum + c.totalRequests, 0);
  const totalErrors = analytics.clients.reduce((sum, c) => sum + c.errorCount, 0);
  const avgErrorRate = totalRequests > 0 ? Math.round((totalErrors / totalRequests) * 100 * 10) / 10 : 0;
  const totalUsers = analytics.clients.reduce((sum, c) => sum + c.uniqueUsers, 0);

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Total Clients" 
          value={analytics.clients.length} 
          subtitle="Active client types"
          icon={Monitor}
          color="blue"
        />
        <StatCard 
          title="Total Requests" 
          value={totalRequests.toLocaleString()} 
          subtitle="Across all clients"
          icon={Activity}
          color="green"
        />
        <StatCard 
          title="Overall Error Rate" 
          value={`${avgErrorRate}%`} 
          subtitle={`${totalErrors} total errors`}
          icon={AlertCircle}
          color={avgErrorRate > 5 ? 'red' : 'green'}
        />
        <StatCard 
          title="Total Users" 
          value={totalUsers} 
          subtitle="Using any client"
          icon={Users}
          color="amber"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Requests by Client Pie Chart */}
        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
          <h3 className="text-base font-semibold text-slate-900 mb-4">Requests by Client</h3>
          <div className="h-64 flex items-center">
            <ResponsiveContainer width="60%" height="100%">
              <PieChart>
                <Pie
                  data={analytics.requestsByClient}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {analytics.requestsByClient.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-2">
              {analytics.requestsByClient.map((item, index) => (
                <div key={item.name} className="flex items-center gap-2 text-sm">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                  <span className="text-slate-600">{item.name}</span>
                  <span className="text-slate-400 ml-auto">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Error Rate by Client */}
        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
          <h3 className="text-base font-semibold text-slate-900 mb-4">Error Rate by Client</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.clients} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" />
                <XAxis type="number" domain={[0, 'auto']} tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} unit="%" />
                <YAxis type="category" dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} width={80} />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: number) => [`${value}%`, 'Error Rate']}
                />
                <Bar dataKey="errorRate" fill="#ef4444" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Client Details Table */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h3 className="text-base font-semibold text-slate-900">Client Details</h3>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs border-b border-slate-200">
            <tr>
              <th className="px-6 py-3 text-left font-medium">Client</th>
              <th className="px-6 py-3 text-right font-medium">Requests</th>
              <th className="px-6 py-3 text-right font-medium">Users</th>
              <th className="px-6 py-3 text-right font-medium">Errors</th>
              <th className="px-6 py-3 text-right font-medium">Error Rate</th>
              <th className="px-6 py-3 text-right font-medium">Avg Latency</th>
              <th className="px-6 py-3 text-right font-medium">P50</th>
              <th className="px-6 py-3 text-right font-medium">P95</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {analytics.clients.map((client) => (
              <tr 
                key={client.name}
                className="hover:bg-slate-50/50 cursor-pointer"
                onClick={() => setSelectedClient(client.name)}
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                      <Monitor className="w-4 h-4 text-blue-600" />
                    </div>
                    <span className="font-medium text-slate-900">{client.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-right text-slate-600">{client.totalRequests.toLocaleString()}</td>
                <td className="px-6 py-4 text-right text-slate-600">{client.uniqueUsers}</td>
                <td className="px-6 py-4 text-right">
                  {client.errorCount > 0 ? (
                    <span className="text-red-600 font-medium">{client.errorCount}</span>
                  ) : (
                    <span className="text-slate-400">0</span>
                  )}
                </td>
                <td className="px-6 py-4 text-right">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                    client.errorRate > 10 ? 'bg-red-100 text-red-700' :
                    client.errorRate > 5 ? 'bg-amber-100 text-amber-700' :
                    'bg-green-100 text-green-700'
                  }`}>
                    {client.errorRate}%
                  </span>
                </td>
                <td className="px-6 py-4 text-right text-slate-600">{client.avgLatency}ms</td>
                <td className="px-6 py-4 text-right text-slate-600">{client.p50Latency}ms</td>
                <td className="px-6 py-4 text-right text-slate-600">{client.p95Latency}ms</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
