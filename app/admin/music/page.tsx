import MusicPage from '@/components/admin/MusicPage';
import { requireOwner } from '@/utils/auth/requireOwner';

export default async function Page() {
  await requireOwner();
  return <MusicPage />;
}
