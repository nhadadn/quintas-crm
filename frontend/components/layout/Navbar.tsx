'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { User } from 'next-auth';

interface NavbarProps {
  user?: User;
}

export function Navbar({ user }: NavbarProps) {
  const pathname = usePathname();

  // No mostrar navbar en el mapa a pantalla completa
  if (pathname === '/mapa') return null;

  const isActive = (path: string) => pathname === path;

  return (
    <nav className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center gap-8">
            <Link
              href="/"
              className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent"
            >
              Quintas CRM
            </Link>
            <div className="hidden md:flex gap-6 text-sm font-medium text-slate-400">
              <Link
                href="/"
                className={`transition-colors ${isActive('/') ? 'text-emerald-400' : 'hover:text-slate-100'}`}
              >
                Dashboard
              </Link>
              {user?.role === 'Administrator' && (
                <Link
                  href="/dashboard"
                  className={`transition-colors ${isActive('/dashboard') ? 'text-emerald-400' : 'hover:text-slate-100'} font-bold text-amber-400`}
                >
                  Admin Panel
                </Link>
              )}
              <Link
                href="/mapa"
                className={`transition-colors ${isActive('/mapa') ? 'text-emerald-400' : 'hover:text-slate-100'}`}
              >
                Mapa
              </Link>
              <Link
                href="/ventas"
                className={`transition-colors ${isActive('/ventas') ? 'text-emerald-400' : 'hover:text-slate-100'}`}
              >
                Ventas
              </Link>
              <Link
                href="/pagos"
                className={`transition-colors ${isActive('/pagos') ? 'text-emerald-400' : 'hover:text-slate-100'}`}
              >
                Pagos
              </Link>
              <Link
                href="/clientes"
                className={`transition-colors ${isActive('/clientes') ? 'text-emerald-400' : 'hover:text-slate-100'}`}
              >
                Clientes
              </Link>
              <Link
                href="/vendedores"
                className={`transition-colors ${isActive('/vendedores') ? 'text-emerald-400' : 'hover:text-slate-100'}`}
              >
                Vendedores
              </Link>
              <Link
                href="/portal"
                className={`transition-colors ${isActive('/portal') ? 'text-emerald-400' : 'hover:text-slate-100'}`}
              >
                Portal Cliente
              </Link>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-xs font-bold text-white">
              AD
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
