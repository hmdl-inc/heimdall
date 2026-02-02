import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { LoginForm } from './components/LoginForm';
import { SignupForm } from './components/SignupForm';
import { DashboardLayout, TimeRange, TIME_RANGE_OPTIONS } from './components/DashboardLayout';
import { SettingsPage } from './components/SettingsPage';
import { TracingPage } from './components/TracingPage';
import { UsersPage } from './components/UsersPage';
import { SessionsPage } from './components/SessionsPage';
import { ClientsPage } from './components/ClientsPage';
import { PerformancePage } from './components/PerformancePage';
import { AlertsPage } from './components/AlertsPage';
import { authService } from './services/authService';
import { traceService } from './services/traceService';
import { User, Organization, Project } from './types';
import { Button } from './components/ui/Button';
import { Input } from './components/ui/Input';
import { Building2, Box, X, Construction } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

// --- MODAL COMPONENT ---
const Modal = ({ isOpen, onClose, children }: { isOpen: boolean; onClose: () => void; children: React.ReactNode }) => {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full mx-4 animate-in fade-in zoom-in-95 duration-200">
        {children}
      </div>
    </div>
  );
};

// --- CREATE ORG MODAL ---
const CreateOrgModal = ({ 
  isOpen, 
  onClose, 
  onSubmit 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onSubmit: (name: string) => Promise<void>;
}) => {
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsLoading(true);
    await onSubmit(name);
    setIsLoading(false);
    setName('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5 text-primary-600" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900">Create Organization</h2>
          </div>
          <button type="button" onClick={onClose} className="p-1 hover:bg-slate-100 rounded">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>
        <div className="p-4">
          <Input 
            label="Organization Name" 
            placeholder="e.g. Acme Corp" 
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
        </div>
        <div className="flex justify-end gap-2 p-4 border-t border-slate-100 bg-slate-50 rounded-b-xl">
          <Button variant="ghost" type="button" onClick={onClose}>Cancel</Button>
          <Button type="submit" isLoading={isLoading} disabled={!name.trim()}>Create</Button>
        </div>
      </form>
    </Modal>
  );
};

// --- CREATE PROJECT MODAL ---
const CreateProjectModal = ({ 
  isOpen, 
  onClose, 
  onSubmit,
  organizationId
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onSubmit: (name: string, orgId: string) => Promise<void>;
  organizationId: string;
}) => {
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsLoading(true);
    await onSubmit(name, organizationId);
    setIsLoading(false);
    setName('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center">
              <Box className="w-5 h-5 text-indigo-600" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900">Create Project</h2>
          </div>
          <button type="button" onClick={onClose} className="p-1 hover:bg-slate-100 rounded">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>
        <div className="p-4">
          <Input 
            label="Project Name" 
            placeholder="e.g. Production Backend" 
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
        </div>
        <div className="flex justify-end gap-2 p-4 border-t border-slate-100 bg-slate-50 rounded-b-xl">
          <Button variant="ghost" type="button" onClick={onClose}>Cancel</Button>
          <Button type="submit" isLoading={isLoading} disabled={!name.trim()}>Create</Button>
        </div>
      </form>
    </Modal>
  );
};

