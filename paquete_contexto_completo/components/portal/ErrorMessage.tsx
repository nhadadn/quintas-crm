import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface ErrorMessageProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorMessage({
  title = 'Ocurrió un error',
  message = 'No pudimos cargar la información. Por favor, intenta de nuevo más tarde.',
  onRetry,
  className = '',
}: ErrorMessageProps) {
  return (
    <div className={`bg-red-900/20 border border-red-800 rounded-xl p-6 text-center ${className}`}>
      <div className="flex justify-center mb-4">
        <div className="p-3 bg-red-900/30 rounded-full">
          <AlertTriangle className="w-8 h-8 text-red-400" />
        </div>
      </div>
      <h3 className="text-lg font-medium text-red-200 mb-2">{title}</h3>
      <p className="text-red-300/80 mb-6 max-w-md mx-auto">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-red-100 bg-red-800 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
        >
          Intentar de nuevo
        </button>
      )}
    </div>
  );
}
