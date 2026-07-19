import { createClient } from '@/utils/supabase/client';
import { notFound } from 'next/navigation';
import PortfolioForm from '@/components/PortfolioForm';

export default async function EditPortfolioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createClient();

  const { data: item } = await supabase
    .from('portfolio_items')
    .select('id, title, category, date, tags, content, cover_url')
    .eq('id', id)
    .single();

  if (!item) notFound();

  return <PortfolioForm initialData={item} />;
}
