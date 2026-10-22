import PortfolioForm from '@/components/PortfolioForm';
import { requireOwner } from '@/utils/auth/requireOwner';

export default async function NewPortfolioPage() {
  await requireOwner();
  return <PortfolioForm />;
}
