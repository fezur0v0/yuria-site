import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function POST(req: NextRequest) {
  const { password } = await req.json()
  if (!password) return NextResponse.json({ ok: false })

  const supabase = await createClient()
  const { data } = await supabase
    .from('site_config')
    .select('value')
    .eq('key', 'theater_password')
    .single()

  return NextResponse.json({ ok: data?.value === password })
}
