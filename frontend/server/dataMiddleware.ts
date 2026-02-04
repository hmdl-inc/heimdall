import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import type { Connect, ViteDevServer } from 'vite';

const DATA_DIR = join(process.cwd(), 'dummy-data');

// Ensure dummy-data directory exists
if (!existsSync(DATA_DIR)) {
  mkdirSync(DATA_DIR, { recursive: true });
}

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
  // Ensure directory exists before writing
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
  writeFileSync(filePath, JSON.stringify(data, null, 2));
};

export function dataMiddleware(): Connect.NextHandleFunction {
  return async (req, res, next) => {
    const url = req.url || '';

    // Only handle /api routes
    if (!url.startsWith('/api/')) {
      return next();
    }

    // Let /api/traces requests go through to the backend proxy
    if (url.startsWith('/api/traces')) {
      return next();
    }

    // Let /api/sdk-projects requests go through to the backend proxy
    if (url.startsWith('/api/sdk-projects')) {
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

      // Get project by userId (returns first project for this user's org)
      if (url.startsWith('/api/projects/user/') && req.method === 'GET') {
        const userId = url.split('/')[4]; // /api/projects/user/:userId
        const projects = readJsonFile('projects.json');
        const orgs = readJsonFile('organizations.json');

        // Find user's organization
        const userOrg = orgs[userId];
        if (!userOrg) {
          res.end(JSON.stringify(null));
          return;
        }

        // Find first project belonging to user's organization
        const userProject = Object.values(projects).find(
          (p: any) => p.organizationId === userOrg.id
        );
        res.end(JSON.stringify(userProject || null));
        return;
      }

      if (url === '/api/projects' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
          const projects = readJsonFile('projects.json');
          const { userId, ...projectData } = JSON.parse(body);
          // Store by project ID, not userId - allows multiple projects
          projects[projectData.id] = projectData;
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
          // Update by project ID
          projects[projectData.id] = projectData;
          writeJsonFile('projects.json', projects);
          res.end(JSON.stringify({ success: true }));
        });
        return;
      }

      // === TRACES ===
      // Traces are now handled by the backend via proxy (see vite.config.ts)

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
