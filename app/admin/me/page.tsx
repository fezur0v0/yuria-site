import MeSettings from '@/components/admin/MeSettings';
import { requireOwner } from '@/utils/auth/requireOwner';

export default async function Page() {
  await requireOwner();
  return <MeSettings />;
}
