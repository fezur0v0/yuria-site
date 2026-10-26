import { requireOwner } from '@/utils/auth/requireOwner';
import StorageBackup from './StorageBackup';

export default async function StoragePage() {
  await requireOwner();
  return <StorageBackup />;
}
