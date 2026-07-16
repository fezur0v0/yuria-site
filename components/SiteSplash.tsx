'use client'
import { useEffect, useState } from 'react'
import HandwritingIcon from './HandwritingIcon'

export default function SiteSplash() {
  const [visible, setVisible] = useState(true)
  const [fading, setFading] = useState(false)

  useEffect(() => {
    function handleReady() {
      // 留一点点余量，避免刚好在动画很突兀的瞬间消失
      setTimeout(() => {
        setFading(true)
        setTimeout(() => setVisible(false), 500) // 等淡出动画播完再彻底移除
      }, 300)
    }

    if (document.readyState === 'complete') {
      handleReady()
    } else {
      window.addEventListener('load', handleReady)
      return () => window.removeEventListener('load', handleReady)
    }
  }, [])

  if (!visible) return null

  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#fafaf8',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 9999,
      opacity: fading ? 0 : 1,
      transition: 'opacity 0.5s ease',
      pointerEvents: fading ? 'none' : 'auto',
    }}>
      <HandwritingIcon size={110} />
    </div>
  )
}
