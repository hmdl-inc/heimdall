import React, { useState } from 'react';
import { AuthLayout } from './AuthLayout';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
import { authService } from '../services/authService';
import { User } from '../types';

interface LoginFormProps {
  onSuccess: (user: User) => void;
  onToggleMode: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSuccess, onToggleMode }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setIsLoading(true);
    const response = await authService.login(email, password);
    setIsLoading(false);

    if (response.success && response.user) {
      onSuccess(response.user);
    } else {
      setError(response.message || 'Login failed');
    }
  };

  return (
    <AuthLayout 
      title="Sign in to your account"
    >
      <form onSubmit={handleSubmit} className="space-y-2">
        <Input
          label="Email"
          type="email"
          placeholder="name@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        
        <Input
          label="Password"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        <div className="pt-4">
          <Button type="submit" isLoading={isLoading} className="w-full">
            Sign in
          </Button>
        </div>

        <div className="flex items-center justify-center mt-6">
          <span className="text-slate-400 text-sm mr-2">No Account yet?</span>
          <button 
            type="button"
            onClick={onToggleMode}
            className="text-sm font-semibold text-primary-600 hover:text-primary-500 transition-colors"
          >
            Sign up
          </button>
        </div>
      </form>
    </AuthLayout>
  );
};
