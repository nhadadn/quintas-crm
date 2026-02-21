import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./extensions/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background) / <alpha-value>)",
        foreground: "hsl(var(--foreground) / <alpha-value>)",
        primary: "hsl(var(--primary) / <alpha-value>)",
        onprimary: "hsl(var(--on-primary) / <alpha-value>)",
        secondary: "hsl(var(--secondary) / <alpha-value>)",
        accent: "hsl(var(--accent) / <alpha-value>)",
        accentcontrast: "hsl(var(--accent-contrast) / <alpha-value>)",
        onaccent: "hsl(var(--on-accent) / <alpha-value>)",
        surface: "hsl(var(--surface) / <alpha-value>)",
        surfacevariant: "hsl(var(--surface-variant) / <alpha-value>)",
        onsurface: "hsl(var(--on-surface) / <alpha-value>)",
        muted: "hsl(var(--muted) / <alpha-value>)",
        border: "hsl(var(--border) / <alpha-value>)",
        success: "hsl(var(--success) / <alpha-value>)",
        warning: "hsl(var(--warning) / <alpha-value>)",
        error: "hsl(var(--error) / <alpha-value>)",
        info: "hsl(var(--info) / <alpha-value>)",
      },
      fontFamily: {
        sans: ["Inter", "Segoe UI", "Helvetica Neue", "Arial", "system-ui", "sans-serif"],
        serif: ["Playfair Display", "Times New Roman", "Georgia", "serif"],
      },
      boxShadow: {
        "s-100": "var(--shadow-s-100)",
        "s-200": "var(--shadow-s-200)",
        "s-300": "var(--shadow-s-300)",
        "s-400": "var(--shadow-s-400)",
        "s-500": "var(--shadow-s-500)",
        premium: "var(--shadow-premium-glow)",
      },
      borderRadius: {
        xs: "var(--radius-xs)",
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "slide-in": {
          from: { transform: "translateY(8px)", opacity: "0" },
          to: { transform: "translateY(0px)", opacity: "1" },
        },
      },
      animation: {
        "accordion-down": "accordion-down var(--duration-base) var(--easing-entrance) both",
        "accordion-up": "accordion-up var(--duration-base) var(--easing-exit) both",
        "fade-in": "fade-in var(--duration-base) var(--easing-entrance) both",
        "slide-in": "slide-in var(--duration-base) var(--easing-entrance) both",
      },
    },
  },
  plugins: [],
};

export default config;
