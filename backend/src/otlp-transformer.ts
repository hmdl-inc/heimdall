/**
 * Transform OTLP trace data to Heimdall format
 */

import {
  OTLPExportRequest,
  OTLPSpan,
  OTLPAttribute,
  OTLPResourceSpans,
  Trace,
  Span,
} from './types.js';

/**
 * Extract value from OTLP attribute
 */
function getAttributeValue(attr: OTLPAttribute): string | number | boolean | undefined {
  const { value } = attr;
  if (value.stringValue !== undefined) return value.stringValue;
  if (value.intValue !== undefined) return parseInt(value.intValue, 10);
  if (value.doubleValue !== undefined) return value.doubleValue;
  if (value.boolValue !== undefined) return value.boolValue;
  return undefined;
}

/**
 * Convert attributes array to object
 */
function attributesToObject(attrs?: OTLPAttribute[]): Record<string, string | number | boolean> {
  if (!attrs) return {};
  const result: Record<string, string | number | boolean> = {};
  for (const attr of attrs) {
    const value = getAttributeValue(attr);
    if (value !== undefined) {
      result[attr.key] = value;
    }
  }
  return result;
}

/**
 * Convert nanoseconds to ISO string
 */
function nanoToISOString(nanoStr: string): string {
  const nanos = BigInt(nanoStr);
  const millis = Number(nanos / BigInt(1_000_000));
  return new Date(millis).toISOString();
}

/**
 * Calculate latency in milliseconds
 */
function calculateLatencyMs(startNano: string, endNano: string): number {
  const start = BigInt(startNano);
  const end = BigInt(endNano);
  return Number((end - start) / BigInt(1_000_000));
}

/**
 * Map OTLP status code to Heimdall status
 */
function mapStatus(status?: { code?: number; message?: string }): 'OK' | 'ERROR' | 'TIMEOUT' | 'CANCELLED' {
  if (!status || status.code === undefined || status.code === 0 || status.code === 1) {
    return 'OK';
  }
  return 'ERROR';
}

/**
 * Determine span type from attributes
 */
function determineSpanType(attrs: Record<string, string | number | boolean>, parentSpanId?: string): 'TRACE' | 'SPAN' | 'GENERATION' {
  // Check for MCP-specific attributes
  const mcpType = attrs['mcp.type'] as string;
  if (mcpType === 'tool' || mcpType === 'resource' || mcpType === 'prompt') {
    return parentSpanId ? 'SPAN' : 'TRACE';
  }
  
  // Check for generation indicators
  if (attrs['gen.ai.system'] || attrs['llm.model'] || attrs['mcp.type'] === 'generation') {
    return 'GENERATION';
  }
  
  return parentSpanId ? 'SPAN' : 'TRACE';
}

/**
 * Extract input/output based on span kind
 */
function extractInputOutput(attrs: Record<string, string | number | boolean>): { input?: string; output?: string } {
  const spanKind = attrs['heimdall.span_kind'] as string;

  let input: string | undefined;
  let output: string | undefined;

  if (spanKind === 'mcp.tool') {
    input = attrs['mcp.tool.arguments'] as string;
    output = attrs['mcp.tool.result'] as string;
  } else if (spanKind === 'mcp.resource') {
    input = attrs['mcp.resource.arguments'] as string;
    output = attrs['mcp.resource.result'] as string;
  } else if (spanKind === 'mcp.prompt') {
    input = attrs['mcp.prompt.arguments'] as string;
    output = attrs['mcp.prompt.messages'] as string;
  } else if (spanKind === 'internal') {
    input = attrs['heimdall.input'] as string;
    output = attrs['heimdall.output'] as string;
  } else {
    // Fallback to generic attributes
    input = attrs['mcp.input'] as string || attrs['input'] as string;
    output = attrs['mcp.output'] as string || attrs['output'] as string;
  }

  return { input, output };
}

/**
 * Transform a single OTLP span to Heimdall span
 */