// --- SETUP PAGE COMPONENT ---
const SetupPage = ({ onSuccess, userId }: { onSuccess: () => void, userId: string }) => {
  const [orgName, setOrgName] = useState('');
  const [projName, setProjName] = useState('');
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  const handleFinish = async () => {
    if (!orgName || !projName || !userId) return;
    setIsLoading(true);
    await authService.createOrganizationAndProject(userId, orgName, projName);
    setIsLoading(false);
    onSuccess();
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="flex justify-center mb-8">
            <div className="flex items-center gap-2">
                <span className="text-3xl mr-2">🏎️</span>
                <span className="text-2xl font-bold text-slate-900">Lombard</span>
            </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="p-8">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold border-2 ${step >= 1 ? 'border-primary-600 text-primary-600' : 'border-slate-300 text-slate-400'}`}>1</div>
                    <div className="h-0.5 w-12 bg-slate-200"></div>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold border-2 ${step >= 2 ? 'border-primary-600 text-primary-600' : 'border-slate-300 text-slate-400'}`}>2</div>
                </div>
                <span className="text-sm font-medium text-slate-500">Step {step} of 2</span>
            </div>

            {step === 1 && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="mb-6">
                    <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center mb-4">
                        <Building2 className="w-6 h-6 text-primary-600" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-900">Create Organization</h2>
                    <p className="text-slate-500 mt-1">This will be the root of your workspace.</p>
                </div>
                <Input 
                    label="Organization Name" 
                    placeholder="e.g. Acme Corp" 
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    autoFocus
                />
                <div className="mt-8 flex justify-end">
                    <Button onClick={() => setStep(2)} disabled={!orgName}>Continue</Button>
                </div>
              </div>
            )}

            {step === 2 && (
               <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                 <div className="mb-6">
                    <div className="w-12 h-12 bg-indigo-50 rounded-lg flex items-center justify-center mb-4">
                        <Box className="w-6 h-6 text-indigo-600" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-900">Create Project</h2>
                    <p className="text-slate-500 mt-1">A project holds your traces and metrics.</p>
                </div>
                <Input 
                    label="Project Name" 
                    placeholder="e.g. Production Backend" 
                    value={projName}
                    onChange={(e) => setProjName(e.target.value)}
                    autoFocus
                />
                 <div className="mt-8 flex justify-between">
                    <Button variant="ghost" onClick={() => setStep(1)}>Back</Button>
                    <Button onClick={handleFinish} isLoading={isLoading} disabled={!projName}>Create Workspace</Button>
                </div>
               </div>
            )}
          </div>
          <div className="bg-slate-50 px-8 py-4 border-t border-slate-100 flex items-center gap-2">
             <div className="w-2 h-2 rounded-full bg-green-500"></div>
             <span className="text-xs text-slate-500 font-medium">Secure Environment</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- COMING SOON PLACEHOLDER ---
const ComingSoonPage = ({ title }: { title: string }) => (
  <div className="flex flex-col items-center justify-center py-20">
    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-6">
      <Construction className="w-8 h-8 text-slate-400" />
    </div>
    <h2 className="text-xl font-semibold text-slate-900 mb-2">{title}</h2>
    <p className="text-slate-500 text-center max-w-md">
      This feature is currently under development. Check back soon!
    </p>
  </div>
);

