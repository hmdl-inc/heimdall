import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, Copy, CheckCircle2 } from 'lucide-react';

interface JsonViewerProps {
  data: string | null | undefined;
  label: string;
}

export const JsonViewer: React.FC<JsonViewerProps> = ({ data, label }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [copied, setCopied] = useState(false);

  const parsed = useMemo(() => {
    if (!data) return null;
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  }, [data]);

  const getSummary = (value: unknown): string => {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (Array.isArray(value)) {
      return `${value.length} item${value.length !== 1 ? 's' : ''}`;
    }
    if (typeof value === 'object') {
      const keys = Object.keys(value);
      return `${keys.length} key${keys.length !== 1 ? 's' : ''}`;
    }
    return typeof value;
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(data || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const renderValue = (value: unknown, depth: number = 0): React.ReactNode => {
    if (value === null) return <span className="text-slate-400">null</span>;
    if (value === undefined) return <span className="text-slate-400">undefined</span>;
    
    if (typeof value === 'string') {
      return <span className="text-emerald-600">"{value}"</span>;
    }
    if (typeof value === 'number') {
      return <span className="text-blue-600">{value}</span>;
    }
    if (typeof value === 'boolean') {
      return <span className="text-amber-600">{value.toString()}</span>;
    }
    
    if (Array.isArray(value)) {
      return (
        <div className="space-y-1">
          {value.map((item, index) => (
            <div key={index} className="flex" style={{ paddingLeft: depth > 0 ? '1rem' : 0 }}>
              <span className="text-slate-400 w-8 shrink-0">[{index}]</span>
              <div className="flex-1">{renderValue(item, depth + 1)}</div>
            </div>
          ))}
        </div>
      );
    }
    
    if (typeof value === 'object') {
      return (
        <div className="space-y-1">
          {Object.entries(value).map(([key, val]) => (
            <div key={key} className="flex" style={{ paddingLeft: depth > 0 ? '1rem' : 0 }}>
              <span className="text-purple-600 shrink-0 mr-2">{key}:</span>
              <div className="flex-1">{renderValue(val, depth + 1)}</div>
            </div>
          ))}
        </div>
      );
    }
    
    return <span>{String(value)}</span>;
  };

  // If data is not valid JSON, show raw text
  if (!data) {
    return (
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-medium text-slate-700">{label}</h4>
        </div>
        <div className="bg-slate-50 rounded-lg p-4 font-mono text-sm text-slate-500">
          No {label.toLowerCase()} data
        </div>
      </div>
    );
  }

  if (parsed === null) {
    // Invalid JSON, show as raw text
    return (
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-medium text-slate-700">{label}</h4>
          <button 
            className="text-xs text-slate-400 hover:text-slate-600"
            onClick={copyToClipboard}
          >
            {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
        <div className="bg-slate-50 rounded-lg p-4 font-mono text-sm text-slate-700 whitespace-pre-wrap max-h-64 overflow-auto">
          {data}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <button 
          className="flex items-center gap-1 text-sm font-medium text-slate-700 hover:text-slate-900"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
          <span>{label}</span>
          <span className="text-slate-400 font-normal ml-1">({getSummary(parsed)})</span>
        </button>
        <button 
          className="text-xs text-slate-400 hover:text-slate-600"
          onClick={copyToClipboard}
        >
          {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>
      {isExpanded && (
        <div className="bg-slate-50 rounded-lg p-4 font-mono text-sm max-h-64 overflow-auto">
          {renderValue(parsed)}
        </div>
      )}
    </div>
  );
};

