import type { MetadataRoute } from 'next';

const SITE_URL = 'https://www.yuria.xin';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: '/admin',
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
