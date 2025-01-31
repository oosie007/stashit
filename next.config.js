/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['*'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
        pathname: '**',
      },
      {
        protocol: 'http',
        hostname: '**',
        pathname: '**',
      }
    ],
  },
}

module.exports = nextConfig 