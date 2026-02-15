'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, AppWindow, Webhook, Book } from 'lucide-react';

const sidebarItems = [
  { name: 'Dashboard', href: '/developer-portal', icon: LayoutDashboard },
  { name: 'Mis Aplicaciones', href: '/developer-portal/apps', icon: AppWindow },
  { name: 'Webhooks', href: '/developer-portal/webhooks', icon: Webhook },
  { name: 'Documentación', href: '/api-docs', icon: Book, external: true },
];

export default function DeveloperPortalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-[calc(100vh-64px)]">
      <aside className="w-64 bg-slate-900 border-r border-slate-800 hidden md:block">
        <div className="p-4">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">
            Developer Portal
          </h2>
          <nav className="space-y-1">
            {sidebarItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.href ||
                (item.href !== '/developer-portal' && pathname.startsWith(item.href));

              if (item.external) {
                return (
                  <a
                    key={item.name}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors text-slate-400 hover:bg-slate-800 hover:text-slate-100"
                  >
                    <Icon className="w-5 h-5" />
                    {item.name}
                  </a>
                );
              }

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    isActive
                      ? 'bg-blue-500/10 text-blue-400'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>
      <main className="flex-1 p-6 overflow-y-auto bg-slate-950">{children}</main>
    </div>
  );
}
