export interface User {
  id: string;
  name: string;
  email: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
}

export interface Project {
  id: string;
  name: string;
  organizationId: string;
  /** Optional linked SDK project ID for fetching traces from a different project */
  linkedTraceProjectId?: string;
}

export interface AuthResponse {
  success: boolean;
  user?: User;
  message?: string;
}

export enum AuthView {
  LOGIN = 'LOGIN',
  SIGNUP = 'SIGNUP',
}

// Span represents a single unit of work within a trace
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

// Trace represents a complete request with its child spans
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
  // Child spans
  spans: Span[];
}
