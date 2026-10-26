import { createClient } from '@/utils/content/server';
import { requireOwner } from '@/utils/auth/requireOwner';
import { notFound } from 'next/navigation';
import PortfolioForm from '@/components/PortfolioForm';

export default async function EditPortfolioPage({ params }: { params: Promise<{ id: string }> }) {
  await requireOwner();
  const supabase = await createClient();
  const { id } = await params;

  const { data: item } = await supabase
    .from('portfolio_items')
    .select('id, title, category, date, tags, content, cover_url')
    .eq('id', id)
    .single();

  if (!item) notFound();

  return <PortfolioForm initialData={item} />;
}
