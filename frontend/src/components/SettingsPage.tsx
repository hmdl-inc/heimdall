import React, { useState, useEffect } from 'react';
import { Project } from '../types';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { authService } from '../services/authService';
import { Trash2, Copy, Plus } from 'lucide-react';

interface SettingsPageProps {
  userId: string;
  project: Project;
  onUpdateProject: (project: Project) => void;
}

interface ApiKey {
  id: string;
  created: string;
  note: string;
  publicKey: string;
  secretKey: string;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ userId, project, onUpdateProject }) => {
  // --- Project Name State ---
  const [projectName, setProjectName] = useState(project.name);
  const [isSavingProject, setIsSavingProject] = useState(false);

  // --- API Keys State ---
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);

  // Load API keys from local storage on mount
  useEffect(() => {
    const storedKeys = localStorage.getItem(`heimdall_api_keys_${project.id}`);
    if (storedKeys) {
      setApiKeys(JSON.parse(storedKeys));
    } else {
        // Default dummy key for initial view
        const defaultKey: ApiKey = {
            id: '1',
            created: new Date().toLocaleDateString(),
            note: 'Default Key',
            publicKey: 'pk_live_51M...',
            secretKey: 'sk_live_51M...'
        };
        setApiKeys([defaultKey]);
    }
  }, [project.id]);

  // Handle Project Name Update
  const handleSaveProject = async () => {
    if (!projectName.trim()) return;
    setIsSavingProject(true);
    
    const updatedProject = { ...project, name: projectName };
    await authService.updateProject(userId, updatedProject);
    onUpdateProject(updatedProject);
    
    setIsSavingProject(false);
  };

  // Handle Create API Key
  const handleCreateKey = () => {
    const newKey: ApiKey = {
      id: crypto.randomUUID(),
      created: new Date().toLocaleDateString(),
      note: 'New API Key',
      publicKey: `pk_${Math.random().toString(36).substring(2, 15)}`,
      secretKey: `sk_${Math.random().toString(36).substring(2, 15)}`,
    };
    
    const updatedKeys = [...apiKeys, newKey];
    setApiKeys(updatedKeys);
    localStorage.setItem(`heimdall_api_keys_${project.id}`, JSON.stringify(updatedKeys));
  };

  // Handle Delete API Key
  const handleDeleteKey = (id: string) => {
    const updatedKeys = apiKeys.filter(k => k.id !== id);
    setApiKeys(updatedKeys);
    localStorage.setItem(`heimdall_api_keys_${project.id}`, JSON.stringify(updatedKeys));
  };

  return (
    <div className="space-y-12 pb-12">
      {/* 1. Host Name Section */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900">Host Name</h2>
        <div className="max-w-xl">
          <input 
            type="text" 
            disabled 
            value={window.location.origin}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-md text-slate-500 text-sm"
          />
        </div>
      </section>

      {/* 2. Project Name Section */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900">Project Name</h2>
        <div className="max-w-xl bg-white p-6 border border-slate-200 rounded-lg shadow-sm">
          <p className="text-sm text-slate-500 mb-4">
            Your Project is currently named <span className="font-semibold text-slate-900">'{project.name}'</span>
          </p>
          <div className="space-y-4">
            <Input 
              label="Project Name" 
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
            />
            <Button 
              onClick={handleSaveProject} 
              isLoading={isSavingProject}
              variant="secondary"
            >
              Save
            </Button>
          </div>
        </div>
      </section>

      {/* 3. API Keys Section */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900">API keys</h2>
            <Button onClick={handleCreateKey} variant="secondary" className="text-xs">
                <Plus className="w-4 h-4 mr-2" />
                Create new API keys
            </Button>
        </div>

        {/* .env Preview Box */}
        <div className="bg-slate-900 rounded-lg p-4 font-mono text-sm overflow-x-auto">
            <div className="text-slate-400 select-none mb-1">.env</div>
            <div className="space-y-1">
                <div className="flex">
                    <span className="text-blue-400">heimdall_secret_key</span>
                    <span className="text-slate-500 mx-2">=</span>
                    <span className="text-green-400">{apiKeys[0]?.secretKey || '...'}</span>
                </div>
                <div className="flex">
                    <span className="text-blue-400">heimdall_public_key</span>
                    <span className="text-slate-500 mx-2">=</span>
                    <span className="text-green-400">{apiKeys[0]?.publicKey || '...'}</span>
                </div>
                <div className="flex">
                    <span className="text-blue-400">heimdall_base_url</span>
                    <span className="text-slate-500 mx-2">=</span>
                    <span className="text-green-400">{window.location.origin}</span>
                </div>
            </div>
        </div>

        {/* API Keys Table */}
        <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm">
            <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                    <tr>
                        <th className="px-6 py-3 font-medium">Created</th>
                        <th className="px-6 py-3 font-medium">Note</th>
                        <th className="px-6 py-3 font-medium">Public key</th>
                        <th className="px-6 py-3 font-medium">Secret key</th>
                        <th className="px-6 py-3 font-medium text-right">Action</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {apiKeys.map((key) => (
                        <tr key={key.id} className="hover:bg-slate-50/50">
                            <td className="px-6 py-4 text-slate-600">{key.created}</td>
                            <td className="px-6 py-4 font-medium text-slate-900">
                                {key.note}
                            </td>
                            <td className="px-6 py-4 text-slate-500 font-mono text-xs">
                                {key.publicKey.substring(0, 12)}...
                            </td>
                            <td className="px-6 py-4 text-slate-500 font-mono text-xs">
                                {key.secretKey.substring(0, 12)}...
                            </td>
                            <td className="px-6 py-4 text-right">
                                <button 
                                    onClick={() => handleDeleteKey(key.id)}
                                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </td>
                        </tr>
                    ))}
                    {apiKeys.length === 0 && (
                        <tr>
                            <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                                No API keys found. Create one to get started.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
      </section>
    </div>
  );
};
