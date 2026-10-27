import { requireOwner } from '@/utils/auth/requireOwner';
import { redirect } from 'next/navigation';

export default async function StoragePage() {
  await requireOwner();
  redirect('/admin');
}
