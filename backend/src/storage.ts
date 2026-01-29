/**
 * Simple file-based storage for traces
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { Trace } from './types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '../../data');
const TRACES_FILE = join(DATA_DIR, 'traces.json');

// Ensure data directory exists
if (!existsSync(DATA_DIR)) {
  mkdirSync(DATA_DIR, { recursive: true });
}

// In-memory cache
let tracesCache: Record<string, Trace[]> = {};

// Load traces from file on startup
function loadTraces(): Record<string, Trace[]> {
  if (!existsSync(TRACES_FILE)) {
    return {};
  }
  try {
    const content = readFileSync(TRACES_FILE, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error('Error loading traces:', error);
    return {};
  }
}

// Save traces to file
function saveTraces(): void {
  try {
    writeFileSync(TRACES_FILE, JSON.stringify(tracesCache, null, 2));
  } catch (error) {
    console.error('Error saving traces:', error);
  }
}

// Initialize cache
tracesCache = loadTraces();

export const storage = {
  /**
   * Get all traces for a project
   */
  getTraces(projectId: string): Trace[] {
    return tracesCache[projectId] || [];
  },

  /**
   * Get all traces across all projects
   */
  getAllTraces(): Record<string, Trace[]> {
    return tracesCache;
  },

  /**
   * Add a trace to a project
   */
  addTrace(projectId: string, trace: Trace): void {
    if (!tracesCache[projectId]) {
      tracesCache[projectId] = [];
    }
    
    // Check if trace already exists (by trace_id)
    const existingIndex = tracesCache[projectId].findIndex(
      t => t.trace_id === trace.trace_id
    );
    
    if (existingIndex >= 0) {
      // Update existing trace (merge spans, deduplicate by span_id)
      const existing = tracesCache[projectId][existingIndex];
      const spansById = new Map<string, typeof existing.spans[number]>();
      // Start with existing spans
      for (const span of existing.spans) {
        spansById.set(span.span_id, span);
      }
      // Add/overwrite with spans from the new trace
      for (const span of trace.spans) {
        spansById.set(span.span_id, span);
      }
      // Sort by start_time
      existing.spans = Array.from(spansById.values()).sort(
        (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
      );
      // Update end time if newer
      if (new Date(trace.end_time) > new Date(existing.end_time)) {
        existing.end_time = trace.end_time;
        existing.latency_ms = new Date(trace.end_time).getTime() - new Date(existing.start_time).getTime();
      }
    } else {
      // Add new trace
      tracesCache[projectId].unshift(trace);
    }
    
    // Keep only last 1000 traces per project
    if (tracesCache[projectId].length > 1000) {
      tracesCache[projectId] = tracesCache[projectId].slice(0, 1000);
    }
    
    // Save to file (debounced in production, immediate for simplicity)
    saveTraces();
  },

  /**
   * Add multiple traces
   */
  addTraces(projectId: string, traces: Trace[]): void {
    traces.forEach(trace => this.addTrace(projectId, trace));
  },

  /**
   * Clear all traces for a project
   */
  clearTraces(projectId: string): void {
    tracesCache[projectId] = [];
    saveTraces();
  },

  /**
   * Get a single trace by ID
   */
  getTrace(projectId: string, traceId: string): Trace | undefined {
    return tracesCache[projectId]?.find(t => t.trace_id === traceId);
  }
};

