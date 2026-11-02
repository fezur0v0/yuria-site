import RecordDetailPage from '@/components/notes/RecordDetailPage';
import { requireOwner } from '@/utils/auth/requireOwner';

export default async function Page() {
  await requireOwner('/notes');
  return <RecordDetailPage />;
}
