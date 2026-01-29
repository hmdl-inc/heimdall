import React from 'react';

interface AuthLayoutProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ title, subtitle, children }) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-[400px]">
        {/* Brand Header */}
        <div className="flex flex-col items-center mb-8">
          <img src="/logo.png" alt="Heimdall" className="w-16 h-16 mb-3" />
          <span className="text-2xl font-bold text-slate-900 tracking-tight">Heimdall</span>
        </div>

        {/* Card */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-8">
          <div className="mb-6 text-center">
            <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
            {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
          </div>
          
          {children}
        </div>
        
        <div className="mt-8 text-center">
          <p className="text-xs text-slate-400">
            &copy; {new Date().getFullYear()} Heimdall Inc. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};
