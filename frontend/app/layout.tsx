import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import './globals.css';
import { Navbar } from '@/components/layout/Navbar';
import { GlobalErrorHandler } from '@/components/GlobalErrorHandler';
import { auth } from '@/lib/auth';

import { Providers } from './providers';
import { InactivityListener } from '@/components/auth/InactivityListener';

export const metadata: Metadata = {
  title: 'Quintas de Otinapa CRM',
  description: 'Sistema de gestión de lotes campestres',
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const session = await auth();

  return (
    <html lang="es" suppressHydrationWarning>
      <body className="min-h-screen antialiased bg-background text-foreground">
        <Providers>
          <GlobalErrorHandler />
          <InactivityListener />
          <Navbar user={session?.user} />
          {children}
        </Providers>
      </body>
    </html>
  );
}
