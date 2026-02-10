import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: ['./app/**/*.{js,ts,jsx,tsx,mdx}', './components/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: {
          DEFAULT: 'hsl(var(--background))', // Crema suave (Warm paper) - Mapeado a variable
          paper: '#FFFFFF', // Blanco puro para tarjetas
          subtle: '#FFF5F5', // Rosado muy pálido para secciones alternas
        },
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: '#C05621', // Terracota principal
          light: '#ED8936', // Terracota claro
          dark: '#9C4221', // Terracota oscuro
          foreground: '#FFFFFF',
        },
        secondary: {
          DEFAULT: '#D69E2E', // Ocre/Dorado
          light: '#ECC94B', // Dorado claro
          dark: '#B7791F', // Bronce
          foreground: '#FFFFFF',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        // Colores de texto cálidos (Mantenidos)
        text: {
          primary: '#4A2C21', // Marrón oscuro (Coffee)
          secondary: '#7B341E', // Marrón rojizo
          muted: '#718096', // Gris neutro
          light: '#FDFBF7', // Texto claro sobre fondos oscuros
        },
        // Estatus Semánticos (Redefinidos para armonía)
        status: {
          disponible: '#6B8E23', // Verde Oliva
          apartado: '#D69E2E', // Ocre (Igual a secondary)
          vendido: '#9B2C2C', // Rojo profundo/Vino
          liquidado: '#2C5282', // Azul marino cálido
        },
        // Mantener compatibilidad con clases anteriores
        success: '#6B8E23',
        warning: '#D69E2E',
        danger: '#9B2C2C',
        info: '#2C5282',
      },
      boxShadow: {
        warm: '0 4px 14px 0 rgba(192, 86, 33, 0.15)',
        'warm-hover': '0 6px 20px 0 rgba(192, 86, 33, 0.25)',
        card: '0 2px 8px 0 rgba(74, 44, 33, 0.08)',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
        xl: '1rem',
        '2xl': '1.5rem',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        shake: 'shake 0.5s cubic-bezier(.36,.07,.19,.97) both',
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shake: {
          '10%, 90%': { transform: 'translate3d(-1px, 0, 0)' },
          '20%, 80%': { transform: 'translate3d(2px, 0, 0)' },
          '30%, 50%, 70%': { transform: 'translate3d(-4px, 0, 0)' },
          '40%, 60%': { transform: 'translate3d(4px, 0, 0)' },
        },
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
