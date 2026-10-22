import SettingsPage from '@/components/admin/SettingsPage';
import { requireOwner } from '@/utils/auth/requireOwner';

export default async function Page() {
  await requireOwner();
  return <SettingsPage />;
}
