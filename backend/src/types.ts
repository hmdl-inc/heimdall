/**
 * Heimdall trace types - matching frontend types
 */

export interface Span {
  span_id: string;
  parent_span_id?: string;
  name: string;
  type: 'TRACE' | 'SPAN' | 'GENERATION';
  start_time: string; // ISO String
  end_time: string;   // ISO String
  latency_ms: number;
  status: 'OK' | 'ERROR' | 'TIMEOUT' | 'CANCELLED';
  error_type?: string;
  input?: string;
  output?: string;
  metadata?: Record<string, string | number | boolean>;
}

export interface Trace {
  trace_id: string;
  name: string;
  start_time: string; // ISO String
  end_time: string;   // ISO String
  latency_ms: number;
  org_id: string;
  project_id: string;
  environment: 'prod' | 'staging' | 'development';
  release_id: string;
  status: 'OK' | 'ERROR' | 'TIMEOUT' | 'CANCELLED';
  error_type?: string;
  retry_count: number;
  tool_name?: string;
  tool_version?: string;
  client_type: 'ChatGPT' | 'Claude' | 'Cursor' | 'Custom' | 'MCP';
  region: string;
  user_id: string;
  session_id?: string;
  spans: Span[];
}

/**
 * OTLP JSON format types (simplified)
 */
export interface OTLPSpan {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  name: string;
  kind: number;
  startTimeUnixNano: string;
  endTimeUnixNano: string;
  attributes?: OTLPAttribute[];
  status?: {
    code?: number;
    message?: string;
  };
  events?: OTLPEvent[];
}

export interface OTLPAttribute {
  key: string;
  value: {
    stringValue?: string;
    intValue?: string;
    doubleValue?: number;
    boolValue?: boolean;
    arrayValue?: { values: OTLPAttribute['value'][] };
  };
}

export interface OTLPEvent {
  name: string;
  timeUnixNano: string;
  attributes?: OTLPAttribute[];
}

export interface OTLPResourceSpans {
  resource?: {
    attributes?: OTLPAttribute[];
  };
  scopeSpans?: {
    scope?: {
      name?: string;
      version?: string;
    };
    spans?: OTLPSpan[];
  }[];
}

export interface OTLPExportRequest {
  resourceSpans?: OTLPResourceSpans[];
}

