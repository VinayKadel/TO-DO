/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable experimental features for server actions
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  // Empty turbopack config to use defaults
  turbopack: {},
};

module.exports = nextConfig;
