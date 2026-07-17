'use client'
import { createBrowserClient } from '@supabase/ssr'

export default function LoginPage() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    })
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <button onClick={handleLogin}
        className="px-6 py-3 bg-black text-white rounded-lg">
        使用 GitHub 登录
      </button>
    </div>
  )
}
