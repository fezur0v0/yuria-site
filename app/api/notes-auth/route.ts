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

    // 动态引入 bcryptjs
    const match = await bcrypt.compare(answer.trim(), data.value)

    return NextResponse.json({ success: match })
  } catch {
    return NextResponse.json({ success: false })
  }
}
