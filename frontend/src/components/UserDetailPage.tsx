import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Trace } from '../types';
import { 
  ArrowLeft, 
  User as UserIcon, 
  AlertCircle, 
  CheckCircle2, 
  XCircle, 
  Clock,
  Loader2,
  Calendar,
  Activity
} from 'lucide-react';

interface UserDetailPageProps {
  userId: string;
  traces: Trace[];
  onBack: () => void;
  onTraceSelect: (trace: Trace) => void;
}

const StatusBadge = ({ status }: { status: Trace['status'] }) => {
  const styles = {
    OK: 'bg-green-100 text-green-700',
    ERROR: 'bg-red-100 text-red-700',
    TIMEOUT: 'bg-orange-100 text-orange-700',
    CANCELLED: 'bg-slate-100 text-slate-700',
  };

  const icons = {
    OK: <CheckCircle2 className="w-3 h-3 mr-1" />,
    ERROR: <AlertCircle className="w-3 h-3 mr-1" />,
    TIMEOUT: <Clock className="w-3 h-3 mr-1" />,
    CANCELLED: <XCircle className="w-3 h-3 mr-1" />,
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${styles[status]}`}>
      {icons[status]}
      {status}
    </span>
  );
};

const PAGE_SIZE = 50;

export const UserDetailPage: React.FC<UserDetailPageProps> = ({ 
  userId, 
  traces, 
  onBack, 
  onTraceSelect 
}) => {
  const [displayLimit, setDisplayLimit] = useState(PAGE_SIZE);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const tableContainerRef = useRef<HTMLDivElement>(null);

  // Sort traces by time (most recent first)
  const sortedTraces = [...traces].sort(
    (a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
  );

  const hasMore = displayLimit < sortedTraces.length;

  const loadMore = useCallback(() => {
    if (isLoadingMore || !hasMore) return;
    
    setIsLoadingMore(true);
    setTimeout(() => {
      setDisplayLimit(prev => Math.min(prev + PAGE_SIZE, sortedTraces.length));
      setIsLoadingMore(false);
    }, 300);
  }, [isLoadingMore, hasMore, sortedTraces.length]);

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

  const displayedTraces = sortedTraces.slice(0, displayLimit);

  // Calculate user stats
  const firstEvent = sortedTraces.length > 0 ? sortedTraces[sortedTraces.length - 1].start_time : null;
  const lastEvent = sortedTraces.length > 0 ? sortedTraces[0].start_time : null;
  const clients = [...new Set(traces.map(t => t.client_type))];
  const errorCount = traces.filter(t => t.status !== 'OK').length;
  const errorRate = traces.length > 0 ? Math.round((errorCount / traces.length) * 100) : 0;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b border-slate-200 bg-white px-6 py-4">
        <div className="flex items-center gap-4 mb-4">
          <button 
            onClick={onBack}
            className="p-1.5 hover:bg-slate-100 rounded-md transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <h1 className="text-xl font-bold text-slate-900">User Detail</h1>
        </div>

        {/* User Info */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center">
              <UserIcon className="w-6 h-6 text-slate-500" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">{userId}</h2>
              <div className="flex items-center gap-2 mt-1">
                {clients.map(client => (
                  <span key={client} className="inline-block px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">
                    {client}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6 ml-auto">
            <div className="text-center">
              <div className="flex items-center gap-1 text-slate-500 text-xs mb-1">
                <Calendar className="w-3 h-3" />
                First Event
              </div>
              <p className="text-sm font-medium text-slate-900">
                {firstEvent ? new Date(firstEvent).toLocaleDateString() : '-'}
              </p>
            </div>
            <div className="text-center">
              <div className="flex items-center gap-1 text-slate-500 text-xs mb-1">
                <Calendar className="w-3 h-3" />
                Last Event
              </div>
              <p className="text-sm font-medium text-slate-900">
                {lastEvent ? new Date(lastEvent).toLocaleDateString() : '-'}
              </p>
            </div>
            <div className="text-center">
              <div className="flex items-center gap-1 text-slate-500 text-xs mb-1">
                <Activity className="w-3 h-3" />
                Total Events
              </div>
              <p className="text-sm font-medium text-slate-900">{traces.length}</p>
            </div>
            {errorRate > 0 && (
              <div className="px-3 py-1.5 bg-red-50 text-red-600 rounded-full text-xs font-medium">
                {errorRate}% Error Rate
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Traces Table */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div ref={tableContainerRef} className="overflow-auto flex-1">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 sticky top-0">
              <tr>
                <th className="px-6 py-3 font-medium">Trace ID</th>
                <th className="px-6 py-3 font-medium">Name</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium">Latency</th>
                <th className="px-6 py-3 font-medium">Client</th>
                <th className="px-6 py-3 font-medium">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {displayedTraces.map((trace) => (
                <tr 
                  key={trace.trace_id} 
                  className="hover:bg-slate-50/50 cursor-pointer"
                  onClick={() => onTraceSelect(trace)}
                >
                  <td className="px-6 py-3 font-mono text-xs text-slate-500">
                    {trace.trace_id.substring(0, 8)}...
                  </td>
                  <td className="px-6 py-3 font-medium text-slate-900">
                    {trace.name}
                    {trace.error_type && (
                      <div className="text-xs text-red-500 font-normal mt-0.5">{trace.error_type}</div>
                    )}
                  </td>
                  <td className="px-6 py-3">
                    <StatusBadge status={trace.status} />
                  </td>
                  <td className="px-6 py-3 text-slate-600">
                    {trace.latency_ms}ms
                  </td>
                  <td className="px-6 py-3">
                    <span className="inline-block px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">
                      {trace.client_type}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-slate-500 text-xs">
                    {new Date(trace.start_time).toLocaleString()}
                  </td>
                </tr>
              ))}
              {sortedTraces.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    No traces found for this user.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          {/* Loading indicator */}
          {isLoadingMore && (
            <div className="flex items-center justify-center py-4 text-slate-500 bg-white">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              <span className="text-sm">Loading more traces...</span>
            </div>
          )}
        </div>
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 text-xs text-slate-500 flex justify-between">
          <span>Showing {displayedTraces.length} of {sortedTraces.length} traces</span>
          <span>{hasMore ? 'Scroll down to load more' : 'End of list'}</span>
        </div>
      </div>
    </div>
  );
};
