import React, { useEffect, useState } from 'react';
import { Project } from '../types';
import { traceService } from '../services/traceService';
import { 
  AlertTriangle, Bell, Settings, Slack, Check, X, 
  AlertCircle, TrendingUp, Clock, ChevronRight, ExternalLink,
  ToggleLeft, ToggleRight, Save, TestTube
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine
} from 'recharts';

interface AlertsPageProps {
  project: Project;
}

interface AlertConfig {
  errorAnomaly: {
    enabled: boolean;
    threshold: number; // standard deviations
    minErrors: number;
  };
  usageAnomaly: {
    enabled: boolean;
    threshold: number;
    minRequests: number;
  };
  slack: {
    enabled: boolean;
    webhookUrl: string;
    channel: string;
  };
}

interface AnomalyData {
  errorAnomaly: {
    current5minRate: number;
    avg24hRate: number;
    stdDev: number;
    isAnomaly: boolean;
    deviations: number;
  };
  usageAnomaly: {
    current5minUsage: number;
    avg24hUsage: number;
    stdDev: number;
    isAnomaly: boolean;
    deviations: number;
  };
  recentAlerts: {
    id: string;
    type: 'error' | 'usage';
    time: string;
    message: string;
    severity: 'warning' | 'critical';
    resolved: boolean;
  }[];
  errorTrend: { time: string; rate: number; avg: number }[];
  usageTrend: { time: string; count: number; avg: number }[];
}

const DEFAULT_CONFIG: AlertConfig = {
  errorAnomaly: {
    enabled: true,
    threshold: 4,
    minErrors: 5
  },
  usageAnomaly: {
    enabled: true,
    threshold: 4,
    minRequests: 100
  },
  slack: {
    enabled: false,
    webhookUrl: '',
    channel: '#alerts'
  }
};

// Toggle Switch Component
const Toggle = ({ enabled, onChange }: { enabled: boolean; onChange: (v: boolean) => void }) => (
  <button
    onClick={() => onChange(!enabled)}
    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
      enabled ? 'bg-primary-600' : 'bg-slate-200'
    }`}
  >
    <span
      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
        enabled ? 'translate-x-6' : 'translate-x-1'
      }`}
    />
  </button>
);

