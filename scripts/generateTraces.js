import { writeFileSync } from 'fs';
import { randomUUID } from 'crypto';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const randomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

function generateTraces() {
  const traces = [];
  const now = new Date();
  const tools = ['search_tool', 'calculator', 'image_gen', 'code_interpreter', 'retrieval'];
  const errorTypes = ['schema_error', 'tool_error', 'rate_limit_exceeded', 'timeout'];
  const clients = ['ChatGPT', 'Claude', 'Cursor', 'Custom'];
  const users = Array.from({ length: 50 }, (_, i) => `user_${1000 + i}`);

  // Using demo project's org and project IDs
  const orgId = 'org-001';
  const projectId = 'proj-001';

  for (let i = 0; i < 300; i++) {
    const timeOffset = randomInt(0, 7 * 24 * 60 * 60 * 1000);
    const startTime = new Date(now.getTime() - timeOffset);
    const latency = randomInt(50, 2000);
    const endTime = new Date(startTime.getTime() + latency);

    const isError = Math.random() > 0.9;
    const status = isError ? randomItem(['ERROR', 'TIMEOUT', 'CANCELLED']) : 'OK';
    const errorType = isError ? randomItem(errorTypes) : undefined;
    const toolName = randomItem(tools);

    const trace = {
      trace_id: randomUUID(),
      span_id: randomUUID(),
      name: `${toolName}_execution`,
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      latency_ms: latency,
      org_id: orgId,
      project_id: projectId,
      environment: Math.random() > 0.2 ? 'prod' : 'staging',
      release_id: `sha-${Math.random().toString(16).substring(2, 8)}`,
      status,
      error_type: errorType,
      retry_count: isError ? randomInt(0, 2) : 0,
      tool_name: toolName,
      tool_version: 'v1.0.2',
      client_type: randomItem(clients),
      region: randomItem(['us-east-1', 'eu-west-1', 'ap-northeast-2']),
      user_id: randomItem(users)
    };

    traces.push(trace);
  }

  // Sort by date descending
  traces.sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());

  return traces;
}

// Generate and save
const traces = generateTraces();
const tracesData = {
  'proj-001': traces
};

const outputPath = join(__dirname, '..', 'dummy-data', 'traces.json');
writeFileSync(outputPath, JSON.stringify(tracesData, null, 2));
console.log(`✅ Generated 300 dummy traces at ${outputPath}`);
