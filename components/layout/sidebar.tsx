"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { SidebarProps, NavItem } from "./types";

function IconDashboard({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true"><path d="M3 3h8v8H3V3zm10 0h8v12h-8V3zM3 13h8v8H3v-8zm10 6h8v2h-8v-2z"/></svg>
  );
}

function IconSales({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true"><path d="M3 13l6 6 12-12-6-6L3 13zm6 4L5 13l8-8 4 4-8 8z"/></svg>
  );
}

function IconMap({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true"><path d="M9 3l6 2 6-2v18l-6 2-6-2-6 2V5l6-2zm0 2.2L5 6v12.8l4-1.3V5.2zm2 0v12.3l4 1.3V6.5l-4-1.3zm10-.9l-4 1.3v12.3l4-1.3V4.3z"/></svg>
  );
}

function IconClients({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true"><path d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5zm-7 9a7 7 0 0 1 14 0H5z"/></svg>
  );
}

function IconPayments({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true"><path d="M3 5h18v14H3V5zm2 2v2h14V7H5zm0 4v6h14v-6H5z"/></svg>
  );
}

function IconCommissions({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true"><path d="M12 2l2.4 4.9L20 8l-4 3.9.9 5.7L12 15l-4.9 2.6L8 11.9 4 8l5.6-1.1L12 2z"/></svg>
  );
}

function IconSettings({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true"><path d="M19.14 12.94a7.987 7.987 0 0 0 .06-.94c0-.32-.02-.63-.06-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7.1 7.1 0 0 0-1.63-.94l-.36-2.54A.5.5 0 0 0 14.3 1h-4.6a.5.5 0 0 0-.49.41l-.36 2.54c-.57.22-1.12.52-1.63.94l-2.39-.96a.5.5 0 0 0-.6.22L2.3 7.01a.5.5 0 0 0 .12.64l2.03 1.58c-.04.31-.06.62-.06.94s.02.63.06.94L2.42 13.7a.5.5 0 0 0-.12.64l1.92 3.32c.12.21.38.3.6.22l2.39-.96c.51.42 1.06.72 1.63.94l.36 2.54c.06.24.26.41.49.41h4.6c.23 0 .43-.17.49-.41l.36-2.54c.57-.22 1.12-.52 1.63-.94l2.39.96c.22.09.48-.01.6-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58zM12 15.5A3.5 3.5 0 1 1 15.5 12 3.5 3.5 0 0 1 12 15.5z"/></svg>
  );
}

const defaultItems: NavItem[] = [
  { key: "dashboard", label: "Dashboard", href: "/dashboard", icon: IconDashboard },
  { key: "ventas", label: "Ventas", href: "/ventas", icon: IconSales },
  { key: "inventario", label: "Inventario (Mapa)", href: "/inventario", icon: IconMap },
  { key: "clientes", label: "Clientes", href: "/clientes", icon: IconClients },
  { key: "pagos", label: "Pagos", href: "/pagos", icon: IconPayments },
  { key: "comisiones", label: "Comisiones", href: "/comisiones", icon: IconCommissions },
  { key: "configuracion", label: "Configuración", href: "/configuracion", icon: IconSettings },
];

export default function Sidebar(props: SidebarProps) {
  const pathname = usePathname();
  const items = props.items ?? defaultItems;
  const variant = props.variant ?? "primary";
  const bgClass = variant === "secondary" ? "bg-secondary" : "bg-primary";

  return (
    <aside
      aria-label="Navegación principal"
      className={[
        "h-full w-72 shrink-0",
        "text-surface",
        bgClass,
        "border-r border-border",
        "flex flex-col",
        props.mobile ? "fixed inset-y-0 left-0 z-[1200] transform transition-transform duration-200" : "sticky top-0",
        props.mobile && !props.open ? "-translate-x-full" : "translate-x-0",
      ].join(" ")}
    >
      <div className="h-16 flex items-center px-6 border-b border-border">
        <span className="text-display-sm">Quintas OS</span>
      </div>
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="px-2 space-y-2">
          {items.map((item) => {
            const active = pathname?.startsWith(item.href);
            const Icon = item.icon;
            return (
              <li key={item.key}>
                <Link
                  href={item.href}
                  aria-label={item.label}
                  aria-current={active ? "page" : undefined}
                  onClick={props.onNavigate}
                  className={[
                    "group flex items-center gap-3 px-4 py-3 rounded-md",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                    active ? "bg-surface/15" : "hover:bg-surface/10",
                    "transition-colors",
                  ].join(" ")}
                >
                  {Icon ? <Icon className={["h-5 w-5", active ? "text-accent" : "text-surface"].join(" ")} /> : null}
                  <span className="text-body-sm">{item.label}</span>
                  {active ? <span className="ml-auto h-5 w-1 rounded-full bg-accent" aria-hidden="true" /> : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