// Alert Type Card
const AlertTypeCard = ({ 
  title, 
  description, 
  enabled, 
  onToggle,
  icon: Icon,
  status,
  children 
}: { 
  title: string;
  description: string;
  enabled: boolean;
  onToggle: (v: boolean) => void;
  icon: any;
  status?: { isAnomaly: boolean; deviations: number };
  children?: React.ReactNode;
}) => (
  <div className={`bg-white rounded-lg border shadow-sm overflow-hidden ${
    status?.isAnomaly ? 'border-red-300' : 'border-slate-200'
  }`}>
    <div className="p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
            status?.isAnomaly ? 'bg-red-100' : 'bg-slate-100'
          }`}>
            <Icon className={`w-5 h-5 ${status?.isAnomaly ? 'text-red-600' : 'text-slate-600'}`} />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">{title}</h3>
            <p className="text-sm text-slate-500">{description}</p>
          </div>
        </div>
        <Toggle enabled={enabled} onChange={onToggle} />
      </div>
      
      {status && (
        <div className={`p-3 rounded-lg ${status.isAnomaly ? 'bg-red-50' : 'bg-green-50'}`}>
          <div className="flex items-center gap-2">
            {status.isAnomaly ? (
              <AlertTriangle className="w-4 h-4 text-red-600" />
            ) : (
              <Check className="w-4 h-4 text-green-600" />
            )}
            <span className={`text-sm font-medium ${status.isAnomaly ? 'text-red-700' : 'text-green-700'}`}>
              {status.isAnomaly 
                ? `Anomaly detected (${status.deviations.toFixed(1)}σ above average)`
                : 'Normal levels'
              }
            </span>
          </div>
        </div>
      )}
      
      {children}
    </div>
  </div>
);

export const AlertsPage: React.FC<AlertsPageProps> = ({ project }) => {
  const [activeTab, setActiveTab] = useState<'alerts' | 'settings'>('alerts');
  const [config, setConfig] = useState<AlertConfig>(DEFAULT_CONFIG);
  const [anomalyData, setAnomalyData] = useState<AnomalyData | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [testingSlack, setTestingSlack] = useState(false);

  const traceProjectId = project.linkedTraceProjectId || project.name;

  // Load config from localStorage
  useEffect(() => {
    const savedConfig = localStorage.getItem(`alert-config-${traceProjectId}`);
    if (savedConfig) {
      setConfig(JSON.parse(savedConfig));
    }
  }, [traceProjectId]);

  // Calculate anomaly data
  useEffect(() => {
    const calculateAnomalies = async () => {
      const traces = await traceService.getTraces(traceProjectId);
      const now = new Date();
      const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000);
      const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      // Filter traces
      const last24h = traces.filter(t => new Date(t.start_time) >= twentyFourHoursAgo);
      const last5min = traces.filter(t => new Date(t.start_time) >= fiveMinAgo);

      // Calculate error rates
      const errors24h = last24h.filter(t => t.status !== 'OK');
      const errors5min = last5min.filter(t => t.status !== 'OK');
      
      const errorRate24h = last24h.length > 0 ? (errors24h.length / last24h.length) * 100 : 0;
      const errorRate5min = last5min.length > 0 ? (errors5min.length / last5min.length) * 100 : 0;

      // Calculate hourly error rates for std dev
      const hourlyErrors: number[] = [];
      for (let i = 0; i < 24; i++) {
        const hourStart = new Date(now.getTime() - (i + 1) * 60 * 60 * 1000);
        const hourEnd = new Date(now.getTime() - i * 60 * 60 * 1000);
        const hourTraces = traces.filter(t => {
          const time = new Date(t.start_time);
          return time >= hourStart && time < hourEnd;
        });
        const hourErrors = hourTraces.filter(t => t.status !== 'OK');
        hourlyErrors.push(hourTraces.length > 0 ? (hourErrors.length / hourTraces.length) * 100 : 0);
      }

      const avgErrorRate = hourlyErrors.reduce((a, b) => a + b, 0) / hourlyErrors.length || 0;
      const errorStdDev = Math.sqrt(
        hourlyErrors.reduce((sum, rate) => sum + Math.pow(rate - avgErrorRate, 2), 0) / hourlyErrors.length
      ) || 1;
      const errorDeviations = errorStdDev > 0 ? (errorRate5min - avgErrorRate) / errorStdDev : 0;

      // Calculate usage
      const hourlyUsage: number[] = [];
      for (let i = 0; i < 24; i++) {
        const hourStart = new Date(now.getTime() - (i + 1) * 60 * 60 * 1000);
        const hourEnd = new Date(now.getTime() - i * 60 * 60 * 1000);
        const hourTraces = traces.filter(t => {
          const time = new Date(t.start_time);
          return time >= hourStart && time < hourEnd;
        });
        hourlyUsage.push(hourTraces.length);
      }

      const avgUsage = hourlyUsage.reduce((a, b) => a + b, 0) / hourlyUsage.length || 0;
      const usageStdDev = Math.sqrt(
        hourlyUsage.reduce((sum, count) => sum + Math.pow(count - avgUsage, 2), 0) / hourlyUsage.length
      ) || 1;
      const usage5min = last5min.length * 12; // Extrapolate to hourly
      const usageDeviations = usageStdDev > 0 ? (usage5min - avgUsage) / usageStdDev : 0;

      // Build trend data
      const errorTrend: { time: string; rate: number; avg: number }[] = [];
      const usageTrend: { time: string; count: number; avg: number }[] = [];
      
      for (let i = 23; i >= 0; i--) {
        const hourStart = new Date(now.getTime() - (i + 1) * 60 * 60 * 1000);
        const hourEnd = new Date(now.getTime() - i * 60 * 60 * 1000);
        const hourLabel = hourEnd.getHours().toString().padStart(2, '0') + ':00';
        
        errorTrend.push({
          time: hourLabel,
          rate: hourlyErrors[i] || 0,
          avg: avgErrorRate
        });
        
        usageTrend.push({
          time: hourLabel,
          count: hourlyUsage[i] || 0,
          avg: avgUsage
        });
      }

      // Generate mock recent alerts
      const recentAlerts: AnomalyData['recentAlerts'] = [];
      if (errorDeviations > config.errorAnomaly.threshold) {
        recentAlerts.push({
          id: '1',
          type: 'error',
          time: now.toISOString(),
          message: `Error rate is ${errorDeviations.toFixed(1)} standard deviations above average`,
          severity: errorDeviations > 6 ? 'critical' : 'warning',
          resolved: false
        });
      }

      setAnomalyData({
        errorAnomaly: {
          current5minRate: errorRate5min,
          avg24hRate: avgErrorRate,
          stdDev: errorStdDev,
          isAnomaly: errorDeviations > config.errorAnomaly.threshold && errors5min.length >= config.errorAnomaly.minErrors,
          deviations: errorDeviations
        },
        usageAnomaly: {
          current5minUsage: usage5min,
          avg24hUsage: avgUsage,
          stdDev: usageStdDev,
          isAnomaly: usageDeviations > config.usageAnomaly.threshold && usage5min >= config.usageAnomaly.minRequests,
          deviations: usageDeviations
        },
        recentAlerts,
        errorTrend,
        usageTrend
      });
    };

    calculateAnomalies();
    const interval = setInterval(calculateAnomalies, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [traceProjectId, config]);

  const saveConfig = () => {
    setIsSaving(true);
    localStorage.setItem(`alert-config-${traceProjectId}`, JSON.stringify(config));
    setTimeout(() => {
      setIsSaving(false);
      setSaveMessage('Settings saved successfully');
      setTimeout(() => setSaveMessage(null), 3000);
    }, 500);
  };

  const testSlackWebhook = async () => {
    if (!config.slack.webhookUrl) {
      setSaveMessage('Please enter a Slack webhook URL');
      return;
    }

    setTestingSlack(true);
    try {
      // In production, this would go through your backend
      // For now, we'll simulate a test
      await new Promise(resolve => setTimeout(resolve, 1000));
      setSaveMessage('Test message sent to Slack! (simulated)');
    } catch (error) {
      setSaveMessage('Failed to send test message');
    }
    setTestingSlack(false);
    setTimeout(() => setSaveMessage(null), 3000);
  };

  if (!anomalyData) {
    return <div className="p-10 text-center text-slate-500">Loading alert data...</div>;
  }

  return (
    <div className="space-y-6">

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex gap-6">
          <button
            onClick={() => setActiveTab('alerts')}
            className={`py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'alerts' 
                ? 'border-primary-600 text-primary-600' 
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Bell className="w-4 h-4" />
            Alert Status
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'settings' 
                ? 'border-primary-600 text-primary-600' 
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Settings className="w-4 h-4" />
            Settings
          </button>
        </nav>
      </div>

      {activeTab === 'alerts' && (
        <div className="space-y-6">
          {/* Active Alerts Banner */}
          {(anomalyData.errorAnomaly.isAnomaly || anomalyData.usageAnomaly.isAnomaly) && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-red-800">Active Anomaly Detected</h4>
                  <ul className="text-sm text-red-600 mt-1 space-y-1">
                    {anomalyData.errorAnomaly.isAnomaly && (
                      <li>• Error rate is {anomalyData.errorAnomaly.deviations.toFixed(1)}σ above 24h average</li>
                    )}
                    {anomalyData.usageAnomaly.isAnomaly && (
                      <li>• Usage is {anomalyData.usageAnomaly.deviations.toFixed(1)}σ above 24h average</li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Alert Type Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Error Anomaly */}
            <AlertTypeCard
              title="Error Anomaly"
              description="5-minute error rate vs 24-hour average"
              enabled={config.errorAnomaly.enabled}
              onToggle={(v) => setConfig({ ...config, errorAnomaly: { ...config.errorAnomaly, enabled: v } })}
              icon={AlertCircle}
              status={anomalyData.errorAnomaly}
            >
              <div className="mt-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Current 5-min rate</span>
                  <span className="font-medium text-slate-900">{anomalyData.errorAnomaly.current5minRate.toFixed(2)}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">24h average</span>
                  <span className="font-medium text-slate-900">{anomalyData.errorAnomaly.avg24hRate.toFixed(2)}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Threshold</span>
                  <span className="font-medium text-slate-900">{config.errorAnomaly.threshold}σ above average</span>
                </div>
              </div>
              
              {/* Mini Chart */}
              <div className="mt-4 h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={anomalyData.errorTrend}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="time" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} interval={5} />
                    <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} unit="%" />
                    <Tooltip 
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                    />
                    <ReferenceLine y={anomalyData.errorAnomaly.avg24hRate} stroke="#94a3b8" strokeDasharray="3 3" />
                    <Area type="monotone" dataKey="rate" stroke="#ef4444" fill="#fecaca" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </AlertTypeCard>

            {/* Usage Anomaly */}
            <AlertTypeCard
              title="Usage Anomaly"
              description="5-minute request count vs 24-hour average"
              enabled={config.usageAnomaly.enabled}
              onToggle={(v) => setConfig({ ...config, usageAnomaly: { ...config.usageAnomaly, enabled: v } })}
              icon={TrendingUp}
              status={anomalyData.usageAnomaly}
            >
              <div className="mt-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Current 5-min (hourly rate)</span>
                  <span className="font-medium text-slate-900">{Math.round(anomalyData.usageAnomaly.current5minUsage)} req/h</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">24h average</span>
                  <span className="font-medium text-slate-900">{Math.round(anomalyData.usageAnomaly.avg24hUsage)} req/h</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Threshold</span>
                  <span className="font-medium text-slate-900">{config.usageAnomaly.threshold}σ above average</span>
                </div>
              </div>
              
              {/* Mini Chart */}
              <div className="mt-4 h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={anomalyData.usageTrend}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="time" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} interval={5} />
                    <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                    />
                    <ReferenceLine y={anomalyData.usageAnomaly.avg24hUsage} stroke="#94a3b8" strokeDasharray="3 3" />
                    <Area type="monotone" dataKey="count" stroke="#3b82f6" fill="#bfdbfe" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </AlertTypeCard>
          </div>


          {/* Recent Alert History */}
          <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200">
              <h3 className="font-semibold text-slate-900">Recent Alert History</h3>
            </div>
            {anomalyData.recentAlerts.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {anomalyData.recentAlerts.map(alert => (
                  <div key={alert.id} className="px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${
                        alert.resolved ? 'bg-green-500' : alert.severity === 'critical' ? 'bg-red-500' : 'bg-amber-500'
                      }`} />
                      <div>
                        <p className="text-sm font-medium text-slate-900">
                          {alert.type === 'error' ? 'Error Anomaly' : 'Usage Anomaly'}
                        </p>
                        <p className="text-xs text-slate-500">{alert.message}</p>
                      </div>
                    </div>
                    <div className="text-xs text-slate-400">
                      {new Date(alert.time).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-6 py-12 text-center text-slate-500">
                <Bell className="w-8 h-8 mx-auto mb-3 text-slate-300" />
                <p>No alerts triggered recently</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="space-y-6">
          {/* Save Message */}
          {saveMessage && (
            <div className={`p-4 rounded-lg ${
              saveMessage.includes('success') || saveMessage.includes('sent') 
                ? 'bg-green-50 text-green-700 border border-green-200' 
                : 'bg-amber-50 text-amber-700 border border-amber-200'
            }`}>
              {saveMessage}
            </div>
          )}

          {/* Alert Thresholds */}
          <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200">
              <h3 className="font-semibold text-slate-900">Alert Thresholds</h3>
              <p className="text-sm text-slate-500 mt-1">Configure when alerts should be triggered</p>
            </div>
            <div className="p-6 space-y-6">
              {/* Error Anomaly Settings */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-slate-900">Error Anomaly</h4>
                    <p className="text-sm text-slate-500">Alert when error rate spikes abnormally</p>
                  </div>
                  <Toggle 
                    enabled={config.errorAnomaly.enabled} 
                    onChange={(v) => setConfig({ ...config, errorAnomaly: { ...config.errorAnomaly, enabled: v } })}
                  />
                </div>
                {config.errorAnomaly.enabled && (
                  <div className="grid grid-cols-2 gap-4 pl-4 border-l-2 border-slate-100">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Standard Deviations
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={config.errorAnomaly.threshold}
                        onChange={(e) => setConfig({
                          ...config,
                          errorAnomaly: { ...config.errorAnomaly, threshold: Number(e.target.value) }
                        })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                      />
                      <p className="text-xs text-slate-400 mt-1">Alert when rate exceeds Nσ above average</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Minimum Errors
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={config.errorAnomaly.minErrors}
                        onChange={(e) => setConfig({
                          ...config,
                          errorAnomaly: { ...config.errorAnomaly, minErrors: Number(e.target.value) }
                        })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                      />
                      <p className="text-xs text-slate-400 mt-1">Minimum errors to trigger alert</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Usage Anomaly Settings */}
              <div className="space-y-4 pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-slate-900">Usage Anomaly</h4>
                    <p className="text-sm text-slate-500">Alert when request volume spikes abnormally</p>
                  </div>
                  <Toggle 
                    enabled={config.usageAnomaly.enabled} 
                    onChange={(v) => setConfig({ ...config, usageAnomaly: { ...config.usageAnomaly, enabled: v } })}
                  />
                </div>
                {config.usageAnomaly.enabled && (
                  <div className="grid grid-cols-2 gap-4 pl-4 border-l-2 border-slate-100">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Standard Deviations
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={config.usageAnomaly.threshold}
                        onChange={(e) => setConfig({
                          ...config,
                          usageAnomaly: { ...config.usageAnomaly, threshold: Number(e.target.value) }
                        })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                      />
                      <p className="text-xs text-slate-400 mt-1">Alert when usage exceeds Nσ above average</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Minimum Requests/Hour
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={config.usageAnomaly.minRequests}
                        onChange={(e) => setConfig({
                          ...config,
                          usageAnomaly: { ...config.usageAnomaly, minRequests: Number(e.target.value) }
                        })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                      />
                      <p className="text-xs text-slate-400 mt-1">Minimum requests to trigger alert</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Slack Integration */}
          <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <Slack className="w-5 h-5 text-[#4A154B]" />
                <div>
                  <h3 className="font-semibold text-slate-900">Slack Notifications</h3>
                  <p className="text-sm text-slate-500">Get alerts sent directly to your Slack channel</p>
                </div>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-slate-900">Enable Slack Alerts</h4>
                  <p className="text-sm text-slate-500">Send alert notifications to Slack</p>
                </div>
                <Toggle 
                  enabled={config.slack.enabled} 
                  onChange={(v) => setConfig({ ...config, slack: { ...config.slack, enabled: v } })}
                />
              </div>

              {config.slack.enabled && (
                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Webhook URL
                    </label>
                    <input
                      type="url"
                      placeholder="https://hooks.slack.com/services/..."
                      value={config.slack.webhookUrl}
                      onChange={(e) => setConfig({
                        ...config,
                        slack: { ...config.slack, webhookUrl: e.target.value }
                      })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                    />
                    <p className="text-xs text-slate-400 mt-1">
                      <a 
                        href="https://api.slack.com/messaging/webhooks" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary-600 hover:underline inline-flex items-center gap-1"
                      >
                        Learn how to create a webhook <ExternalLink className="w-3 h-3" />
                      </a>
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Channel
                    </label>
                    <input
                      type="text"
                      placeholder="#alerts"
                      value={config.slack.channel}
                      onChange={(e) => setConfig({
                        ...config,
                        slack: { ...config.slack, channel: e.target.value }
                      })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                    />
                  </div>

                  <button
                    onClick={testSlackWebhook}
                    disabled={testingSlack || !config.slack.webhookUrl}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <TestTube className="w-4 h-4" />
                    {testingSlack ? 'Sending...' : 'Send Test Message'}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              onClick={saveConfig}
              disabled={isSaving}
              className="flex items-center gap-2 px-6 py-2.5 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
