import type { NextConfig } from 'next';
import assets from './generated/site-assets.json';

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "script-src 'self' 'unsafe-inline'",
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
    const redirects = Object.entries(files).map(([source, file]) => ({ source,
      destination: `${assets.baseUrl}/${file.key.split('/').map(encodeURIComponent).join('/')}`, permanent: true }));
    if (files['/icon.png']) redirects.push({ source: '/apple-icon.png',
      destination: `${assets.baseUrl}/${files['/icon.png'].key}`, permanent: true });
    return redirects;
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
