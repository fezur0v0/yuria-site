'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { FiBookOpen, FiGrid, FiHome, FiImage } from 'react-icons/fi'
import AccountEntry from '@/components/account/AccountEntry'
import './mobile-dock.css'

const destinations = [
  { href: '/', label: '主页', icon: FiHome },
  { href: '/portfolio', label: '作品集', icon: FiGrid },
  { href: '/gallery', label: '图集', icon: FiImage },
  { href: '/notes', label: '小剧场', icon: FiBookOpen },
] as const

export default function MobileDock() {
  const pathname = usePathname()
  const current = pathname === '/' ? '/' : pathname === '/portfolio' || pathname.startsWith('/portfolio/')
    ? '/portfolio' : pathname === '/gallery' ? '/gallery' : pathname === '/links' ? '/links' : null

  // The gallery viewer and the Notes entrance have their own full-screen controls.
  if (!current) return null

  return <nav className="mobile-dock" aria-label="网站快捷导航">
    <div className="mobile-dock__links">
      {destinations.filter(item => item.href !== current).map(({ href, label, icon: Icon }) => (
        <Link key={href} href={href} className="mobile-dock__link" aria-label={label} title={label}>
          <Icon size={22} strokeWidth={1.9} aria-hidden="true" />
        </Link>
      ))}
    </div>
    <AccountEntry placement="dock" />
  </nav>
}
