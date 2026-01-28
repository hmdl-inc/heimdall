import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Project, Trace } from '../types';
import { traceService } from '../services/traceService';
import { Search, Filter, AlertCircle, CheckCircle2, XCircle, Clock, Loader2 } from 'lucide-react';
import { TraceDetailPage } from './TraceDetailPage';

interface TracingPageProps {
  project: Project;
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

export const TracingPage: React.FC<TracingPageProps> = ({ project }) => {
  const [traces, setTraces] = useState<Trace[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [displayLimit, setDisplayLimit] = useState(PAGE_SIZE);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [selectedTrace, setSelectedTrace] = useState<Trace | null>(null);
  const tableContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadTraces = async () => {
      const data = await traceService.getTraces(project.id);
      setTraces(data);
    };
    loadTraces();
  }, [project.id]);

  // Reset display limit when search term changes
  useEffect(() => {
    setDisplayLimit(PAGE_SIZE);
  }, [searchTerm]);

  const filteredTraces = traces.filter(t => 
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.trace_id.includes(searchTerm) ||
    t.user_id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const hasMore = displayLimit < filteredTraces.length;

  const loadMore = useCallback(() => {
    if (isLoadingMore || !hasMore) return;
    
    setIsLoadingMore(true);
    // Simulate network delay for smoother UX
    setTimeout(() => {
      setDisplayLimit(prev => Math.min(prev + PAGE_SIZE, filteredTraces.length));
      setIsLoadingMore(false);
    }, 300);
  }, [isLoadingMore, hasMore, filteredTraces.length]);

  // Infinite scroll handler
  useEffect(() => {
    const container = tableContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      // Load more when scrolled within 100px of bottom
      if (scrollHeight - scrollTop - clientHeight < 100) {
        loadMore();
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [loadMore]);

  const displayedTraces = filteredTraces.slice(0, displayLimit);

  // Show detail page if a trace is selected
  if (selectedTrace) {
    return (
      <TraceDetailPage 
        trace={selectedTrace} 
        onBack={() => setSelectedTrace(null)} 
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-900">Trace Explorer</h2>
        <div className="flex items-center gap-2">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                    type="text" 
                    placeholder="Search traces..." 
                    className="pl-9 pr-4 py-2 border border-slate-300 rounded-md text-sm w-64 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <button className="flex items-center gap-2 px-3 py-2 border border-slate-300 rounded-md text-sm text-slate-600 hover:bg-slate-50">
                <Filter className="w-4 h-4" />
                Filter
            </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden flex flex-col" style={{ maxHeight: 'calc(100vh - 200px)' }}>
        <div ref={tableContainerRef} className="overflow-auto flex-1">
            <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 sticky top-0">
                    <tr>
                        <th className="px-6 py-3 font-medium">Trace ID</th>
                        <th className="px-6 py-3 font-medium">Name</th>
                        <th className="px-6 py-3 font-medium">Status</th>
                        <th className="px-6 py-3 font-medium">Latency</th>
                        <th className="px-6 py-3 font-medium">User</th>
                        <th className="px-6 py-3 font-medium">Client</th>
                        <th className="px-6 py-3 font-medium">Time</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {displayedTraces.map((trace) => (
                        <tr 
                            key={trace.trace_id} 
                            className="hover:bg-slate-50/50 group cursor-pointer"
                            onClick={() => setSelectedTrace(trace)}
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
                            <td className="px-6 py-3 text-slate-600">
                                {trace.user_id}
                            </td>
                            <td className="px-6 py-3 text-slate-600">
                                <span className="inline-block px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">
                                    {trace.client_type}
                                </span>
                            </td>
                            <td className="px-6 py-3 text-slate-500 text-xs">
                                {new Date(trace.start_time).toLocaleString()}
                            </td>
                        </tr>
                    ))}
                    {filteredTraces.length === 0 && (
                        <tr>
                            <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                                No traces found.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
            {/* Loading indicator */}
            {isLoadingMore && (
                <div className="flex items-center justify-center py-4 text-slate-500">
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    <span className="text-sm">Loading more traces...</span>
                </div>
            )}
        </div>
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 text-xs text-slate-500 flex justify-between">
            <span>Showing {displayedTraces.length} of {filteredTraces.length} results</span>
            <span>{hasMore ? 'Scroll down to load more' : 'End of list'}</span>
        </div>
      </div>
    </div>
  );
};
