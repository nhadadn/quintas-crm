import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{js,ts,jsx,tsx,mdx}', './components/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#3D6B1F', // verde principal
          dark: '#2D5016', // verde oscuro
        },
        accent: '#F4C430', // amarillo ciervo
        success: '#10B981', // verde disponible
        warning: '#F59E0B', // amarillo apartado
        danger: '#EF4444', // rojo vendido
        info: '#6366F1', // azul liquidado
      },
    },
  },
  plugins: [],
};

export default config;
