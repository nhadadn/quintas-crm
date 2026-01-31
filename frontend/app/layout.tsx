import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import './globals.css';
import { Navbar } from '@/components/layout/Navbar';

export const metadata: Metadata = {
  title: 'Quintas de Otinapa CRM',
  description: 'Sistema de gestión de lotes campestres',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen antialiased bg-slate-950 text-slate-50">
        <Navbar />
        {children}
      </body>
    </html>
  );
}
