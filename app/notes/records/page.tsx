import RecordsPage from '@/components/notes/RecordsPage';
import { requireOwner } from '@/utils/auth/requireOwner';

export default async function Page() {
  await requireOwner('/notes');
  return <RecordsPage />;
}
