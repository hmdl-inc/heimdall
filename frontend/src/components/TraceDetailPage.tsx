import React, { useState, useMemo } from 'react';
import { Trace } from '../types';
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

interface TraceDetailPageProps {
  trace: Trace;
  onBack: () => void;
  onUserClick?: (userId: string) => void;
}

// Generate mock spans for the trace tree
interface Span {
  id: string;
  name: string;
  type: 'TRACE' | 'SPAN' | 'GENERATION';
  latency_ms: number;
  cost?: number;
  tokens?: { input: number; output: number; total: number };
  children: Span[];
  input?: string;
  output?: string;
  metadata?: Record<string, string | number>;
}

const generateMockSpans = (trace: Trace): Span => {
  const rootSpan: Span = {
    id: trace.trace_id,
    name: trace.name.replace('_execution', ''),
    type: 'TRACE',
    latency_ms: trace.latency_ms,
    cost: Math.random() * 0.01,
    tokens: {
      input: Math.floor(Math.random() * 5000) + 500,
      output: Math.floor(Math.random() * 1000) + 100,
      total: 0
    },
    children: [],
    input: `Query: "What is the capital of France?"`,
    output: `The capital of France is Paris. Paris is not only the capital but also the largest city in France, known for landmarks like the Eiffel Tower.`,
    metadata: {
      environment: trace.environment,
      release: trace.release_id,
      region: trace.region
    }
  };
  rootSpan.tokens!.total = rootSpan.tokens!.input + rootSpan.tokens!.output;

  // Add child spans based on tool type
  const childSpans: Span[] = [];
  
  if (trace.tool_name === 'retrieval' || trace.tool_name === 'search_tool') {
    childSpans.push({
      id: `${trace.span_id}-embed`,
      name: 'prompt-embedding',
      type: 'GENERATION',
      latency_ms: Math.floor(trace.latency_ms * 0.2),
      cost: 0.000001,
      tokens: { input: 14, output: 0, total: 14 },
      children: [],
      input: 'Embed query text',
      output: '[0.123, 0.456, ...]'
    });
    childSpans.push({
      id: `${trace.span_id}-vec`,
      name: 'vector-store',
      type: 'SPAN',
      latency_ms: Math.floor(trace.latency_ms * 0.3),
      children: [],
      input: 'Search vector DB',
      output: '5 results found'
    });
    childSpans.push({
      id: `${trace.span_id}-ctx`,
      name: 'context-encoding',
      type: 'SPAN',
      latency_ms: Math.floor(trace.latency_ms * 0.15),
      children: [],
      input: 'Encode context',
      output: 'Context encoded successfully'
    });
  }

  childSpans.push({
    id: `${trace.span_id}-gen`,
    name: 'generation',
    type: 'GENERATION',
    latency_ms: Math.floor(trace.latency_ms * 0.35),
    cost: Math.random() * 0.005,
    tokens: { input: 1200, output: 350, total: 1550 },
    children: [],
    input: 'Generate response based on context',
    output: rootSpan.output
  });

  rootSpan.children = childSpans;
  return rootSpan;
};

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
  span: Span;
  depth: number;
  selectedSpanId: string | null;
  onSelect: (span: Span) => void;
}

const SpanTreeItem: React.FC<SpanTreeItemProps> = ({ span, depth, selectedSpanId, onSelect }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasChildren = span.children.length > 0;

  return (
    <div>
      <div 
        className={`flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-slate-50 border-l-2 transition-colors ${
          selectedSpanId === span.id ? 'bg-blue-50 border-l-blue-500' : 'border-l-transparent'
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
          {span.children.map(child => (
            <SpanTreeItem 
              key={child.id} 
              span={child} 
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
  const [activeTab, setActiveTab] = useState<'preview' | 'scores'>('preview');
  const [copied, setCopied] = useState(false);

  const spanTree = useMemo(() => generateMockSpans(trace), [trace]);
  const [selectedSpan, setSelectedSpan] = useState<Span>(spanTree);

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

          {/* Tabs */}
          <div className="flex items-center gap-4 px-6 border-b border-slate-200">
            <button 
              onClick={() => setActiveTab('preview')}
              className={`py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'preview' 
                  ? 'border-primary-500 text-primary-600' 
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              Preview
            </button>
            <button 
              onClick={() => setActiveTab('scores')}
              className={`py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'scores' 
                  ? 'border-primary-500 text-primary-600' 
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              Scores
            </button>
          </div>

          {/* Span Info */}
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <TypeBadge type={selectedSpan.type} />
              <h3 className="text-lg font-semibold text-slate-900">{selectedSpan.name}</h3>
            </div>

            <div className="flex items-center gap-4 text-sm text-slate-500 mb-6">
              <span>{new Date(trace.start_time).toLocaleString()}</span>
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                Latency: {selectedSpan.latency_ms}ms
              </span>
            </div>

            {activeTab === 'preview' ? (
              <div className="space-y-6">
                {/* Input */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-slate-700">Input</h4>
                    <button className="text-xs text-slate-400 hover:text-slate-600">
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-4 font-mono text-sm text-slate-700 whitespace-pre-wrap">
                    {selectedSpan.input || 'No input data'}
                  </div>
                </div>

                {/* Output */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-slate-700">Output</h4>
                    <button className="text-xs text-slate-400 hover:text-slate-600">
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-4 font-mono text-sm text-slate-700 whitespace-pre-wrap">
                    {selectedSpan.output || 'No output data'}
                  </div>
                </div>

                {/* Metadata */}
                {selectedSpan.metadata && (
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
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                  <span className="text-2xl">📊</span>
                </div>
                <h4 className="text-lg font-medium text-slate-700 mb-2">Scores</h4>
                <p className="text-slate-500 text-sm">Coming Soon</p>
                <p className="text-slate-400 text-xs mt-2 max-w-xs">
                  Evaluation scores for accuracy, relevance, and other metrics will be available here.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Tree View */}
        <div className="w-80 bg-slate-50 overflow-auto">
          <div className="p-4 border-b border-slate-200 bg-white">
            <h3 className="text-sm font-medium text-slate-700">Trace Tree</h3>
          </div>
          <div className="py-2">
            <SpanTreeItem 
              span={spanTree} 
              depth={0} 
              selectedSpanId={selectedSpan.id}
              onSelect={setSelectedSpan}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
