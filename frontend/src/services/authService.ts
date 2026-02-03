import { User, AuthResponse, Organization, Project } from '../types';

const SESSION_KEY = 'heimdall_current_session';

// Helper to simulate network delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper to log DB state for debugging
const logDbState = (action: string, data: any) => {
  console.group(`💽 Database ${action}`);
  console.log(JSON.stringify(data, null, 2));
  console.groupEnd();
};

export const authService = {
  async signup(name: string, email: string, password: string): Promise<AuthResponse> {
    await delay(800);

    try {
      // Fetch existing users from file
      const response = await fetch('/api/users');
      const users: Record<string, any> = await response.json();

      if (users[email]) {
        return { success: false, message: 'User with this email already exists.' };
      }

      const newUser: User = {
        id: crypto.randomUUID(),
        name,
        email,
      };

      // Save new user to file
      await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newUser, password }),
      });

      logDbState('User Created', newUser);

      // Save session to localStorage (session only)
      localStorage.setItem(SESSION_KEY, JSON.stringify(newUser));

      return { success: true, user: newUser };
    } catch (error) {
      console.error(error);
      return { success: false, message: 'An error occurred during signup.' };
    }
  },

  async login(email: string, password: string): Promise<AuthResponse> {
    await delay(800);

    try {
      // Fetch users from file
      const response = await fetch('/api/users');
      const users: Record<string, any> = await response.json();

      logDbState('Read Users on Login', users);

      const userRecord = users[email];

      if (!userRecord || userRecord.password !== password) {
        return { success: false, message: 'Invalid email or password.' };
      }

      const user: User = {
        id: userRecord.id,
        name: userRecord.name,
        email: userRecord.email,
      };

      // Save session to localStorage
      localStorage.setItem(SESSION_KEY, JSON.stringify(user));
      return { success: true, user };
    } catch (error) {
      return { success: false, message: 'An error occurred during login.' };
    }
  },

  logout(): void {
    localStorage.removeItem(SESSION_KEY);
  },

  getCurrentUser(): User | null {
    const session = localStorage.getItem(SESSION_KEY);
    return session ? JSON.parse(session) : null;
  },

  // Get organization from file
  async getOrganization(userId: string): Promise<Organization | null> {
    if (!userId) return null;
    try {
      const response = await fetch(`/api/organizations/${userId}`);
      const data = await response.json();
      return data || null;
    } catch (error) {
      console.error('Error fetching organization:', error);
      return null;
    }
  },

  // Get project from file
  async getProject(userId: string): Promise<Project | null> {
    if (!userId) return null;
    try {
      const response = await fetch(`/api/projects/user/${userId}`);
      const data = await response.json();
      return data || null;
    } catch (error) {
      console.error('Error fetching project:', error);
      return null;
    }
  },

  async createOrganizationAndProject(userId: string, orgName: string, projectName: string): Promise<void> {
    await delay(600);
    
    const org: Organization = {
      id: crypto.randomUUID(),
      name: orgName,
      slug: orgName.toLowerCase().replace(/\s+/g, '-'),
    };
    
    const project: Project = {
      id: crypto.randomUUID(),
      name: projectName,
      organizationId: org.id,
    };

    // Save organization to file
    await fetch('/api/organizations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, ...org }),
    });
    logDbState(`Organization Created for ${userId}`, org);

    // Save project to file
    await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, ...project }),
    });
    logDbState(`Project Created for ${userId}`, project);
  },

  async updateProject(userId: string, project: Project): Promise<void> {
    await delay(400);
    
    await fetch('/api/projects', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, ...project }),
    });
    logDbState(`Project Updated for ${userId}`, project);
  },

  // Get all organizations (for dropdown)
  async getAllOrganizations(): Promise<Organization[]> {
    try {
      const response = await fetch('/api/organizations');
      const data = await response.json();
      // Convert object to array
      return Object.values(data).filter((o): o is Organization => o !== null);
    } catch (error) {
      console.error('Error fetching organizations:', error);
      return [];
    }
  },

  // Get all projects (for dropdown)
  async getAllProjects(): Promise<Project[]> {
    try {
      const response = await fetch('/api/projects');
      const data = await response.json();
      // Convert object to array
      return Object.values(data).filter((p): p is Project => p !== null);
    } catch (error) {
      console.error('Error fetching projects:', error);
      return [];
    }
  },

  // Create a new organization
  async createOrganization(userId: string, orgName: string): Promise<Organization> {
    await delay(400);
    
    const org: Organization = {
      id: crypto.randomUUID(),
      name: orgName,
      slug: orgName.toLowerCase().replace(/\s+/g, '-'),
    };

    await fetch('/api/organizations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, ...org }),
    });
    logDbState(`Organization Created for ${userId}`, org);
    
    return org;
  },

  // Create a new project
  async createProject(userId: string, projectName: string, organizationId: string): Promise<Project> {
    await delay(400);
    
    const project: Project = {
      id: crypto.randomUUID(),
      name: projectName,
      organizationId,
    };

    await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, ...project }),
    });
    logDbState(`Project Created for ${userId}`, project);
    
    return project;
  }
};
