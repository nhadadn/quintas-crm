import React from "react";

const tokens = [
  { name: "primary", var: "--primary" },
  { name: "on-primary", var: "--on-primary" },
  { name: "secondary", var: "--secondary" },
  { name: "accent", var: "--accent" },
  { name: "accent-contrast", var: "--accent-contrast" },
  { name: "surface", var: "--surface" },
  { name: "surface-variant", var: "--surface-variant" },
  { name: "on-surface", var: "--on-surface" },
  { name: "muted", var: "--muted" },
  { name: "border", var: "--border" },
  { name: "success", var: "--success" },
  { name: "warning", var: "--warning" },
  { name: "error", var: "--error" },
  { name: "info", var: "--info" },
];

export default function ThemeCheck() {
  return (
    <div className="min-h-screen p-8 space-y-12" style={{ backgroundColor: `hsl(var(--background))`, color: `hsl(var(--foreground))` }}>
      <section className="space-y-6">
        <h1 className="text-display-md">Colores</h1>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {tokens.map(t => (
            <div key={t.name} className="rounded-md shadow-s-100 border" style={{ backgroundColor: `hsl(var(${t.var}))`, borderColor: `hsl(var(--border))` }}>
              <div className="p-3 text-caption" style={{ color: `hsl(var(--on-surface))` }}>{t.name}</div>
              <div className="p-4 flex items-center justify-center" style={{ color: t.name.includes("on-") ? `hsl(var(--surface))` : `hsl(var(--on-surface))` }}>
                Aa
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-display-sm">Tipografía</h2>
        <p className="text-body-md">Sans</p>
        <div className="space-y-2">
          <div className="text-display-lg">Display LG</div>
          <div className="text-display-md">Display MD</div>
          <div className="text-display-sm">Display SM</div>
          <div className="text-heading-lg">Heading LG</div>
          <div className="text-heading-md">Heading MD</div>
          <div className="text-heading-sm">Heading SM</div>
          <div className="text-body-lg">Body LG</div>
          <div className="text-body-md">Body MD</div>
          <div className="text-body-sm">Body SM</div>
          <div className="text-caption">Caption</div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-display-sm">Sombras y radios</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          <div className="bg-white/70 p-6 rounded-[var(--radius-xs)] shadow-s-100 border" style={{ backgroundColor: `hsl(var(--surface))`, borderColor: `hsl(var(--border))` }}>s-100 xs</div>
          <div className="bg-white/70 p-6 rounded-[var(--radius-sm)] shadow-s-200 border" style={{ backgroundColor: `hsl(var(--surface))`, borderColor: `hsl(var(--border))` }}>s-200 sm</div>
          <div className="bg-white/70 p-6 rounded-[var(--radius-md)] shadow-s-300 border" style={{ backgroundColor: `hsl(var(--surface))`, borderColor: `hsl(var(--border))` }}>s-300 md</div>
          <div className="bg-white/70 p-6 rounded-[var(--radius-lg)] shadow-s-400 border" style={{ backgroundColor: `hsl(var(--surface))`, borderColor: `hsl(var(--border))` }}>s-400 lg</div>
          <div className="bg-white/70 p-6 rounded-[var(--radius-xl)] shadow-s-500 border" style={{ backgroundColor: `hsl(var(--surface))`, borderColor: `hsl(var(--border))` }}>s-500 xl</div>
          <div className="bg-white/70 p-6 rounded-[var(--radius-md)] shadow-premium border" style={{ backgroundColor: `hsl(var(--surface))`, borderColor: `hsl(var(--border))` }}>premium</div>
        </div>
      </section>
    </div>
  );
}
