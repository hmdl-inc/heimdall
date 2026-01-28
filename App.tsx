import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { LoginForm } from './components/LoginForm';
import { SignupForm } from './components/SignupForm';
import { DashboardLayout, TimeRange, TIME_RANGE_OPTIONS } from './components/DashboardLayout';
import { SettingsPage } from './components/SettingsPage';
import { TracingPage } from './components/TracingPage';
import { UsersPage } from './components/UsersPage';
import { authService } from './services/authService';
import { traceService } from './services/traceService';
import { User, Organization, Project } from './types';
import { Button } from './components/ui/Button';
import { Input } from './components/ui/Input';
import { Shield, Building2, Box, X } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

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
                <Shield className="w-8 h-8 text-primary-600" />
                <span className="text-2xl font-bold text-slate-900">Heimdall</span>
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

// --- MAIN DASHBOARD COMPONENT ---
const DashboardHome = ({ project, timeRange }: { project: Project; timeRange: TimeRange }) => {
  const [stats, setStats] = useState<any>(null);

  const timeRangeHours = TIME_RANGE_OPTIONS.find(t => t.value === timeRange)?.hours || 24;

  useEffect(() => {
    const loadData = async () => {
      setStats(null); // Reset while loading
      await traceService.ensureDummyData(project);
      const data = await traceService.getStats(project.id, timeRangeHours);
      setStats(data);
    };
    loadData();
  }, [project, timeRangeHours]);

  if (!stats) return <div className="p-10 text-center text-slate-500">Loading metrics...</div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Top Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Trace Card */}
        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
          <div className="flex flex-col h-full justify-between">
             <div>
                <h3 className="text-base font-semibold text-slate-900 mb-4">Trace</h3>
                <div className="flex items-baseline gap-2 mb-6">
                    <span className="text-4xl font-bold text-slate-900">{stats.totalTraces}</span>
                    <span className="text-sm text-slate-500">total traces tracked</span>
                </div>
                
                <div className="space-y-3">
                    {stats.topTools.map((item: any, i: number) => (
                        <div key={i} className="flex items-center text-sm">
                            <span className="w-24 truncate font-medium text-slate-600">{item.name}</span>
                            <div className="flex-1 mx-3 h-6 bg-slate-50 rounded overflow-hidden relative">
                                <div className="absolute top-0 left-0 h-full bg-blue-100 rounded" style={{ width: item.width }}></div>
                            </div>
                            <span className="w-8 text-right font-medium text-slate-900">{item.count}</span>
                        </div>
                    ))}
                </div>
             </div>
          </div>
        </div>

        {/* Error Card */}
        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
           <div className="flex flex-col h-full">
              <h3 className="text-base font-semibold text-slate-900 mb-4">Error</h3>
              <div className="flex items-baseline gap-2 mb-6">
                 <span className={`text-4xl font-bold ${stats.errorRate > 0 ? 'text-red-500' : 'text-slate-900'}`}>{stats.errorRate}%</span>
                 <span className="text-sm text-slate-500">error rate</span>
              </div>
              <div className="space-y-3 mt-auto">
                 {Object.entries(stats.errorBreakdown).length > 0 ? (
                    Object.entries(stats.errorBreakdown).map(([type, count]: any, i) => (
                        <div key={i} className="flex justify-between text-sm">
                            <span className="text-slate-500 truncate pr-2 max-w-[180px]">{type}</span>
                            <span className="font-semibold text-slate-900">{count}</span>
                        </div>
                    ))
                 ) : (
                    <div className="text-sm text-slate-400">No errors recorded.</div>
                 )}
              </div>
           </div>
        </div>

        {/* Scores Card */}
        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
           <h3 className="text-base font-semibold text-slate-900 mb-1">Scores</h3>
           <p className="text-xs text-slate-500 mb-4">LLM-as-a-Judge</p>
           <div className="flex-1 bg-slate-50 rounded border border-dashed border-slate-200 h-40 flex flex-col items-center justify-center text-slate-400">
               <span className="text-sm font-medium text-slate-500">No Data</span>
           </div>
        </div>
      </div>

      {/* Middle Row: Large Chart & Client Types */}
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
            <h3 className="text-base font-semibold text-slate-900 mb-1">Client</h3>
            <p className="text-xs text-slate-500 mb-6">MCP client types</p>
            <div className="space-y-4">
                {stats.clientData.map((item: any, i: number) => (
                    <div key={i} className="flex items-center justify-between">
                         <div className={`h-8 rounded-md bg-blue-100`} style={{ width: item.width }}></div>
                         <div className="flex items-center gap-2">
                             <span className="text-sm font-medium text-slate-700">{item.label}</span>
                             <span className="text-xs text-slate-400">({item.count})</span>
                         </div>
                    </div>
                ))}
            </div>
         </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
         <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
            <h3 className="text-base font-semibold text-slate-900 mb-6">Traces by time</h3>
             <div className="h-40 w-full">
               <ResponsiveContainer width="100%" height="100%">
                 <LineChart data={stats.chartData}>
                   <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                   <XAxis hide />
                   <YAxis hide />
                   <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} dot={false} />
                 </LineChart>
               </ResponsiveContainer>
            </div>
         </div>

         <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
            <h3 className="text-base font-semibold text-slate-900 mb-4">Trace Latencies</h3>
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="text-slate-500 text-xs border-b border-slate-100">
                            <th className="text-left font-semibold pb-2">TRACE NAME</th>
                            <th className="text-right font-semibold pb-2">P50</th>
                            <th className="text-right font-semibold pb-2">P90</th>
                            <th className="text-right font-semibold pb-2">P99</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {stats.latencyTable.map((row: any, i: number) => (
                            <tr key={i} className="text-slate-600">
                                <td className="py-3 font-medium text-slate-900">{row.name}</td>
                                <td className="py-3 text-right">{row.p50}</td>
                                <td className="py-3 text-right">{row.p90}</td>
                                <td className="py-3 text-right">{row.p99}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
         </div>

         <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
            <h3 className="text-base font-semibold text-slate-900 mb-6">Score Analytics</h3>
            <div className="bg-slate-50 border border-dashed border-slate-200 rounded h-32 flex items-center justify-center">
                <span className="text-sm font-semibold text-slate-400">No Data</span>
            </div>
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
  const [timeRange, setTimeRange] = useState<TimeRange>('1d');

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
        navigate('/dashboard');
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
          navigate('/dashboard');
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
          <Shield className="w-10 h-10 mb-4 text-slate-300" />
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
            currentUser ? <Navigate to="/dashboard" /> : (
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
            currentUser ? <Navigate to="/dashboard" /> : (
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
                  currentOrg ? <Navigate to="/dashboard" /> : <SetupPage onSuccess={handleSetupSuccess} userId={currentUser.id} />
              ) : (
                  <Navigate to="/login" />
              )
          }
        />

        <Route 
          path="/dashboard/*" 
          element={
            currentUser ? (
               // If user is logged in but no org, force setup
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
                      <Route path="/" element={currentProject ? <DashboardHome project={currentProject} timeRange={timeRange} /> : null} />
                      <Route path="analytics" element={currentProject ? <DashboardHome project={currentProject} timeRange={timeRange} /> : null} />
                      
                      {/* New Tracing & Users Routes */}
                      <Route 
                          path="tracing" 
                          element={currentProject ? <TracingPage project={currentProject} /> : null} 
                      />
                       <Route 
                          path="users" 
                          element={currentProject ? <UsersPage project={currentProject} /> : null} 
                      />

                      <Route 
                          path="settings" 
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
                      <Route path="*" element={<div className="text-slate-500">Page not found</div>} />
                    </Routes>
                  </DashboardLayout>
               )
            ) : (
              <Navigate to="/login" />
            )
          } 
        />
        
        {/* Root redirects for new top-level sidebar items */}
        <Route path="/tracing" element={<Navigate to="/dashboard/tracing" />} />
        <Route path="/users" element={<Navigate to="/dashboard/users" />} />

        <Route path="*" element={<Navigate to="/login" />} />
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
