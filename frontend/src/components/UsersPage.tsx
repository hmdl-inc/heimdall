import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Project, Trace } from '../types';
import { traceService } from '../services/traceService';
import { Search, User as UserIcon, Loader2 } from 'lucide-react';
import { TraceDetailPage } from './TraceDetailPage';
import { UserDetailPage } from './UserDetailPage';

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

const PAGE_SIZE = 50;

export const UsersPage: React.FC<UsersPageProps> = ({ project }) => {
  const [users, setUsers] = useState<UserStat[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserStat | null>(null);
  const [selectedTrace, setSelectedTrace] = useState<Trace | null>(null);
  const [displayLimit, setDisplayLimit] = useState(PAGE_SIZE);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const tableContainerRef = useRef<HTMLDivElement>(null);

  // Use linkedTraceProjectId if available, otherwise use project.id
  const traceProjectId = project.linkedTraceProjectId || project.id;

  useEffect(() => {
    const loadUsers = async () => {
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
    loadUsers();
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
      {/* Header Controls */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-900">Users</h2>
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
