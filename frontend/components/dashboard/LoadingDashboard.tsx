'use client';

import React from 'react';
import { RefreshCw } from 'lucide-react';

type Props = { text?: string; fullScreen?: boolean };

export function LoadingDashboard({ text, fullScreen }: Props) {
  return (
    <div className={fullScreen ? 'flex items-center justify-center min-h-screen' : 'flex items-center justify-center h-64'}>
      <div className="text-slate-400 animate-pulse flex items-center gap-2">
        <RefreshCw className="w-5 h-5 animate-spin" />
        {text || 'Cargando dashboard...'}
      </div>
    </div>
  );
}

