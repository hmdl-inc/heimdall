import React, { useState } from 'react';
import { AuthLayout } from './AuthLayout';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
import { authService } from '../services/authService';
import { User } from '../types';

interface SignupFormProps {
  onSuccess: (user: User) => void;
  onToggleMode: () => void;
}

export const SignupForm: React.FC<SignupFormProps> = ({ onSuccess, onToggleMode }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name || !email || !password) {
      setError('Please fill in all fields');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);
    const response = await authService.signup(name, email, password);
    setIsLoading(false);

    if (response.success && response.user) {
      onSuccess(response.user);
    } else {
      setError(response.message || 'Signup failed');
    }
  };

  return (
    <AuthLayout 
      title="Create Account"
      subtitle="Join the watch today."
    >
      <form onSubmit={handleSubmit} className="space-y-2">
        <Input
          label="Name"
          type="text"
          placeholder="John Doe"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

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
            Sign up
          </Button>
        </div>

        <div className="flex items-center justify-center mt-6">
          <span className="text-slate-400 text-sm mr-2">Already have an account?</span>
          <button 
            type="button"
            onClick={onToggleMode}
            className="text-sm font-semibold text-primary-600 hover:text-primary-500 transition-colors"
          >
            Sign in
          </button>
        </div>
      </form>
    </AuthLayout>
  );
};
