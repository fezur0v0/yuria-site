import type { Metadata } from 'next';
import MePage from '@/components/me/MePage';
import { createClient } from '@/utils/content/server';
import { defaultMeContent, ME_CONFIG_KEY, parseMeContent } from '@/components/me/content';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'me · yuria / 悠里亜',
  description: '回首向来萧瑟处，也无风雨也无晴。认识 yuria / 悠里亜，走进我的小小世界。',
  alternates: { canonical: 'https://www.yuria.xin/me' },
};

export default async function Page() {
  let content = defaultMeContent;
  try {
    const client = await createClient();
    const { data, error } = await client.from('site_config').select('value').eq('key', ME_CONFIG_KEY).limit(1);
    if (!error) content = parseMeContent(data?.[0]?.value);
  } catch { /* Keep the introduction available if saved content cannot be read. */ }
  return <MePage content={content} />;
}
