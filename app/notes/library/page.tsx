import LibraryPage from '@/components/notes/LibraryPage';
import { requireOwner } from '@/utils/auth/requireOwner';

export default async function Page() {
  await requireOwner('/notes');
  return <LibraryPage />;
}
