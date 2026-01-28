import React, { useEffect, useState } from 'react';
import { Project, Trace } from '../types';
import { traceService } from '../services/traceService';
import { Search, User as UserIcon } from 'lucide-react';

interface UsersPageProps {
  project: Project;
}

interface UserStat {
    userId: string;
    lastActive: string;
    totalTraces: number;
    errorRate: number;
    avgLatency: number;
}

export const UsersPage: React.FC<UsersPageProps> = ({ project }) => {
  const [users, setUsers] = useState<UserStat[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const loadUsers = async () => {
      const traces = await traceService.getTraces(project.id);
      const userMap: Record<string, { traces: Trace[] }> = {};

      traces.forEach(t => {
          if (!userMap[t.user_id]) userMap[t.user_id] = { traces: [] };
          userMap[t.user_id].traces.push(t);
      });

      const stats: UserStat[] = Object.entries(userMap).map(([userId, data]) => {
          const userTraces = data.traces;
          const totalTraces = userTraces.length;
          const errorCount = userTraces.filter(t => t.status !== 'OK').length;
          const totalLatency = userTraces.reduce((sum, t) => sum + t.latency_ms, 0);
          
          // Sort traces to find last active
          userTraces.sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());

          return {
              userId,
              totalTraces,
              lastActive: userTraces[0].start_time,
              errorRate: Math.round((errorCount / totalTraces) * 100),
              avgLatency: Math.round(totalLatency / totalTraces)
          };
      });

      setUsers(stats.sort((a, b) => b.totalTraces - a.totalTraces));
    };
    loadUsers();
  }, [project.id]);

  const filteredUsers = users.filter(u => u.userId.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-6">
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredUsers.map((user) => (
            <div key={user.userId} className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center">
                            <UserIcon className="w-5 h-5 text-slate-500" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-slate-900">{user.userId}</h3>
                            <p className="text-xs text-slate-500">Last seen {new Date(user.lastActive).toLocaleDateString()}</p>
                        </div>
                    </div>
                    {user.errorRate > 0 && (
                        <span className="px-2 py-1 bg-red-50 text-red-600 text-xs font-medium rounded-full">
                            {user.errorRate}% Errors
                        </span>
                    )}
                </div>
                
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-50">
                    <div>
                        <p className="text-xs text-slate-500 mb-1">Total Traces</p>
                        <p className="text-lg font-semibold text-slate-900">{user.totalTraces}</p>
                    </div>
                    <div>
                        <p className="text-xs text-slate-500 mb-1">Avg Latency</p>
                        <p className="text-lg font-semibold text-slate-900">{user.avgLatency}ms</p>
                    </div>
                </div>
            </div>
        ))}
      </div>
    </div>
  );
};