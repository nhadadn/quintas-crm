import React from 'react';

interface AuthCardProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}

export function AuthCard({ children, title, subtitle }: AuthCardProps) {
  return (
    <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 w-full animate-fade-in">
      {(title || subtitle) && (
        <div className="sm:mx-auto sm:w-full sm:max-w-md mb-6">
          {title && (
            <h2 className="text-center text-3xl font-bold tracking-tight text-gray-900">{title}</h2>
          )}
          {subtitle && <p className="mt-2 text-center text-sm text-gray-600">{subtitle}</p>}
        </div>
      )}
      {children}
    </div>
  );
}
