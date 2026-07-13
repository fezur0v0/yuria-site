import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import bcrypt from 'bcryptjs'

export async function POST(request: Request) {
  try {
    const { answer } = await request.json()
    if (!answer) return NextResponse.json({ success: false })
    const supabase = await createClient()
    const { data } = await supabase
      .from('access_config')
      .select('value')
      .eq('key', 'password_hash')
      .single()
    if (!data) return NextResponse.json({ success: false })
    const match = await bcrypt.compare(answer.trim(), data.value)

    const response = NextResponse.json({ success: match })
    if (match) {
      response.cookies.set('notes_auth', 'true', {
        httpOnly: true,   // 关键：JS 读不到也改不了
        secure: true,
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7, // 7天有效期
      })
    }
    return response
  } catch {
    return NextResponse.json({ success: false })
  }
}
