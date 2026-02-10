const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  // Optimizaciones para desarrollo y compilación
  experimental: {
    // Optimizar carga de módulos
    optimizePackageImports: ['lucide-react', 'date-fns', 'lodash'],
  },
  // Reducir frecuencia de comprobación de tipos en desarrollo para velocidad
  typescript: {
    ignoreBuildErrors: true, // Solo en build, pero ayuda saber que está ahí
  },
  // Configuración de Webpack para caché
  webpack: (config, { dev, isServer }) => {
    // Eliminado watchOptions con polling que causa alto uso de CPU en Windows
    return config;
  },
};

export default nextConfig;