// --- MAIN DASHBOARD COMPONENT ---
const DashboardHome = ({ project, timeRange }: { project: Project; timeRange: TimeRange }) => {
  const [stats, setStats] = useState<any>(null);
  const [userStats, setUserStats] = useState<any>(null);
  const [sessionStats, setSessionStats] = useState<any>(null);
  const [perfStats, setPerfStats] = useState<any>(null);

  const timeRangeHours = TIME_RANGE_OPTIONS.find(t => t.value === timeRange)?.hours ?? 0;
  // Use linkedTraceProjectId if available, otherwise use project.id
  const traceProjectId = project.linkedTraceProjectId || project.id;

  useEffect(() => {
    const loadData = async () => {
      setStats(null); // Reset while loading
      const [statsData, userData, sessionData, perfData] = await Promise.all([
        traceService.getStats(traceProjectId, timeRangeHours),
        traceService.getUserAnalytics(traceProjectId),
        traceService.getSessionAnalytics(traceProjectId),
        traceService.getPerformanceAnalytics(traceProjectId)
      ]);
      setStats(statsData);
      setUserStats(userData);
      setSessionStats(sessionData);
      setPerfStats(perfData);
    };
    loadData();
  }, [traceProjectId, timeRangeHours]);

  if (!stats) return <div className="p-10 text-center text-slate-500">Loading metrics...</div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Top Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
          <p className="text-xs font-medium text-slate-500 mb-1">Total Traces</p>
          <p className="text-2xl font-bold text-slate-900">{stats.totalTraces}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
          <p className="text-xs font-medium text-slate-500 mb-1">Total Users</p>
          <p className="text-2xl font-bold text-slate-900">{userStats?.totalUsers || 0}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
          <p className="text-xs font-medium text-slate-500 mb-1">Error Rate (This Week)</p>
          <p className={`text-2xl font-bold ${stats.errorRate > 5 ? 'text-red-500' : 'text-slate-900'}`}>{stats.errorRate}%</p>
        </div>
      </div>

      {/* Charts Row: Active Users & Sessions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active User Growth */}
        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
          <h3 className="text-base font-semibold text-slate-900 mb-4">Active User Growth</h3>
          {userStats?.activeUserTrend && userStats.activeUserTrend.length > 0 ? (
            <>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={userStats.activeUserTrend.slice(-7)}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Legend />
                    <Line type="monotone" dataKey="dau" name="DAU" stroke="#3b82f6" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="wau" name="WAU" stroke="#22c55e" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="mau" name="MAU" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center justify-center gap-6 mt-3 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  <span className="text-slate-600">DAU: <span className="font-semibold">{userStats.dau}</span></span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span className="text-slate-600">WAU: <span className="font-semibold">{userStats.wau}</span></span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-violet-500"></div>
                  <span className="text-slate-600">MAU: <span className="font-semibold">{userStats.mau}</span></span>
                </div>
              </div>
            </>
          ) : (
            <div className="text-sm text-slate-400 text-center py-8">No user data</div>
          )}
        </div>

        {/* Sessions (Weekly) */}
        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
          <h3 className="text-base font-semibold text-slate-900 mb-4">Sessions (Last 7 Days)</h3>
          {sessionStats?.sessionsByDay && sessionStats.sessionsByDay.length > 0 ? (
            <>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={sessionStats.sessionsByDay}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Line type="monotone" dataKey="count" name="Sessions" stroke="#f59e0b" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center justify-center gap-6 mt-3 text-sm">
                <span className="text-slate-600">Today: <span className="font-semibold">{sessionStats.sessionsToday}</span></span>
                <span className="text-slate-600">Total: <span className="font-semibold">{sessionStats.totalSessions}</span></span>
              </div>
            </>
          ) : (
            <div className="text-sm text-slate-400 text-center py-8">No session data</div>
          )}
        </div>
      </div>

      {/* Middle Row: Volume Chart & Top Tools */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         <div className="lg:col-span-2 bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
            <h3 className="text-base font-semibold text-slate-900 mb-6">Daily Volume</h3>
            <div className="h-64 w-full">
               <ResponsiveContainer width="100%" height="100%">
                 <LineChart data={stats.chartData}>
                   <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                   <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fill: '#64748b', fontSize: 12}} 
                        dy={10}
                    />
                   <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fill: '#64748b', fontSize: 12}} 
                    />
                   <Tooltip 
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                   <Line 
                        type="monotone" 
                        dataKey="value" 
                        stroke="#3b82f6" 
                        strokeWidth={2} 
                        dot={false}
                        activeDot={{ r: 4, strokeWidth: 0 }}
                    />
                 </LineChart>
               </ResponsiveContainer>
            </div>
         </div>

         <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
            <h3 className="text-base font-semibold text-slate-900 mb-4">Top Tools</h3>
            <div className="space-y-3">
                {stats.topTools.map((item: any, i: number) => (
                    <div key={i} className="flex items-center text-sm">
                        <span className="w-24 truncate font-medium text-slate-600">{item.name}</span>
                        <div className="flex-1 mx-3 h-6 bg-slate-50 rounded overflow-hidden relative">
                            <div className="absolute top-0 left-0 h-full bg-blue-100 rounded" style={{ width: item.width }}></div>
                        </div>
                        <span className="w-10 text-right font-medium text-slate-900">{item.count}</span>
                    </div>
                ))}
            </div>
            {stats.topTools.length === 0 && (
              <div className="text-sm text-slate-400 text-center py-8">No tool data yet</div>
            )}
         </div>
      </div>

      {/* Clients */}
      <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
         <h3 className="text-base font-semibold text-slate-900 mb-4">Client Distribution</h3>
         {stats.clientData.length > 0 ? (
           <div className="h-48">
             <ResponsiveContainer width="100%" height="100%">
               <PieChart>
                 <Pie
                   data={stats.clientData.map((item: any) => ({ name: item.label, value: item.count }))}
                   cx="50%"
                   cy="50%"
                   innerRadius={40}
                   outerRadius={70}
                   paddingAngle={2}
                   dataKey="value"
                 >
                   {stats.clientData.map((_: any, index: number) => (
                     <Cell key={`cell-${index}`} fill={['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'][index % 6]} />
                   ))}
                 </Pie>
                 <Tooltip />
                 <Legend 
                   layout="horizontal" 
                   align="center" 
                   verticalAlign="bottom"
                   formatter={(value) => <span className="text-sm text-slate-600">{value}</span>}
                 />
               </PieChart>
             </ResponsiveContainer>
           </div>
         ) : (
           <div className="text-sm text-slate-400 text-center py-8">No client data</div>
         )}
      </div>

      {/* Full Width: Performance Table */}
      <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
         <h3 className="text-base font-semibold text-slate-900 mb-4">Performance</h3>
         <div className="overflow-x-auto">
             <table className="w-full text-sm">
                 <thead>
                     <tr className="text-slate-500 text-xs border-b border-slate-100">
                         <th className="text-left font-semibold pb-3">TOOL NAME</th>
                         <th className="text-right font-semibold pb-3">COUNT</th>
                         <th className="text-right font-semibold pb-3">AVG</th>
                         <th className="text-right font-semibold pb-3">P50</th>
                         <th className="text-right font-semibold pb-3">P95</th>
                         <th className="text-right font-semibold pb-3">ERRORS</th>
                         <th className="text-right font-semibold pb-3">ERROR RATE</th>
                     </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-50">
                     {perfStats?.toolLatencies?.map((row: any, i: number) => {
                         const errorCount = Math.round(row.count * row.errorRate / 100);
                         return (
                           <tr key={i} className="text-slate-600 hover:bg-slate-50">
                               <td className="py-3 font-medium text-slate-900">{row.tool}</td>
                               <td className="py-3 text-right text-slate-500">{row.count}</td>
                               <td className="py-3 text-right">{row.avg}ms</td>
                               <td className="py-3 text-right">{row.p50}ms</td>
                               <td className="py-3 text-right">
                                 <span className={row.p95 > 1000 ? 'text-amber-600 font-medium' : ''}>{row.p95}ms</span>
                               </td>
                               <td className="py-3 text-right">
                                 <span className={errorCount > 0 ? 'text-red-600 font-medium' : 'text-slate-500'}>{errorCount}</span>
                               </td>
                               <td className="py-3 text-right">
                                 <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                   row.errorRate > 10 ? 'bg-red-100 text-red-700' :
                                   row.errorRate > 5 ? 'bg-amber-100 text-amber-700' :
                                   'bg-green-100 text-green-700'
                                 }`}>
                                   {row.errorRate}%
                                 </span>
                               </td>
                           </tr>
                         );
                     })}
                 </tbody>
             </table>
             {(!perfStats?.toolLatencies || perfStats.toolLatencies.length === 0) && (
               <div className="text-sm text-slate-400 text-center py-8">No performance data available</div>
             )}
         </div>
      </div>
    </div>
  );
};


// --- APP CONTAINER ---
const AppContainer = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(null);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Time range state
  const [timeRange, setTimeRange] = useState<TimeRange>('all');

  // Organizations & Projects lists
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);

  // Modal states
  const [createOrgModalOpen, setCreateOrgModalOpen] = useState(false);
  const [createProjectModalOpen, setCreateProjectModalOpen] = useState(false);

  // Load all orgs and projects
  const loadOrgsAndProjects = async () => {
    const orgs = await authService.getAllOrganizations();
    const projs = await authService.getAllProjects();
    setOrganizations(orgs);
    setProjects(projs);
  };

  useEffect(() => {
    const initAuth = async () => {
      // Check Auth
      const user = authService.getCurrentUser();
      if (user) {
        setCurrentUser(user);
        // Check Org/Project scoped to user
        const org = await authService.getOrganization(user.id);
        const proj = await authService.getProject(user.id);
        setCurrentOrg(org);
        setCurrentProject(proj);
        
        // Load all orgs and projects for dropdown
        await loadOrgsAndProjects();
      }
      setLoading(false);
    };
    initAuth();
  }, []);

  const handleLoginSuccess = async (user: User) => {
    setCurrentUser(user);
    // After login, check if org exists for this user
    const org = await authService.getOrganization(user.id);
    if (org) {
        setCurrentOrg(org);
        const proj = await authService.getProject(user.id);
        setCurrentProject(proj);
        await loadOrgsAndProjects();
        navigate('/');
    } else {
        // Redirect to setup if no org
        navigate('/setup');
    }
  };

  const handleSetupSuccess = async () => {
      if (currentUser) {
          const org = await authService.getOrganization(currentUser.id);
          const proj = await authService.getProject(currentUser.id);
          setCurrentOrg(org);
          setCurrentProject(proj);
          await loadOrgsAndProjects();
          navigate('/');
      }
  };

  const handleLogout = () => {
    authService.logout();
    setCurrentUser(null);
    setCurrentOrg(null);
    setCurrentProject(null);
    navigate('/login');
  };

  const handleUpdateProject = (updatedProject: Project) => {
      setCurrentProject(updatedProject);
  };

  const handleSelectOrg = (org: Organization) => {
    setCurrentOrg(org);
    // Find a project that belongs to this org
    const projectsInOrg = projects.filter(p => p.organizationId === org.id);
    if (projectsInOrg.length > 0) {
      setCurrentProject(projectsInOrg[0]);
    } else {
      setCurrentProject(null);
    }
    // Clear trace cache when switching
    traceService.clearCache();
  };

  const handleSelectProject = (project: Project) => {
    setCurrentProject(project);
    // Clear trace cache when switching
    traceService.clearCache();
  };

  const handleCreateOrg = async (name: string) => {
    if (!currentUser) return;
    const newOrg = await authService.createOrganization(currentUser.id, name);
    await loadOrgsAndProjects();
    setCurrentOrg(newOrg);
    setCurrentProject(null);
  };

  const handleCreateProject = async (name: string, orgId: string) => {
    if (!currentUser) return;
    const newProject = await authService.createProject(currentUser.id, name, orgId);
    await loadOrgsAndProjects();
    setCurrentProject(newProject);
  };

  // Filter projects by current org
  const filteredProjects = currentOrg 
    ? projects.filter(p => p.organizationId === currentOrg.id)
    : projects;

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center text-slate-500">
        <div className="animate-pulse flex flex-col items-center">
          <span className="text-4xl mb-4 opacity-30">🏎️</span>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Modals */}
      <CreateOrgModal 
        isOpen={createOrgModalOpen} 
        onClose={() => setCreateOrgModalOpen(false)}
        onSubmit={handleCreateOrg}
      />
      <CreateProjectModal 
        isOpen={createProjectModalOpen} 
        onClose={() => setCreateProjectModalOpen(false)}
        onSubmit={handleCreateProject}
        organizationId={currentOrg?.id || ''}
      />

      <Routes>
        <Route 
          path="/login" 
          element={
            currentUser ? <Navigate to="/" /> : (
              <LoginForm 
                onSuccess={handleLoginSuccess} 
                onToggleMode={() => navigate('/signup')} 
              />
            )
          } 
        />
        <Route 
          path="/signup" 
          element={
            currentUser ? <Navigate to="/" /> : (
              <SignupForm 
                onSuccess={handleLoginSuccess} 
                onToggleMode={() => navigate('/login')} 
              />
            )
          } 
        />
        
        {/* Setup Route */}
        <Route
          path="/setup"
          element={
              currentUser ? (
                  currentOrg ? <Navigate to="/" /> : <SetupPage onSuccess={handleSetupSuccess} userId={currentUser.id} />
              ) : (
                  <Navigate to="/login" />
              )
          }
        />

        {/* Protected routes with DashboardLayout */}
        <Route 
          path="/*" 
          element={
            currentUser ? (
               !currentOrg ? (
                  <Navigate to="/setup" />
               ) : (
                  <DashboardLayout 
                      user={currentUser} 
                      org={currentOrg} 
                      project={currentProject} 
                      onLogout={handleLogout}
                      timeRange={timeRange}
                      onTimeRangeChange={setTimeRange}
                      organizations={organizations}
                      projects={filteredProjects}
                      onSelectOrg={handleSelectOrg}
                      onSelectProject={handleSelectProject}
                      onCreateOrg={() => setCreateOrgModalOpen(true)}
                      onCreateProject={() => setCreateProjectModalOpen(true)}
                  >
                    <Routes>
                      {/* Home & Dashboard */}
                      <Route path="/" element={currentProject ? <DashboardHome project={currentProject} timeRange={timeRange} /> : null} />
                      <Route path="/dashboard" element={currentProject ? <DashboardHome project={currentProject} timeRange={timeRange} /> : null} />
                      
                      {/* Main Pages */}
                      <Route path="/users" element={currentProject ? <UsersPage project={currentProject} /> : null} />
                      <Route path="/sessions" element={currentProject ? <SessionsPage project={currentProject} /> : null} />
                      <Route path="/clients" element={currentProject ? <ClientsPage project={currentProject} /> : null} />
                      <Route path="/performance" element={currentProject ? <PerformancePage project={currentProject} /> : null} />
                      <Route path="/alerts" element={currentProject ? <AlertsPage project={currentProject} /> : null} />
                      <Route path="/tracing" element={currentProject ? <TracingPage project={currentProject} /> : null} />

                      {/* Settings */}
                      <Route 
                          path="/settings" 
                          element={
                              currentProject ? (
                                  <SettingsPage 
                                      userId={currentUser.id} 
                                      project={currentProject} 
                                      onUpdateProject={handleUpdateProject}
                                  />
                              ) : <div>Loading...</div>
                          } 
                      />
                      <Route path="*" element={<Navigate to="/" />} />
                    </Routes>
                  </DashboardLayout>
               )
            ) : (
              <Navigate to="/login" />
            )
          } 
        />
      </Routes>
    </>
  );
};

const App: React.FC = () => {
  return (
    <HashRouter>
      <AppContainer />
    </HashRouter>
  );
};

export default App;
