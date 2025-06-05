/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configure image optimization
  images: {
    domains: [],
    unoptimized: false,
  },
  experimental: {
    esmExternals: 'loose',
  },
  
  // Configure headers for CORS and security
  async headers() {
    return [
      {
        // Apply to all routes
        source: '/(.*)',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'X-Requested-With, Content-Type, Authorization',
          }
        ],
      },
      {
        // Apply specifically to static files
        source: '/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
