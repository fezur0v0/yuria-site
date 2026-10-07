import type { MetadataRoute } from 'next';
import { createClient } from '@supabase/supabase-js';

const SITE_URL = 'https://www.yuria.xin';
const PAGE_SIZE = 1000;

// 后台更新内容后，网站地图最多缓存一小时。
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // 使用匿名客户端，生成地图时不读取管理员的登录状态。
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  async function publicUrls(
    table: 'portfolio_items' | 'gallery_albums',
    route: 'portfolio' | 'gallery',
  ): Promise<MetadataRoute.Sitemap> {
    const entries: MetadataRoute.Sitemap = [];

    // 分页读取，避免 Supabase 默认返回数量上限遗漏作品或相册。
    for (let offset = 0; ; offset += PAGE_SIZE) {
      const { data, error } = await supabase
        .from(table)
        .select('id')
        .eq('is_visible', true)
        .order('id', { ascending: true })
        .range(offset, offset + PAGE_SIZE - 1);

      if (error) {
        // 查询失败时不缓存一份缺少页面的不完整地图。
        throw new Error(`Unable to generate sitemap for ${table}: ${error.message}`);
      }

      for (const item of data ?? []) {
        entries.push({
          url: `${SITE_URL}/${route}/${encodeURIComponent(String(item.id))}`,
        });
      }

      if (!data || data.length < PAGE_SIZE) break;
    }

    return entries;
  }

  const [portfolio, gallery] = await Promise.all([
    publicUrls('portfolio_items', 'portfolio'),
    publicUrls('gallery_albums', 'gallery'),
  ]);

  return [
    { url: `${SITE_URL}/` },
    { url: `${SITE_URL}/portfolio` },
    { url: `${SITE_URL}/gallery` },
    { url: `${SITE_URL}/links` },
    ...portfolio,
    ...gallery,
  ];
}
