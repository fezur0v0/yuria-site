import { NextResponse } from 'next/server';
import { contentContext } from '@/utils/content/request';
import { readContent } from '@/utils/content/store';
import { isSameOriginRequest } from '@/utils/security/origin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'private, no-store', Vary: 'Cookie' };
export async function GET() {
  const access = await contentContext();
  return NextResponse.json({ preview: access.preview, r2: access.r2, owner: access.owner }, { headers });
}
export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ error: '请求来源无效' }, { status: 403, headers });
  const access = await contentContext();
  if (!access.owner) return NextResponse.json({ error: '仅站长可访问' }, { status: 403, headers });
  const body = await request.json().catch(() => null);
  if (!['enable', 'disable'].includes(body?.action)) return NextResponse.json({ error: '操作无效' }, { status: 400, headers });
  if (body.action === 'enable') {
    try { await readContent(true); }
    catch { return NextResponse.json({ error: 'R2 内容不可读取，未进入预览' }, { status: 503, headers }); }
  }
  const response = NextResponse.json({ preview: body.action === 'enable' }, { headers });
  response.cookies.set('yuria-r2-preview', body.action === 'enable' ? '1' : '', {
    httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/',
    maxAge: body.action === 'enable' ? 3600 : 0,
  });
  return response;
}
