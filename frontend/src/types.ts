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

export interface Trace {
  trace_id: string;
  span_id: string;
  parent_span_id?: string;
  name: string;
  start_time: string; // ISO String
  end_time: string;   // ISO String
  latency_ms: number;
  org_id: string;
  project_id: string;
  environment: 'prod' | 'staging';
  release_id: string;
  status: 'OK' | 'ERROR' | 'TIMEOUT' | 'CANCELLED';
  error_type?: string;
  retry_count: number;
  tool_name?: string;
  tool_version?: string;
  client_type: 'ChatGPT' | 'Claude' | 'Cursor' | 'Custom';
  region: string;
  user_id: string; // Added to support 'Users' view
}
