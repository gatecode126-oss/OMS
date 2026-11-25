/** @type {import('next').NextConfig} */
const nextConfig = {
  // The Vite app rendered inside <React.StrictMode>; keep the same dev-time checks.
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  productionBrowserSourceMaps: false,

  // Strip debug console.log/info/debug calls from the production browser bundle
  // (the app logs on every render in several places); errors and warnings are kept.
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error', 'warn'] } : false
  },

  // The Express API under src/server is run directly by server.js, never bundled by Next.
  outputFileTracingExcludes: {
    '*': ['./src/server/**', './tests/**', './mobile/**', './docs/**', './logs/**']
  },

  experimental: {
    // Tree-shake barrel-file icon/chart libraries so each route only ships what it uses
    optimizePackageImports: [
      'lucide-react',
      'react-icons',
      'recharts',
      'date-fns',
      'emoji-picker-react'
    ]
  },

  // Same behaviour as the old <Navigate replace /> routes, handled before any JS loads
  async redirects() {
    return [
      { source: '/activity-logs', destination: '/security', permanent: false },
      { source: '/superadmin', destination: '/superadmin/overview', permanent: false }
    ];
  },

  async headers() {
    return [
      {
        // Previously configured in vercel.json — the service worker must never be cached
        source: '/service-worker.js',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0' }
        ]
      },
      {
        source: '/sounds/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=604800' }]
      }
    ];
  }
};

export default nextConfig;
