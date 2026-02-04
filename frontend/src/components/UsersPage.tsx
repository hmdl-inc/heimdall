import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Project, Trace } from '../types';
import { traceService, UserAnalytics } from '../services/traceService';
import { Search, User as UserIcon, Loader2, Users, UserPlus, ArrowUp, ArrowDown, Package, Settings } from 'lucide-react';
import { TraceDetailPage } from './TraceDetailPage';
import { UserDetailPage } from './UserDetailPage';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface PackageConfig {
  npm?: string;
  pypi?: string;
}

interface DownloadData {
  date: string;
  npm: number;
  pypi: number;
}

interface DownloadStats {
  totalNpm: number;
  totalPypi: number;
  trend: DownloadData[];
  lastUpdated: string;
}

interface UsersPageProps {
  project: Project;
}

interface UserStat {
  userId: string;
  firstEvent: string;
  lastEvent: string;
  totalEvents: number;
  clients: string[];
  traces: Trace[];
}

// Stat Card Component
const StatCard = ({ title, value, subtitle, icon: Icon, trend }: { 
  title: string; 
  value: string | number; 
  subtitle?: string;
  icon: any;
  trend?: { value: number; positive: boolean };
}) => (
  <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
        {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
      </div>
      <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center">
        <Icon className="w-5 h-5 text-primary-600" />
      </div>
    </div>
    {trend && (
      <div className={`flex items-center gap-1 mt-3 text-xs font-medium ${trend.positive ? 'text-green-600' : 'text-red-600'}`}>
        {trend.positive ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
        <span>{Math.abs(trend.value)}% vs last week</span>
      </div>
    )}
  </div>
);

const PAGE_SIZE = 50;

export const UsersPage: React.FC<UsersPageProps> = ({ project }) => {
  const [users, setUsers] = useState<UserStat[]>([]);
  const [analytics, setAnalytics] = useState<UserAnalytics | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserStat | null>(null);
  const [selectedTrace, setSelectedTrace] = useState<Trace | null>(null);
  const [displayLimit, setDisplayLimit] = useState(PAGE_SIZE);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const tableContainerRef = useRef<HTMLDivElement>(null);
  
  // Package downloads config
  const [packageConfig, setPackageConfig] = useState<PackageConfig>(() => {
    const saved = localStorage.getItem('heimdall-package-config');
    return saved ? JSON.parse(saved) : {};
  });
  const [isEditingPackages, setIsEditingPackages] = useState(false);
  const [tempNpm, setTempNpm] = useState(packageConfig.npm || '');
  const [tempPypi, setTempPypi] = useState(packageConfig.pypi || '');
  const [downloadStats, setDownloadStats] = useState<DownloadStats | null>(() => {
    const saved = localStorage.getItem('heimdall-download-stats');
    return saved ? JSON.parse(saved) : null;
  });
  const [isLoadingDownloads, setIsLoadingDownloads] = useState(false);

  // Use linkedTraceProjectId if available, otherwise use project.name (SDK uses name as project ID)
  const traceProjectId = project.linkedTraceProjectId || project.name;
  
  // Fetch npm download stats
  const fetchNpmDownloads = async (packageName: string): Promise<{ total: number; daily: { date: string; downloads: number }[] }> => {
    try {
      const response = await fetch(`https://api.npmjs.org/downloads/range/last-month/${packageName}`);
      if (!response.ok) throw new Error('Failed to fetch npm stats');
      const data = await response.json();
      const daily = data.downloads.map((d: { day: string; downloads: number }) => ({
        date: d.day,
        downloads: d.downloads
      }));
      const total = daily.reduce((sum: number, d: { downloads: number }) => sum + d.downloads, 0);
      return { total, daily };
    } catch (error) {
      console.error('Error fetching npm downloads:', error);
      return { total: 0, daily: [] };
    }
  };

  // Fetch PyPI download stats  
  const fetchPypiDownloads = async (packageName: string): Promise<{ total: number; daily: { date: string; downloads: number }[] }> => {
    try {
      // PyPI stats API - get last 30 days
      const response = await fetch(`https://pypistats.org/api/packages/${packageName}/overall?period=day`);
      if (!response.ok) throw new Error('Failed to fetch PyPI stats');
      const data = await response.json();
      
      // Get last 30 days of data
      const recentData = data.data
        .filter((d: { category: string }) => d.category === 'without_mirrors')
        .slice(-30)
        .map((d: { date: string; downloads: number }) => ({
          date: d.date,
          downloads: d.downloads
        }));
      
      const total = recentData.reduce((sum: number, d: { downloads: number }) => sum + d.downloads, 0);
      return { total, daily: recentData };
    } catch (error) {
      console.error('Error fetching PyPI downloads:', error);
      return { total: 0, daily: [] };
    }
  };

  // Fetch all download stats
  const fetchDownloadStats = async () => {
    if (!packageConfig.npm && !packageConfig.pypi) return;
    
    setIsLoadingDownloads(true);
    try {
      const [npmData, pypiData] = await Promise.all([
        packageConfig.npm ? fetchNpmDownloads(packageConfig.npm) : Promise.resolve({ total: 0, daily: [] }),
        packageConfig.pypi ? fetchPypiDownloads(packageConfig.pypi) : Promise.resolve({ total: 0, daily: [] })
      ]);

      // Merge data by date
      const dateMap = new Map<string, { npm: number; pypi: number }>();
      
      npmData.daily.forEach(d => {
        const existing = dateMap.get(d.date) || { npm: 0, pypi: 0 };
        existing.npm = d.downloads;
        dateMap.set(d.date, existing);
      });
      
      pypiData.daily.forEach(d => {
        const existing = dateMap.get(d.date) || { npm: 0, pypi: 0 };
        existing.pypi = d.downloads;
        dateMap.set(d.date, existing);
      });

      // Sort by date and create trend array
      const trend = Array.from(dateMap.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([date, values]) => ({
          date: date.slice(5), // MM-DD format
          npm: values.npm,
          pypi: values.pypi
        }));

      const stats: DownloadStats = {
        totalNpm: npmData.total,
        totalPypi: pypiData.total,
        trend,
        lastUpdated: new Date().toISOString()
      };

      setDownloadStats(stats);
      localStorage.setItem('heimdall-download-stats', JSON.stringify(stats));
    } catch (error) {
      console.error('Error fetching download stats:', error);
    } finally {
      setIsLoadingDownloads(false);
    }
  };

  // Check if we need to refresh download stats (once per day)
  useEffect(() => {
    const hasPackages = packageConfig.npm || packageConfig.pypi;
    if (!hasPackages) return;

    const lastUpdated = downloadStats?.lastUpdated;
    const now = new Date();
    const shouldRefresh = !lastUpdated || 
      (now.getTime() - new Date(lastUpdated).getTime() > 24 * 60 * 60 * 1000); // 24 hours

    if (shouldRefresh) {
      fetchDownloadStats();
    }
  }, [packageConfig.npm, packageConfig.pypi]);
  
  const savePackageConfig = () => {
    const newConfig: PackageConfig = {};
    if (tempNpm.trim()) newConfig.npm = tempNpm.trim();
    if (tempPypi.trim()) newConfig.pypi = tempPypi.trim();
    setPackageConfig(newConfig);
    localStorage.setItem('heimdall-package-config', JSON.stringify(newConfig));
    setIsEditingPackages(false);
    
    // Clear old stats if packages changed
    if (newConfig.npm !== packageConfig.npm || newConfig.pypi !== packageConfig.pypi) {
      setDownloadStats(null);
      localStorage.removeItem('heimdall-download-stats');
      // Trigger fetch after state update
      setTimeout(() => fetchDownloadStats(), 100);
    }
  };
  
  const hasPackages = packageConfig.npm || packageConfig.pypi;
  
  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  useEffect(() => {
    const loadData = async () => {
      // Load user analytics
      const analyticsData = await traceService.getUserAnalytics(traceProjectId);
      setAnalytics(analyticsData);

      // Load users list
      const traces = await traceService.getTraces(traceProjectId);
      const userMap: Record<string, { traces: Trace[] }> = {};

      traces.forEach(t => {
        if (!userMap[t.user_id]) userMap[t.user_id] = { traces: [] };
        userMap[t.user_id].traces.push(t);
      });

      const stats: UserStat[] = Object.entries(userMap).map(([userId, data]) => {
        const userTraces = data.traces;
        
        // Sort traces by time
        userTraces.sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());
        
        // Get unique clients
        const clients = [...new Set(userTraces.map(t => t.client_type))];

        return {
          userId,
          totalEvents: userTraces.length,
          firstEvent: userTraces[userTraces.length - 1].start_time,
          lastEvent: userTraces[0].start_time,
          clients,
          traces: userTraces
        };
      });

      setUsers(stats.sort((a, b) => new Date(b.lastEvent).getTime() - new Date(a.lastEvent).getTime()));
    };
    loadData();
  }, [traceProjectId]);

  // Reset display limit when search term changes
  useEffect(() => {
    setDisplayLimit(PAGE_SIZE);
  }, [searchTerm]);

  const filteredUsers = users.filter(u => u.userId.toLowerCase().includes(searchTerm.toLowerCase()));
  const hasMore = displayLimit < filteredUsers.length;

  const loadMore = useCallback(() => {
    if (isLoadingMore || !hasMore) return;
    
    setIsLoadingMore(true);
    setTimeout(() => {
      setDisplayLimit(prev => Math.min(prev + PAGE_SIZE, filteredUsers.length));
      setIsLoadingMore(false);
    }, 300);
  }, [isLoadingMore, hasMore, filteredUsers.length]);

  // Infinite scroll handler
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

  const displayedUsers = filteredUsers.slice(0, displayLimit);

  // Handle user click from trace detail
  const handleUserClickFromTrace = (userId: string) => {
    const user = users.find(u => u.userId === userId);
    if (user) {
      setSelectedTrace(null);
      setSelectedUser(user);
    }
  };

  // Show trace detail page if a trace is selected
  if (selectedTrace) {
    return (
      <TraceDetailPage 
        trace={selectedTrace} 
        onBack={() => setSelectedTrace(null)}
        onUserClick={handleUserClickFromTrace}
      />
    );
  }

  // Show user detail page if a user is selected
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

  return (
    <div className="space-y-6">
      {/* Downloads Section */}
      <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-slate-600" />
            <h3 className="text-base font-semibold text-slate-900">Package Downloads</h3>
          </div>
          <button
            onClick={() => {
              setTempNpm(packageConfig.npm || '');
              setTempPypi(packageConfig.pypi || '');
              setIsEditingPackages(true);
            }}
            className="text-slate-400 hover:text-slate-600 p-1"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
        
        {isEditingPackages ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">npm Package Name</label>
              <input
                type="text"
                value={tempNpm}
                onChange={(e) => setTempNpm(e.target.value)}
                placeholder="e.g., react, lodash"
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">PyPI Package Name</label>
              <input
                type="text"
                value={tempPypi}
                onChange={(e) => setTempPypi(e.target.value)}
                placeholder="e.g., requests, numpy"
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={savePackageConfig}
                className="px-4 py-2 bg-primary-600 text-white rounded-md text-sm font-medium hover:bg-primary-700"
              >
                Save
              </button>
              <button
                onClick={() => setIsEditingPackages(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-md text-sm font-medium hover:bg-slate-200"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : hasPackages ? (
          <div className="space-y-4">
            {/* Download Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {packageConfig.npm && (
                <div className="bg-red-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <svg className="w-4 h-4 text-red-600" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M0 7.334v8h6.666v1.332H12v-1.332h12v-8H0zm6.666 6.664H5.334v-4H3.999v4H1.335V8.667h5.331v5.331zm4 0v1.336H8.001V8.667h5.334v5.332h-2.669v-.001zm12.001 0h-1.33v-4h-1.336v4h-1.335v-4h-1.33v4h-2.671V8.667h8.002v5.331zM10.665 10H12v2.667h-1.335V10z"/>
                    </svg>
                    <span className="text-xs font-medium text-red-700">{packageConfig.npm}</span>
                  </div>
                  <p className="text-2xl font-bold text-red-900">
                    {isLoadingDownloads ? '...' : formatNumber(downloadStats?.totalNpm || 0)}
                  </p>
                  <p className="text-xs text-red-600">Downloads (30 days)</p>
                </div>
              )}
              {packageConfig.pypi && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <svg className="w-4 h-4 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M14.25.18l.9.2.73.26.59.3.45.32.34.34.25.34.16.33.1.3.04.26.02.2-.01.13V8.5l-.05.63-.13.55-.21.46-.26.38-.3.31-.33.25-.35.19-.35.14-.33.1-.3.07-.26.04-.21.02H8.77l-.69.05-.59.14-.5.22-.41.27-.33.32-.27.35-.2.36-.15.37-.1.35-.07.32-.04.27-.02.21v3.06H3.17l-.21-.03-.28-.07-.32-.12-.35-.18-.36-.26-.36-.36-.35-.46-.32-.59-.28-.73-.21-.88-.14-1.05-.05-1.23.06-1.22.16-1.04.24-.87.32-.71.36-.57.4-.44.42-.33.42-.24.4-.16.36-.1.32-.05.24-.01h.16l.06.01h8.16v-.83H6.18l-.01-2.75-.02-.37.05-.34.11-.31.17-.28.25-.26.31-.23.38-.2.44-.18.51-.15.58-.12.64-.1.71-.06.77-.04.84-.02 1.27.05zm-6.3 1.98l-.23.33-.08.41.08.41.23.34.33.22.41.09.41-.09.33-.22.23-.34.08-.41-.08-.41-.23-.33-.33-.22-.41-.09-.41.09zm13.09 3.95l.28.06.32.12.35.18.36.27.36.35.35.47.32.59.28.73.21.88.14 1.04.05 1.23-.06 1.23-.16 1.04-.24.86-.32.71-.36.57-.4.45-.42.33-.42.24-.4.16-.36.09-.32.05-.24.02-.16-.01h-8.22v.82h5.84l.01 2.76.02.36-.05.34-.11.31-.17.29-.25.25-.31.24-.38.2-.44.17-.51.15-.58.13-.64.09-.71.07-.77.04-.84.01-1.27-.04-1.07-.14-.9-.2-.73-.25-.59-.3-.45-.33-.34-.34-.25-.34-.16-.33-.1-.3-.04-.25-.02-.2.01-.13v-5.34l.05-.64.13-.54.21-.46.26-.38.3-.32.33-.24.35-.2.35-.14.33-.1.3-.06.26-.04.21-.02.13-.01h5.84l.69-.05.59-.14.5-.21.41-.28.33-.32.27-.35.2-.36.15-.36.1-.35.07-.32.04-.28.02-.21V6.07h2.09l.14.01zm-6.47 14.25l-.23.33-.08.41.08.41.23.33.33.23.41.08.41-.08.33-.23.23-.33.08-.41-.08-.41-.23-.33-.33-.23-.41-.08-.41.08z"/>
                    </svg>
                    <span className="text-xs font-medium text-blue-700">{packageConfig.pypi}</span>
                  </div>
                  <p className="text-2xl font-bold text-blue-900">
                    {isLoadingDownloads ? '...' : formatNumber(downloadStats?.totalPypi || 0)}
                  </p>
                  <p className="text-xs text-blue-600">Downloads (30 days)</p>
                </div>
              )}
            </div>
            
            {/* Download Trend Chart */}
            {downloadStats && downloadStats.trend.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium text-slate-700 mb-3">Daily Downloads (Last 30 Days)</h4>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={downloadStats.trend}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} interval={4} />
                      <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => formatNumber(v)} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        formatter={(value: number) => [formatNumber(value), '']}
                      />
                      <Legend />
                      {packageConfig.npm && <Line type="monotone" dataKey="npm" name="npm" stroke="#dc2626" strokeWidth={2} dot={false} />}
                      {packageConfig.pypi && <Line type="monotone" dataKey="pypi" name="PyPI" stroke="#2563eb" strokeWidth={2} dot={false} />}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                {downloadStats.lastUpdated && (
                  <p className="text-xs text-slate-400 mt-2 text-right">
                    Last updated: {new Date(downloadStats.lastUpdated).toLocaleString()}
                    <button 
                      onClick={fetchDownloadStats} 
                      disabled={isLoadingDownloads}
                      className="ml-2 text-primary-600 hover:text-primary-700 disabled:text-slate-400"
                    >
                      {isLoadingDownloads ? 'Loading...' : 'Refresh'}
                    </button>
                  </p>
                )}
              </div>
            )}
            
            {isLoadingDownloads && !downloadStats && (
              <div className="flex items-center justify-center py-8 text-slate-500">
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                <span className="text-sm">Fetching download statistics...</span>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-6">
            <p className="text-sm text-slate-500 mb-3">Configure your package names to track downloads</p>
            <button
              onClick={() => setIsEditingPackages(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors"
            >
              <Settings className="w-4 h-4" />
              Configure Packages
            </button>
          </div>
        )}
      </div>

      {/* Active User Growth Chart */}
      {analytics && analytics.activeUserTrend && (
        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
          <h3 className="text-base font-semibold text-slate-900 mb-4">Active User Growth</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={analytics.activeUserTrend}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend />
                <Line type="monotone" dataKey="dau" name="DAU" stroke="#3b82f6" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="wau" name="WAU" stroke="#22c55e" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="mau" name="MAU" stroke="#8b5cf6" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-center gap-6 mt-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <span className="text-slate-600">DAU: <span className="font-semibold text-slate-900">{analytics.dau}</span></span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="text-slate-600">WAU: <span className="font-semibold text-slate-900">{analytics.wau}</span></span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-violet-500"></div>
              <span className="text-slate-600">MAU: <span className="font-semibold text-slate-900">{analytics.mau}</span></span>
            </div>
          </div>
        </div>
      )}

      {/* Analytics Cards */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard 
            title="Total Users" 
            value={analytics.totalUsers} 
            subtitle="All time"
            icon={Users}
          />
          <StatCard 
            title="New Users Today" 
            value={analytics.newUsersToday} 
            subtitle={`${analytics.newUsersThisWeek} this week`}
            icon={UserPlus}
            trend={{ value: 5, positive: true }}
          />
          <StatCard 
            title="Day 7 Retention" 
            value={`${analytics.retentionCohort[0]?.day7 >= 0 ? analytics.retentionCohort[0]?.day7 : 0}%`} 
            subtitle="Return rate after 7 days"
            icon={Users}
          />
        </div>
      )}

      {/* Retention & User Segments */}
      {analytics && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Retention Cohort */}
          <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
            <h3 className="text-base font-semibold text-slate-900 mb-4">Retention Cohort</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-slate-500 text-xs border-b border-slate-100">
                    <th className="text-left font-semibold pb-2">Cohort</th>
                    <th className="text-right font-semibold pb-2">Users</th>
                    <th className="text-right font-semibold pb-2">Day 1</th>
                    <th className="text-right font-semibold pb-2">Day 7</th>
                    <th className="text-right font-semibold pb-2">Day 14</th>
                    <th className="text-right font-semibold pb-2">Day 30</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {analytics.retentionCohort.map((row, i) => {
                    const renderCell = (value: number, thresholds: { good: number; warn: number }) => {
                      if (value === -1) {
                        return <span className="px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-400">-</span>;
                      }
                      const colorClass = value >= thresholds.good 
                        ? 'bg-green-100 text-green-700' 
                        : value >= thresholds.warn 
                          ? 'bg-yellow-100 text-yellow-700' 
                          : 'bg-red-100 text-red-700';
                      return <span className={`px-2 py-0.5 rounded text-xs ${colorClass}`}>{value}%</span>;
                    };
                    
                    return (
                      <tr key={i} className="text-slate-600">
                        <td className="py-2 font-medium text-slate-900">{row.cohort}</td>
                        <td className="py-2 text-right font-medium">{row.users}</td>
                        <td className="py-2 text-right">{renderCell(row.day1, { good: 50, warn: 30 })}</td>
                        <td className="py-2 text-right">{renderCell(row.day7, { good: 30, warn: 15 })}</td>
                        <td className="py-2 text-right">{renderCell(row.day14, { good: 20, warn: 10 })}</td>
                        <td className="py-2 text-right">{renderCell(row.day30, { good: 15, warn: 5 })}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Users by Client */}
          <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
            <h3 className="text-base font-semibold text-slate-900 mb-4">Users by Client</h3>
            <div className="space-y-3">
              {analytics.usersByClient.map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-20 text-sm font-medium text-slate-700">{item.client}</div>
                  <div className="flex-1 h-8 bg-slate-100 rounded overflow-hidden relative">
                    <div 
                      className="absolute top-0 left-0 h-full bg-blue-500 rounded transition-all duration-500"
                      style={{ width: `${item.percentage}%` }}
                    />
                    <div className="absolute inset-0 flex items-center px-3">
                      <span className="text-xs font-medium text-slate-700">{item.count} users ({item.percentage}%)</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-sm">
              <span className="text-slate-500">Total Users</span>
              <span className="font-semibold text-slate-900">{analytics.totalUsers}</span>
            </div>
          </div>
        </div>
      )}

      {/* Header Controls */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">All Users</h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search users..." 
            className="pl-9 pr-4 py-2 border border-slate-300 rounded-md text-sm w-64 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden flex flex-col" style={{ maxHeight: 'calc(100vh - 200px)' }}>
        <div ref={tableContainerRef} className="overflow-auto flex-1">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 sticky top-0">
              <tr>
                <th className="px-6 py-3 font-medium">User ID</th>
                <th className="px-6 py-3 font-medium">First Event</th>
                <th className="px-6 py-3 font-medium">Last Event</th>
                <th className="px-6 py-3 font-medium">Total Events</th>
                <th className="px-6 py-3 font-medium">Client</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayedUsers.map((user) => (
                <tr 
                  key={user.userId}
                  className="hover:bg-slate-50/50 cursor-pointer"
                  onClick={() => setSelectedUser(user)}
                >
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 bg-slate-100 rounded-full flex items-center justify-center">
                        <UserIcon className="w-4 h-4 text-slate-500" />
                      </div>
                      <span className="font-medium text-slate-900">{user.userId}</span>
                    </div>
                  </td>
                  <td className="px-6 py-3 text-slate-600 text-xs">
                    {new Date(user.firstEvent).toLocaleString()}
                  </td>
                  <td className="px-6 py-3 text-slate-600 text-xs">
                    {new Date(user.lastEvent).toLocaleString()}
                  </td>
                  <td className="px-6 py-3">
                    <span className="inline-flex items-center px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-xs font-medium">
                      {user.totalEvents}
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex flex-wrap gap-1">
                      {user.clients.map(client => (
                        <span key={client} className="inline-block px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">
                          {client}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    No users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          {/* Loading indicator */}
          {isLoadingMore && (
            <div className="flex items-center justify-center py-4 text-slate-500">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              <span className="text-sm">Loading more users...</span>
            </div>
          )}
        </div>
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 text-xs text-slate-500 flex justify-between">
          <span>Showing {displayedUsers.length} of {filteredUsers.length} users</span>
          <span>{hasMore ? 'Scroll down to load more' : 'End of list'}</span>
        </div>
      </div>
    </div>
  );
};
