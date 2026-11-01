import type { Metadata } from 'next';
import MePage from '@/components/me/MePage';

export const metadata: Metadata = {
  title: 'me · yuria / 悠里亜',
  description: '回首向来萧瑟处，也无风雨也无晴。认识 yuria / 悠里亜，走进我的小小世界。',
  alternates: { canonical: 'https://www.yuria.xin/me' },
};

export default function Page() {
  return <MePage />;
}
