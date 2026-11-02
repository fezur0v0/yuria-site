import type { NextConfig } from 'next';
import assets from './generated/site-assets.json';

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com",
  "frame-src 'self' https://challenges.cloudflare.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com https://a.tuchuangyun.top",
  "img-src 'self' data: blob: https:",
  "media-src 'self' blob: https:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.r2.cloudflarestorage.com",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: contentSecurityPolicy },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=31536000',
  },
];

const nextConfig: NextConfig = {
  images: { remotePatterns: [{ protocol: 'https', hostname: new URL(assets.baseUrl).hostname, pathname: '/site-assets/**' }] },
  async redirects() {
    const files = assets.files as Record<string, { key: string }>;
    // These three are App Router metadata files and must be served from this
    // origin. Google drops a favicon that redirects to another host.
    const sameOriginIcons = new Set(['/favicon.ico', '/icon.png', '/apple-icon.png']);
    return [
      { source: '/notes/library', destination: '/notes/verse', permanent: true },
      { source: '/notes/records', destination: '/notes/echo', permanent: true },
      { source: '/notes/records/:path*', destination: '/notes/echo/:path*', permanent: true },
      ...Object.entries(files).filter(([source]) => !sameOriginIcons.has(source)).map(([source, file]) => ({
      source,
      destination: `${assets.baseUrl}/${file.key.split('/').map(encodeURIComponent).join('/')}`,
      permanent: true,
    })),
    ];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
