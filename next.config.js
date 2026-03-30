/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configuración de Next.js para la aplicación de censo
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client', 'bcryptjs'],
  },
};

module.exports = nextConfig;
