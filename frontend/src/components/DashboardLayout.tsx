import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Home, 
  LayoutDashboard, 
  Activity, 
  Clock, 
  Users, 
  Settings, 
  LifeBuoy, 
  Search,
  SlidersHorizontal,
  ChevronDown,
  Hammer,
  Play,
  Grid,
  Rocket,
  Target,
  Gavel,
  UserCheck,
  Plus,
  Check,
  LogOut
} from 'lucide-react';
import { User, Organization, Project } from '../types';

// Time range options
export type TimeRange = '1h' | '1d' | '3d' | '1w';

export const TIME_RANGE_OPTIONS: { value: TimeRange; label: string; hours: number }[] = [
  { value: '1h', label: 'Past 1 hour', hours: 1 },
  { value: '1d', label: 'Past 1 day', hours: 24 },
  { value: '3d', label: 'Past 3 days', hours: 72 },
  { value: '1w', label: 'Past 1 week', hours: 168 },
];

interface DashboardLayoutProps {
  children: React.ReactNode;
  user: User;
  org: Organization | null;
  project: Project | null;
  onLogout: () => void;
  timeRange?: TimeRange;
  onTimeRangeChange?: (range: TimeRange) => void;
  organizations?: Organization[];
  projects?: Project[];
  onSelectOrg?: (org: Organization) => void;
  onSelectProject?: (project: Project) => void;
  onCreateOrg?: () => void;
  onCreateProject?: () => void;
}

const SidebarItem = ({ icon: Icon, label, to, active, soon = false }: { icon: any, label: string, to: string, active?: boolean, soon?: boolean }) => (
  <Link
    to={to}
    onClick={(e) => soon && e.preventDefault()}
    className={`
      flex items-center justify-between w-full px-3 py-2 rounded-md text-sm font-medium mb-0.5 transition-colors
      ${active 
        ? 'bg-primary-50 text-primary-700' 
        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
      }
      ${soon ? 'opacity-50 cursor-default pointer-events-none' : ''}
    `}
  >
    <div className="flex items-center gap-3">
      <Icon className={`w-4 h-4 ${active ? 'text-primary-600' : 'text-slate-500'}`} />
      <span>{label}</span>
    </div>
    {soon && (
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Soon</span>
    )}
  </Link>
);

const SidebarSection = ({ title, children }: { title?: string, children: React.ReactNode }) => (
  <div className="mb-6">
    {title && (
      <h3 className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
        {title}
      </h3>
    )}
    <div className="space-y-0.5">
      {children}
    </div>
  </div>
);

