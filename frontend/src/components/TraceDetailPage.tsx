import React, { useState, useMemo } from 'react';
import { Trace, Span } from '../types';
import {
  ArrowLeft,
  Copy,
  CheckCircle2,
  AlertCircle,
  Clock,
  XCircle,
  ChevronRight,
  ChevronDown,
  GitBranch,
  Tag,
  User
} from 'lucide-react';
import { JsonViewer } from './ui/JsonViewer';

interface TraceDetailPageProps {
  trace: Trace;
  onBack: () => void;
  onUserClick?: (userId: string) => void;
}

// Tree node structure for rendering
interface SpanTreeNode {
  span: Span;
  children: SpanTreeNode[];
}

// Build tree structure from flat spans array
const buildSpanTree = (spans: Span[]): SpanTreeNode | null => {
  if (spans.length === 0) return null;

  // Find root span (no parent or parent is the trace itself)
  const rootSpan = spans.find(s => !s.parent_span_id) || spans[0];
  
  const buildNode = (span: Span): SpanTreeNode => {
    const children = spans
      .filter(s => s.parent_span_id === span.span_id)
      .map(buildNode);
    return { span, children };
  };

  return buildNode(rootSpan);
};

const StatusBadge = ({ status }: { status: Span['status'] }) => {
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

const TypeBadge = ({ type }: { type: Span['type'] }) => {
  const styles = {
    TRACE: 'bg-purple-100 text-purple-700',
    SPAN: 'bg-blue-100 text-blue-700',
    GENERATION: 'bg-amber-100 text-amber-700',
  };

  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium uppercase ${styles[type]}`}>
      {type}
    </span>
  );
};

interface SpanTreeItemProps {
  node: SpanTreeNode;
  depth: number;
  selectedSpanId: string | null;
  onSelect: (span: Span) => void;
}

const SpanTreeItem: React.FC<SpanTreeItemProps> = ({ node, depth, selectedSpanId, onSelect }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasChildren = node.children.length > 0;
  const { span } = node;

  return (
    <div>
      <div 
        className={`flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-slate-50 border-l-2 transition-colors ${
          selectedSpanId === span.span_id ? 'bg-blue-50 border-l-blue-500' : 'border-l-transparent'
        }`}
        style={{ paddingLeft: `${depth * 16 + 12}px` }}
        onClick={() => onSelect(span)}
      >
        {hasChildren ? (
          <button 
            onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
            className="p-0.5 hover:bg-slate-200 rounded"
          >
            {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          </button>
        ) : (
          <span className="w-4" />
        )}
        <TypeBadge type={span.type} />
        <span className="text-sm font-medium text-slate-900 truncate flex-1">{span.name}</span>
        <span className="text-xs text-slate-500">{span.latency_ms}ms</span>
      </div>
      {isExpanded && hasChildren && (
        <div>
          {node.children.map(child => (
            <SpanTreeItem 
              key={child.span.span_id} 
              node={child} 
              depth={depth + 1} 
              selectedSpanId={selectedSpanId}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const TraceDetailPage: React.FC<TraceDetailPageProps> = ({ trace, onBack, onUserClick }) => {
  const [copied, setCopied] = useState(false);

  // Build span tree from trace data
  const spanTree = useMemo(() => buildSpanTree(trace.spans), [trace.spans]);
  
  // Initialize selected span to root span
  const [selectedSpan, setSelectedSpan] = useState<Span>(
    spanTree?.span || trace.spans[0]
  );

  const copyTraceId = () => {
    navigator.clipboard.writeText(trace.trace_id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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
          <h1 className="text-xl font-bold text-slate-900">Trace Detail</h1>
        </div>

        {/* Trace Info Bar */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-full text-sm">
            <span className="text-slate-500">Trace:</span>
            <code className="font-mono text-slate-700">{trace.trace_id.substring(0, 16)}...</code>
            <button onClick={copyTraceId} className="hover:text-slate-900">
              {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
          <button 
            onClick={() => onUserClick?.(trace.user_id)}
            className={`flex items-center gap-2 bg-blue-50 px-3 py-1.5 rounded-full text-sm text-blue-700 ${
              onUserClick ? 'hover:bg-blue-100 cursor-pointer transition-colors' : ''
            }`}
            disabled={!onUserClick}
          >
            <User className="w-3.5 h-3.5" />
            {trace.user_id}
          </button>
          <StatusBadge status={trace.status} />
        </div>

        {/* Tags */}
        <div className="flex items-center gap-2 mt-3">
          <Tag className="w-4 h-4 text-slate-400" />
          <span className="text-sm text-slate-500">Tags:</span>
          <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs">{trace.environment}</span>
          <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs">{trace.client_type}</span>
          {trace.tool_name && (
            <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs">{trace.tool_name}</span>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Span Detail */}
        <div className="flex-1 overflow-auto border-r border-slate-200 bg-white">
          {/* View Mode */}
          <div className="flex items-center justify-end gap-2 px-4 py-2 border-b border-slate-100">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded text-sm bg-slate-100 text-slate-900">
              <GitBranch className="w-4 h-4" />
              Tree
            </div>
          </div>


          {/* Span Info */}
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <TypeBadge type={selectedSpan.type} />
              <h3 className="text-lg font-semibold text-slate-900">{selectedSpan.name}</h3>
              {selectedSpan.status !== 'OK' && (
                <StatusBadge status={selectedSpan.status} />
              )}
            </div>

            <div className="flex items-center gap-4 text-sm text-slate-500 mb-6">
              <span>{new Date(selectedSpan.start_time).toLocaleString()}</span>
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                Latency: {selectedSpan.latency_ms}ms
              </span>
            </div>

            <div className="space-y-6">
              {/* Input */}
              <JsonViewer data={selectedSpan.input} label="Input" />

              {/* Output */}
              <JsonViewer data={selectedSpan.output} label="Output" />

              {/* Metadata */}
              {selectedSpan.metadata && Object.keys(selectedSpan.metadata).length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-slate-700 mb-2">Metadata</h4>
                  <div className="bg-slate-50 rounded-lg p-4">
                    <dl className="grid grid-cols-2 gap-2 text-sm">
                      {Object.entries(selectedSpan.metadata).map(([key, value]) => (
                        <div key={key} className="flex gap-2">
                          <dt className="text-slate-500">{key}:</dt>
                          <dd className="text-slate-700 font-mono">{String(value)}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Panel - Tree View */}
        <div className="w-80 bg-slate-50 overflow-auto">
          <div className="p-4 border-b border-slate-200 bg-white">
            <h3 className="text-sm font-medium text-slate-700">Trace Tree</h3>
            <p className="text-xs text-slate-400 mt-1">{trace.spans.length} spans</p>
          </div>
          <div className="py-2">
            {spanTree ? (
              <SpanTreeItem 
                node={spanTree} 
                depth={0} 
                selectedSpanId={selectedSpan.span_id}
                onSelect={setSelectedSpan}
              />
            ) : (
              <div className="px-4 py-8 text-center text-slate-500 text-sm">
                No spans available
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