function transformSpan(otlpSpan: OTLPSpan): Span {
  const attrs = attributesToObject(otlpSpan.attributes);
  const parentSpanId = otlpSpan.parentSpanId && otlpSpan.parentSpanId !== ''
    ? otlpSpan.parentSpanId
    : undefined;

  const { input, output } = extractInputOutput(attrs);

  return {
    span_id: otlpSpan.spanId,
    parent_span_id: parentSpanId,
    name: otlpSpan.name,
    type: determineSpanType(attrs, parentSpanId),
    start_time: nanoToISOString(otlpSpan.startTimeUnixNano),
    end_time: nanoToISOString(otlpSpan.endTimeUnixNano),
    latency_ms: calculateLatencyMs(otlpSpan.startTimeUnixNano, otlpSpan.endTimeUnixNano),
    status: mapStatus(otlpSpan.status),
    error_type: otlpSpan.status?.message,
    input,
    output,
    metadata: attrs,
  };
}

/**
 * Extract resource attributes
 */
function getResourceAttrs(resourceSpans: OTLPResourceSpans): Record<string, string | number | boolean> {
  return attributesToObject(resourceSpans.resource?.attributes);
}

/**
 * Group spans by trace ID
 */
function groupSpansByTrace(spans: OTLPSpan[]): Map<string, OTLPSpan[]> {
  const groups = new Map<string, OTLPSpan[]>();
  for (const span of spans) {
    const traceId = span.traceId;
    if (!groups.has(traceId)) {
      groups.set(traceId, []);
    }
    groups.get(traceId)!.push(span);
  }
  return groups;
}

/**
 * Transform OTLP export request to Heimdall traces
 */
export function transformOTLPToTraces(
  request: OTLPExportRequest,
  defaultProjectId: string = 'default'
): Trace[] {
  const traces: Trace[] = [];

  if (!request.resourceSpans) {
    return traces;
  }

  for (const resourceSpans of request.resourceSpans) {
    const resourceAttrs = getResourceAttrs(resourceSpans);
    const environment = (resourceAttrs['heimdall.environment'] as string || 'development') as 'prod' | 'staging' | 'development';
    const projectIdFromResource = resourceAttrs['heimdall.project_id'] as string || defaultProjectId;

    // Collect all spans from all scopes
    const allSpans: OTLPSpan[] = [];
    for (const scopeSpans of resourceSpans.scopeSpans || []) {
      for (const span of scopeSpans.spans || []) {
        allSpans.push(span);
      }
    }

    // Group by trace ID
    const traceGroups = groupSpansByTrace(allSpans);

    for (const [traceId, otlpSpans] of traceGroups) {
      // Transform all spans
      const heimdallSpans = otlpSpans.map(transformSpan);

      // Find root span (no parent or parent not in this trace)
      const spanIds = new Set(heimdallSpans.map(s => s.span_id));
      const rootSpan = heimdallSpans.find(s => !s.parent_span_id || !spanIds.has(s.parent_span_id));

      if (!rootSpan) continue;

      // Extract trace-level attributes from root span
      const rootAttrs = rootSpan.metadata || {};

      const trace: Trace = {
        trace_id: traceId,
        name: rootSpan.name,
        start_time: rootSpan.start_time,
        end_time: rootSpan.end_time,
        latency_ms: rootSpan.latency_ms,
        org_id: rootAttrs['heimdall.org_id'] as string || 'default-org',
        // Prefer resource-level project_id, fall back to span attributes, then default
        project_id: projectIdFromResource || rootAttrs['heimdall.project_id'] as string || defaultProjectId,
        environment,
        release_id: rootAttrs['heimdall.release_id'] as string || 'unknown',
        status: rootSpan.status,
        error_type: rootSpan.error_type,
        retry_count: 0,
        tool_name: rootAttrs['mcp.tool_name'] as string || rootSpan.name,
        tool_version: rootAttrs['mcp.tool_version'] as string,
        client_type: (rootAttrs['mcp.client_type'] as string || 'MCP') as Trace['client_type'],
        region: rootAttrs['heimdall.region'] as string || 'unknown',
        user_id: rootAttrs['heimdall.user_id'] as string || 'anonymous',
        session_id: rootAttrs['heimdall.session_id'] as string | undefined,
        spans: heimdallSpans,
      };

      traces.push(trace);
    }
  }

  return traces;
}

