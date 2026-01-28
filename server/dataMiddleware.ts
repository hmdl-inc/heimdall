import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import type { Connect, ViteDevServer } from 'vite';

const DATA_DIR = join(process.cwd(), 'dummy-data');

const getFilePath = (fileName: string) => join(DATA_DIR, fileName);

const readJsonFile = (fileName: string) => {
  const filePath = getFilePath(fileName);
  if (!existsSync(filePath)) {
    return {};
  }
  const content = readFileSync(filePath, 'utf-8');
  return JSON.parse(content);
};

const writeJsonFile = (fileName: string, data: any) => {
  const filePath = getFilePath(fileName);
  writeFileSync(filePath, JSON.stringify(data, null, 2));
};

export function dataMiddleware(): Connect.NextHandleFunction {
  return async (req, res, next) => {
    const url = req.url || '';
    
    // Only handle /api routes
    if (!url.startsWith('/api/')) {
      return next();
    }

    res.setHeader('Content-Type', 'application/json');

    try {
      // === USERS ===
      if (url === '/api/users' && req.method === 'GET') {
        const users = readJsonFile('users.json');
        res.end(JSON.stringify(users));
        return;
      }

      if (url === '/api/users' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
          const users = readJsonFile('users.json');
          const { email, ...userData } = JSON.parse(body);
          users[email] = { email, ...userData };
          writeJsonFile('users.json', users);
          res.end(JSON.stringify({ success: true }));
        });
        return;
      }

      // === ORGANIZATIONS ===
      // Get all organizations
      if (url === '/api/organizations' && req.method === 'GET') {
        const orgs = readJsonFile('organizations.json');
        res.end(JSON.stringify(orgs));
        return;
      }

      // Get organization by userId
      if (url.startsWith('/api/organizations/') && req.method === 'GET') {
        const userId = url.split('/')[3]; // /api/organizations/:userId
        const orgs = readJsonFile('organizations.json');
        res.end(JSON.stringify(orgs[userId] || null));
        return;
      }

      if (url === '/api/organizations' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
          const orgs = readJsonFile('organizations.json');
          const { userId, ...orgData } = JSON.parse(body);
          orgs[userId] = orgData;
          writeJsonFile('organizations.json', orgs);
          res.end(JSON.stringify({ success: true }));
        });
        return;
      }

      // === PROJECTS ===
      // Get all projects
      if (url === '/api/projects' && req.method === 'GET') {
        const projects = readJsonFile('projects.json');
        res.end(JSON.stringify(projects));
        return;
      }

      // Get project by userId
      if (url.startsWith('/api/projects/user/') && req.method === 'GET') {
        const userId = url.split('/')[4]; // /api/projects/user/:userId
        const projects = readJsonFile('projects.json');
        res.end(JSON.stringify(projects[userId] || null));
        return;
      }

      if (url === '/api/projects' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
          const projects = readJsonFile('projects.json');
          const { userId, ...projectData } = JSON.parse(body);
          projects[userId] = projectData;
          writeJsonFile('projects.json', projects);
          res.end(JSON.stringify({ success: true }));
        });
        return;
      }

      if (url === '/api/projects' && req.method === 'PUT') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
          const projects = readJsonFile('projects.json');
          const { userId, ...projectData } = JSON.parse(body);
          projects[userId] = projectData;
          writeJsonFile('projects.json', projects);
          res.end(JSON.stringify({ success: true }));
        });
        return;
      }

      // === TRACES ===
      if (url.startsWith('/api/traces/') && req.method === 'GET') {
        const projectId = url.split('/')[3]; // /api/traces/:projectId
        const traces = readJsonFile('traces.json');
        res.end(JSON.stringify(traces[projectId] || []));
        return;
      }

      if (url === '/api/traces' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
          const traces = readJsonFile('traces.json');
          const { projectId, data } = JSON.parse(body);
          traces[projectId] = data;
          writeJsonFile('traces.json', traces);
          res.end(JSON.stringify({ success: true }));
        });
        return;
      }

      // Route not found
      res.statusCode = 404;
      res.end(JSON.stringify({ error: 'Not found' }));
    } catch (error) {
      console.error('API Error:', error);
      res.statusCode = 500;
      res.end(JSON.stringify({ error: 'Internal server error' }));
    }
  };
}

export function configureDataMiddleware(server: ViteDevServer) {
  server.middlewares.use(dataMiddleware());
}
