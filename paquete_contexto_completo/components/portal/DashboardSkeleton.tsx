import React from 'react';

export function DashboardSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-pulse">
      {/* Header Skeleton */}
      <div className="mb-8 flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <div className="h-8 w-48 bg-slate-700 rounded mb-2"></div>
          <div className="h-4 w-32 bg-slate-700/50 rounded"></div>
        </div>
        <div className="h-8 w-64 bg-slate-700/50 rounded-full"></div>
      </div>

      {/* Stats Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-slate-800 border border-slate-700 rounded-xl p-6 h-32">
            <div className="h-4 w-24 bg-slate-700 rounded mb-4"></div>
            <div className="h-8 w-32 bg-slate-700 rounded mb-4"></div>
            <div className="h-4 w-40 bg-slate-700/50 rounded"></div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content Skeleton */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 h-96">
            <div className="h-6 w-48 bg-slate-700 rounded mb-6"></div>
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 w-full bg-slate-700/30 rounded"></div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar Skeleton */}
        <div className="space-y-6">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 h-64"></div>
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 h-64"></div>
        </div>
      </div>
    </div>
  );
}
