import GalleryPage from '@/components/admin/GalleryPage';
import { requireOwner } from '@/utils/auth/requireOwner';

export default async function Page() {
  await requireOwner();
  return <GalleryPage />;
}
