"use client";
import type { TopbarProps } from "./types";

function IconBell({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true"><path d="M12 22a2 2 0 0 0 2-2h-4a2 2 0 0 0 2 2zm6-6V11a6 6 0 0 0-5-5.91V4a1 1 0 0 0-2 0v1.09A6 6 0 0 0 6 11v5l-2 2v1h16v-1l-2-2z"/></svg>
  );
}

function IconMenu({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true"><path d="M3 6h18v2H3V6zm0 5h18v2H3v-2zm0 5h18v2H3v-2z"/></svg>
  );
}

export default function Topbar({ onOpenSidebar, notificationsCount = 0, user }: TopbarProps) {
  return (
    <header className="h-16 bg-surface border-b border-border flex items-center px-4 sm:px-6 sticky top-0 z-[1100] shadow-s-100">
      <div className="flex items-center gap-3 sm:gap-4 w-full">
        <button
          type="button"
          onClick={onOpenSidebar}
          aria-label="Abrir menú"
          className="sm:hidden inline-flex items-center justify-center h-10 w-10 rounded-md bg-surface/60 hover:bg-surface/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent text-foreground"
        >
          <IconMenu className="h-5 w-5" />
        </button>

        <div className="flex-1 max-w-xl">
          <div
            className="group flex items-center gap-3 px-3 py-2 rounded-md bg-surface/60 hover:bg-surface/80 border border-border shadow-premium cursor-text"
            role="button"
            aria-label="Abrir búsqueda global (Ctrl+K)"
            tabIndex={0}
          >
            <span className="text-muted text-body-sm">Buscar…</span>
            <span className="ml-auto text-caption text-muted">Ctrl+K</span>
          </div>
        </div>

        <button
          type="button"
          aria-label="Notificaciones"
          className="relative inline-flex items-center justify-center h-10 w-10 rounded-md hover:bg-surface/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <IconBell className="h-5 w-5 text-foreground" />
          {notificationsCount > 0 ? (
            <span className="absolute -top-1 -right-1 h-5 min-w-[20px] px-1 rounded-full bg-accent text-onaccent text-caption flex items-center justify-center border border-border">
              {notificationsCount}
            </span>
          ) : null}
        </button>

        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-primary/20 border border-border overflow-hidden" aria-hidden="true" />
          <div className="hidden sm:flex flex-col">
            <span className="text-heading-sm text-foreground">{user?.name ?? "Usuario"}</span>
            <span className="text-caption text-muted">{user?.role ?? "Rol"}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
