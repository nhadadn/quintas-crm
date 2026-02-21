"use client";
import "../styles/globals.css";
import Sidebar from "../components/layout/sidebar";
import Topbar from "../components/layout/topbar";
import { useState } from "react";
import { usePathname } from "next/navigation";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  return (
    <html lang="es">
      <body className="bg-background text-foreground">
        <div className="h-dvh w-dvw overflow-hidden">
          <div className="flex h-full">
            <div className="hidden sm:block h-full">
              <Sidebar items={undefined} activePath={pathname ?? undefined} variant="primary" />
            </div>
            <Sidebar items={undefined} activePath={pathname ?? undefined} variant="primary" mobile open={mobileOpen} onNavigate={() => setMobileOpen(false)} />
            <div className="flex-1 min-w-0 flex flex-col bg-background">
              <Topbar onOpenSidebar={() => setMobileOpen(true)} notificationsCount={3} user={{ name: "Andrea Torres", role: "Gerente Comercial" }} />
              <main className="flex-1 overflow-y-auto">
                <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
                  {children}
                </div>
              </main>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}

