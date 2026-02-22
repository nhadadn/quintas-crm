'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { User } from 'next-auth';

interface NavbarProps {
  user?: User;
}

export function Navbar({ user }: NavbarProps) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // No mostrar navbar en el mapa a pantalla completa
  if (pathname === '/mapa') return null;
  // Evitar cualquier desajuste de hidratación por cambios post-mount en rol/links
  if (!mounted) {
    return (
      <nav className="border-b border-border bg-background-paper/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-8">
              <Link
                href="/"
                className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent"
              >
                Quintas CRM
              </Link>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-primary-foreground">
                AD
              </div>
            </div>
          </div>
        </div>
      </nav>
    );
  }

  const isActive = (path: string) => pathname === path;

  return (
    <nav className="border-b border-border bg-background-paper/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center gap-8">
            <Link
              href={
                user?.role === 'Vendedor'
                  ? '/dashboard/ventas'
                  : user?.role === 'Cliente'
                    ? '/portal'
                    : '/'
              }
              className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent"
            >
              Quintas CRM
            </Link>
            <div className="hidden md:flex gap-6 text-sm font-medium text-muted-foreground">
              {user?.role === 'Cliente' && (
                <Link
                  href="/portal"
                  className={`transition-colors ${
                    isActive('/portal')
                      ? 'text-primary-light'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Portal del Cliente
                </Link>
              )}

              {user?.role === 'Vendedor' && (
                <>
                  <Link
                    href="/ventas"
                    className={`transition-colors ${
                      isActive('/ventas')
                        ? 'text-primary-light'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Ventas
                  </Link>
                  <Link
                    href="/clientes"
                    className={`transition-colors ${
                      isActive('/clientes')
                        ? 'text-primary-light'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Clientes
                  </Link>
                  <Link
                    href="/dashboard/comisiones"
                    className={`transition-colors ${
                      isActive('/dashboard/comisiones')
                        ? 'text-primary-light'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Comisiones
                  </Link>
                </>
              )}

              {!user?.role && (
                <>
                  <Link
                    href="/"
                    className={`transition-colors ${
                      isActive('/') ? 'text-primary-light' : 'hover:text-foreground'
                    }`}
                  >
                    Dashboard
                  </Link>
                  <Link
                    href="/mapa"
                    className={`transition-colors ${
                      isActive('/mapa')
                        ? 'text-primary-light'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Mapa
                  </Link>
                  <Link
                    href="/ventas"
                    className={`transition-colors ${
                      isActive('/ventas')
                        ? 'text-primary-light'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Ventas
                  </Link>
                  <Link
                    href="/pagos"
                    className={`transition-colors ${
                      isActive('/pagos')
                        ? 'text-primary-light'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Pagos
                  </Link>
                  <Link
                    href="/clientes"
                    className={`transition-colors ${
                      isActive('/clientes')
                        ? 'text-primary-light'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Clientes
                  </Link>
                  <Link
                    href="/vendedores"
                    className={`transition-colors ${
                      isActive('/vendedores')
                        ? 'text-primary-light'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Vendedores
                  </Link>
                  <Link
                    href="/portal"
                    className={`transition-colors ${
                      isActive('/portal')
                        ? 'text-primary-light'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Portal del Cliente
                  </Link>
                </>
              )}

              {user?.role && user.role !== 'Cliente' && user.role !== 'Vendedor' && (
                <>
                  <Link
                    href="/"
                    className={`transition-colors ${
                      isActive('/') ? 'text-primary-light' : 'hover:text-foreground'
                    }`}
                  >
                    Dashboard
                  </Link>
                  {user.role === 'Administrator' && (
                    <Link
                      href="/dashboard"
                      className={`transition-colors ${
                        isActive('/dashboard')
                          ? 'text-primary-light'
                          : 'text-muted-foreground hover:text-foreground'
                      } font-semibold`}
                    >
                      Admin Panel
                    </Link>
                  )}
                  <Link
                    href="/mapa"
                    className={`transition-colors ${
                      isActive('/mapa')
                        ? 'text-primary-light'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Mapa
                  </Link>
                  <Link
                    href="/ventas"
                    className={`transition-colors ${
                      isActive('/ventas')
                        ? 'text-primary-light'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Ventas
                  </Link>
                  <Link
                    href="/pagos"
                    className={`transition-colors ${
                      isActive('/pagos')
                        ? 'text-primary-light'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Pagos
                  </Link>
                  <Link
                    href="/clientes"
                    className={`transition-colors ${
                      isActive('/clientes')
                        ? 'text-primary-light'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Clientes
                  </Link>
                  <Link
                    href="/vendedores"
                    className={`transition-colors ${
                      isActive('/vendedores')
                        ? 'text-primary-light'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Vendedores
                  </Link>
                  <Link
                    href="/portal"
                    className={`transition-colors ${
                      isActive('/portal')
                        ? 'text-primary-light'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Portal del Cliente
                  </Link>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-primary-foreground">
              AD
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
