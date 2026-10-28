'use client';

import PortfolioNav from '@/components/PortfolioNav';

export default function AdminNav({ theme = 'light' }: { theme?: 'light' | 'dark' }) {
  return <PortfolioNav mode="admin" theme={theme === 'dark' ? 'default' : 'light'} />;
}
