import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { PortalNavbar } from '@/components/portal/PortalNavbar';
import { PortalFooter } from '@/components/portal/PortalFooter';

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session) {
    redirect('/portal/auth/login');
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <PortalNavbar user={session.user} />
      <main className="flex-grow">{children}</main>
      <PortalFooter />
    </div>
  );
}
