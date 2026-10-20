import { isOwnerRequest } from '@/utils/auth/isOwner';

export const dynamic = 'force-dynamic';

export async function GET() {
  const isOwner = await isOwnerRequest();

  return Response.json(
    { isOwner },
    {
      headers: {
        'Cache-Control': 'private, no-store',
      },
    }
  );
}
