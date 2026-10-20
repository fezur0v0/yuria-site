import NotesIntro from '@/components/notes/NotesIntro'
import { createClient } from '@/utils/supabase/server'

export const dynamic = 'force-dynamic'

export default async function NotesPage() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('intro_lines')
    .select('text')
    .order('sort_order')

  if (error) console.error('Unable to load notes entrance copy:', error.code)
  const lines = (data ?? [])
    .map((row: { text: string | null }) => row.text?.trim() ?? '')
    .filter(Boolean)

  return <NotesIntro lines={lines} />
}