// Dropdown Component
const Dropdown = ({ 
  trigger, 
  children, 
  isOpen, 
  onClose 
}: { 
  trigger: React.ReactNode; 
  children: React.ReactNode; 
  isOpen: boolean; 
  onClose: () => void;
}) => {
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  return (
    <div className="relative" ref={dropdownRef}>
      {trigger}
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 min-w-[200px] bg-white border border-slate-200 rounded-lg shadow-lg z-50 py-1">
          {children}
        </div>
      )}
    </div>
  );
};

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ 
  children, 
  user, 
  org, 
  project, 
  onLogout,
  timeRange = '1d',
  onTimeRangeChange,
  organizations = [],
  projects = [],
  onSelectOrg,
  onSelectProject,
  onCreateOrg,
  onCreateProject
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Dropdown states
  const [timeDropdownOpen, setTimeDropdownOpen] = useState(false);
  const [orgDropdownOpen, setOrgDropdownOpen] = useState(false);
  const [projectDropdownOpen, setProjectDropdownOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  // Helper to determine Page Title
  const getPageTitle = (path: string) => {
    if (path === '/dashboard') return 'Home';
    if (path === '/dashboard/analytics') return 'Dashboard';
    if (path.includes('/settings')) return 'Project Settings';
    if (path.includes('/tracing')) return 'Tracing';
    if (path.includes('/users')) return 'Users';
    return 'Dashboard';
  };

  const currentTimeRange = TIME_RANGE_OPTIONS.find(t => t.value === timeRange) || TIME_RANGE_OPTIONS[1];

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col fixed h-full z-20">
        <div className="h-16 flex items-center px-6 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="Heimdall" className="w-8 h-8" />
            <span className="text-xl font-bold text-slate-900">Heimdall</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <SidebarSection>
            <SidebarItem icon={Home} label="Home" to="/dashboard" active={location.pathname === '/dashboard'} />
            <SidebarItem icon={LayoutDashboard} label="Dashboard" to="/dashboard/analytics" />
          </SidebarSection>

          <SidebarSection title="Observe">
            <SidebarItem icon={Activity} label="Tracing" to="/tracing" />
            <SidebarItem icon={Users} label="Users" to="/users" />
          </SidebarSection>

          <SidebarSection title="Build (Coming Soon)">
            <SidebarItem icon={Hammer} label="Prompts" to="#" soon />
            <SidebarItem icon={Play} label="Playground" to="#" soon />
            <SidebarItem icon={Grid} label="App Studio" to="#" soon />
          </SidebarSection>

          <SidebarSection title="Deploy (Coming Soon)">
             <SidebarItem icon={Rocket} label="Deployment" to="#" soon />
          </SidebarSection>

          <SidebarSection title="Evaluate (Coming Soon)">
             <SidebarItem icon={Target} label="Scores" to="#" soon />
             <SidebarItem icon={Gavel} label="LLM-as-a-Judge" to="#" soon />
             <SidebarItem icon={UserCheck} label="Human Annotation" to="#" soon />
          </SidebarSection>

          <div className="pt-4 mt-4 border-t border-slate-100">
            <SidebarItem icon={Settings} label="Settings" to="/dashboard/settings" active={location.pathname.includes('/settings')} />
            <SidebarItem icon={LifeBuoy} label="Support" to="#" soon />
          </div>
        </div>

        {/* User Profile */}
        <div className="p-4 border-t border-slate-200">
          <div 
            className="relative"
            onMouseEnter={() => setUserDropdownOpen(true)}
            onMouseLeave={() => setUserDropdownOpen(false)}
          >
            <div className="flex items-center gap-3 w-full p-2 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors group">
              <div className="w-8 h-8 rounded bg-primary-600 flex items-center justify-center text-white font-bold text-xs">
                {user.name.substring(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">{user.name}</p>
                <p className="text-xs text-slate-500 truncate">{user.email}</p>
              </div>
              <div className="opacity-0 group-hover:opacity-100 p-1 rounded text-slate-500">
                 <ChevronDown className={`w-4 h-4 transition-transform ${userDropdownOpen ? 'rotate-180' : ''}`} />
              </div>
            </div>
            
            {/* User Dropdown Menu */}
            {userDropdownOpen && (
              <div className="absolute bottom-full left-0 right-0 mb-1 bg-white border border-slate-200 rounded-lg shadow-lg z-50 py-1">
                <button
                  onClick={() => {
                    navigate('/dashboard/settings');
                    setUserDropdownOpen(false);
                  }}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2 text-slate-700"
                >
                  <Settings className="w-4 h-4 text-slate-500" />
                  <span>Settings</span>
                </button>
                <div className="border-t border-slate-100 my-1" />
                <button
                  onClick={() => {
                    onLogout();
                    setUserDropdownOpen(false);
                  }}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2 text-red-600"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Log out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 ml-64 min-w-0 flex flex-col">
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-10">
          <div className="flex flex-col justify-center">
             {/* Organization / Project Selector */}
             <div className="flex items-center gap-1 text-xs mb-0.5">
                {/* Organization Dropdown */}
                <Dropdown
                  isOpen={orgDropdownOpen}
                  onClose={() => setOrgDropdownOpen(false)}
                  trigger={
                    <button 
                      onClick={() => setOrgDropdownOpen(!orgDropdownOpen)}
                      className="flex items-center gap-1 text-slate-500 hover:text-slate-700 hover:bg-slate-100 px-1.5 py-0.5 rounded transition-colors"
                    >
                      <span>{org?.name || 'Organization'}</span>
                      <ChevronDown className="w-3 h-3" />
                    </button>
                  }
                >
                  <div className="px-2 py-1.5 text-xs font-semibold text-slate-400 uppercase">Organizations</div>
                  {organizations.map((o) => (
                    <button
                      key={o.id}
                      onClick={() => {
                        onSelectOrg?.(o);
                        setOrgDropdownOpen(false);
                      }}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 flex items-center justify-between"
                    >
                      <span className={org?.id === o.id ? 'font-medium text-slate-900' : 'text-slate-600'}>{o.name}</span>
                      {org?.id === o.id && <Check className="w-4 h-4 text-primary-600" />}
                    </button>
                  ))}
                  <div className="border-t border-slate-100 mt-1 pt-1">
                    <button
                      onClick={() => {
                        onCreateOrg?.();
                        setOrgDropdownOpen(false);
                      }}
                      className="w-full px-3 py-2 text-left text-sm text-primary-600 hover:bg-primary-50 flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      <span>New Organization</span>
                    </button>
                  </div>
                </Dropdown>

                <span className="text-slate-400">/</span>

                {/* Project Dropdown */}
                <Dropdown
                  isOpen={projectDropdownOpen}
                  onClose={() => setProjectDropdownOpen(false)}
                  trigger={
                    <button 
                      onClick={() => setProjectDropdownOpen(!projectDropdownOpen)}
                      className="flex items-center gap-1 text-slate-500 hover:text-slate-700 hover:bg-slate-100 px-1.5 py-0.5 rounded transition-colors"
                    >
                      <span>{project?.name || 'Project'}</span>
                      <ChevronDown className="w-3 h-3" />
                    </button>
                  }
                >
                  <div className="px-2 py-1.5 text-xs font-semibold text-slate-400 uppercase">Projects</div>
                  {projects.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        onSelectProject?.(p);
                        setProjectDropdownOpen(false);
                      }}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 flex items-center justify-between"
                    >
                      <span className={project?.id === p.id ? 'font-medium text-slate-900' : 'text-slate-600'}>{p.name}</span>
                      {project?.id === p.id && <Check className="w-4 h-4 text-primary-600" />}
                    </button>
                  ))}
                  <div className="border-t border-slate-100 mt-1 pt-1">
                    <button
                      onClick={() => {
                        onCreateProject?.();
                        setProjectDropdownOpen(false);
                      }}
                      className="w-full px-3 py-2 text-left text-sm text-primary-600 hover:bg-primary-50 flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      <span>New Project</span>
                    </button>
                  </div>
                </Dropdown>
             </div>
             <h1 className="text-xl font-semibold text-slate-900">
                {getPageTitle(location.pathname)}
             </h1>
          </div>

          <div className="flex items-center gap-3">
             {/* Time Range Dropdown */}
             <Dropdown
               isOpen={timeDropdownOpen}
               onClose={() => setTimeDropdownOpen(false)}
               trigger={
                 <button 
                   onClick={() => setTimeDropdownOpen(!timeDropdownOpen)}
                   className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-300 rounded-md text-sm font-medium text-slate-700 hover:bg-slate-50"
                 >
                   <Clock className="w-4 h-4 text-slate-400" />
                   <span>{currentTimeRange.label}</span>
                   <ChevronDown className="w-4 h-4 text-slate-400" />
                 </button>
               }
             >
               {TIME_RANGE_OPTIONS.map((option) => (
                 <button
                   key={option.value}
                   onClick={() => {
                     onTimeRangeChange?.(option.value);
                     setTimeDropdownOpen(false);
                   }}
                   className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 flex items-center justify-between"
                 >
                   <span className={timeRange === option.value ? 'font-medium text-slate-900' : 'text-slate-600'}>
                     {option.label}
                   </span>
                   {timeRange === option.value && <Check className="w-4 h-4 text-primary-600" />}
                 </button>
               ))}
             </Dropdown>

             {/* Configure Tracing -> Settings */}
             <button 
               onClick={() => navigate('/dashboard/settings')}
               className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-300 rounded-md text-sm font-medium text-slate-700 hover:bg-slate-50"
             >
               <SlidersHorizontal className="w-4 h-4" />
               <span>Configure Tracing</span>
             </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-8">
          <div className="max-w-[1600px] mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
