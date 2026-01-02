/** @type {import('next').NextConfig} */
const nextConfig = {
  // Use standalone output for smaller serverless functions
  output: 'standalone',

  // Optimize bundle
  experimental: {
    // Exclude heavy packages from serverless bundle
    serverComponentsExternalPackages: ['openai', 'bcryptjs'],
    optimizePackageImports: ['@supabase/supabase-js', 'jose'],
  },
};

module.exports = nextConfig;
