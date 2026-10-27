import { NextResponse } from 'next/server';
import { contentContext } from '@/utils/content/request';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'private, no-store', Vary: 'Cookie' };
export async function GET() {
  // Retained as the browser content client's read-only backend/epoch handshake.
  const access = await contentContext();
  return NextResponse.json({ preview: access.preview, r2: access.r2, owner: access.owner,
    epoch: access.epoch, paused: access.paused, live: access.state.phase === 'active' }, { headers });
}
