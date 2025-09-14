/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: '127.0.0.1',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: 'backend',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: 'minio',
        port: '',
        pathname: '/**',
      },
    ],
  },
  async rewrites() {
    // In Docker, use backend service name, otherwise use localhost
    const apiUrl = process.env.DOCKER_ENV === 'true' 
      ? 'http://backend:8080/api'
      : 'http://localhost:8080/api';
      
    return [
      {
        source: '/api/:path*',
        destination: `${apiUrl}/:path*`,
      },
      {
        source: '/health',
        destination: 'http://localhost:8080/health',
      },
    ];
  },
};

module.exports = nextConfig;