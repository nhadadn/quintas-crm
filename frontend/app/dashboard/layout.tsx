'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, ShoppingBag, CreditCard, Users, FileText, Settings } from 'lucide-react';
import { ErrorBoundary } from '@/components/ErrorBoundary';

const sidebarItems = [
  { name: 'Principal', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Ventas', href: '/dashboard/ventas', icon: ShoppingBag },
  { name: 'Pagos', href: '/dashboard/pagos', icon: CreditCard },
  { name: 'Comisiones', href: '/dashboard/comisiones', icon: Users },
  { name: 'Reportes', href: '/dashboard/reportes', icon: FileText },
  { name: 'Configuración', href: '/dashboard/configuracion', icon: Settings },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-[calc(100vh-64px)] bg-background">
      <aside className="w-64 bg-background-paper border-r border-border hidden md:block">
        <div className="px-5 py-6 space-y-4">
          <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
            Analytics
          </h2>
          <nav className="space-y-1.5">
            {sidebarItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl transition-colors ${
                    isActive
                      ? 'bg-accent/10 text-foreground'
                      : 'text-muted-foreground hover:bg-background-subtle hover:text-foreground'
                  }`}
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-card border border-border shadow-card">
                    <Icon className="w-4 h-4" />
                  </span>
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>
      <main className="flex-1 px-8 py-8 overflow-y-auto bg-background">
        <ErrorBoundary>{children}</ErrorBoundary>
      </main>
    </div>
  );
}
