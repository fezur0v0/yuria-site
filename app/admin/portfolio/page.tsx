import PortfolioPage from '@/components/admin/PortfolioPage';
import { requireOwner } from '@/utils/auth/requireOwner';

export default async function Page() {
  await requireOwner();
  return <PortfolioPage />;
}
