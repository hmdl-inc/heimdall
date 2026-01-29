/**
 * Heimdall Backend Server
 * 
 * Receives OTLP traces from SDKs and serves them to the frontend
 */

import express from 'express';
import cors from 'cors';
import { transformOTLPToTraces } from './otlp-transformer.js';
import { storage } from './storage.js';
import { decodeOTLPProtobuf } from './protobuf-decoder.js';

const app = express();
const PORT = process.env.PORT || 4318;
const DEFAULT_PROJECT_ID = process.env.DEFAULT_PROJECT_ID || 'default';

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Parse raw body for protobuf (if needed in future)
app.use('/v1/traces', express.raw({ type: 'application/x-protobuf', limit: '10mb' }));

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/**
 * OTLP HTTP Trace Receiver
 * POST /v1/traces
 * 
 * Receives traces in OTLP JSON format from the SDKs
 */
app.post('/v1/traces', (req, res) => {
  try {
    const contentType = req.headers['content-type'] || '';
    
    // Handle JSON format
    if (contentType.includes('application/json')) {
      const otlpRequest = req.body;
      
      console.log(`[OTLP] Received trace request with ${otlpRequest.resourceSpans?.length || 0} resource spans`);
      
      // Transform OTLP to Heimdall format
      const traces = transformOTLPToTraces(otlpRequest, DEFAULT_PROJECT_ID);
      
      console.log(`[OTLP] Transformed ${traces.length} traces`);
      
      // Store traces
      for (const trace of traces) {
        storage.addTrace(trace.project_id, trace);
        console.log(`[OTLP] Stored trace ${trace.trace_id} for project ${trace.project_id}`);
      }
      
      // Return success (OTLP expects empty response on success)
      res.status(200).json({});
      return;
    }
    
    // Handle protobuf format
    if (contentType.includes('application/x-protobuf')) {
      try {
        const buffer = req.body as Buffer;
        console.log(`[OTLP] Received protobuf request (${buffer.length} bytes)`);

        // Decode protobuf to JSON
        const otlpRequest = decodeOTLPProtobuf(buffer);

        console.log(`[OTLP] Decoded protobuf with ${otlpRequest.resourceSpans?.length || 0} resource spans`);

        // Transform OTLP to Heimdall format
        const traces = transformOTLPToTraces(otlpRequest, DEFAULT_PROJECT_ID);

        console.log(`[OTLP] Transformed ${traces.length} traces`);

        // Store traces
        for (const trace of traces) {
          storage.addTrace(trace.project_id, trace);
          console.log(`[OTLP] Stored trace ${trace.trace_id} for project ${trace.project_id}`);
        }

        res.status(200).send();
        return;
      } catch (error) {
        console.error('[OTLP] Error processing protobuf:', error);
        res.status(500).json({ error: 'Failed to decode protobuf' });
        return;
      }
    }
    
    res.status(415).json({ error: 'Unsupported content type' });
  } catch (error) {
    console.error('[OTLP] Error processing traces:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get all traces for a project
 * GET /api/traces/:projectId
 */
app.get('/api/traces/:projectId', (req, res) => {
  const { projectId } = req.params;
  const traces = storage.getTraces(projectId);
  res.json(traces);
});

/**
 * Get a single trace
 * GET /api/traces/:projectId/:traceId
 */
app.get('/api/traces/:projectId/:traceId', (req, res) => {
  const { projectId, traceId } = req.params;
  const trace = storage.getTrace(projectId, traceId);
  if (!trace) {
    res.status(404).json({ error: 'Trace not found' });
    return;
  }
  res.json(trace);
});

/**
 * Clear traces for a project (for testing)
 * DELETE /api/traces/:projectId
 */
app.delete('/api/traces/:projectId', (req, res) => {
  const { projectId } = req.params;
  storage.clearTraces(projectId);
  res.json({ success: true });
});

/**
 * Get all projects with traces
 * GET /api/projects
 */
app.get('/api/projects', (req, res) => {
  const allTraces = storage.getAllTraces();
  const projects = Object.keys(allTraces).map(projectId => ({
    id: projectId,
    name: projectId,
    traceCount: allTraces[projectId].length,
  }));
  res.json(projects);
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                    HEIMDALL BACKEND                       ║
║                                                           ║
║  OTLP Endpoint:  http://localhost:${PORT}/v1/traces          ║
║  API Endpoint:   http://localhost:${PORT}/api                ║
║  Health Check:   http://localhost:${PORT}/health             ║
║                                                           ║
║  Ready to receive traces from SDKs!                       ║
╚═══════════════════════════════════════════════════════════╝
  `);
});

