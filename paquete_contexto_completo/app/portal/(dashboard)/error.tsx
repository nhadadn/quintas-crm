'use client';

import { useEffect } from 'react';
import { ErrorMessage } from '@/components/portal/ErrorMessage';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Portal Dashboard Error:', error);
  }, [error]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <ErrorMessage
        title="Algo salió mal"
        message={
          error.message ||
          'Ocurrió un error inesperado al cargar la página. Por favor intenta recargar.'
        }
        className="animate-fade-in"
      />
      <div className="mt-6 flex justify-center">
        <button
          onClick={() => reset()}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-md transition-colors shadow-sm"
        >
          Intentar de nuevo
        </button>
      </div>
    </div>
  );
}
