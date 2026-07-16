'use client'
import { useEffect, useState } from 'react'
import HandwritingIcon from './HandwritingIcon'

const MIN_DISPLAY_MS = 2200 // 至少展示这么久，保证动画能完整播放一轮

export default function SiteSplash() {
  const [visible, setVisible] = useState(true)
  const [fading, setFading] = useState(false)

  useEffect(() => {
    const startTime = Date.now()
    let pageLoaded = false

    function tryFinish() {
      if (!pageLoaded) return
      const elapsed = Date.now() - startTime
      const remaining = Math.max(0, MIN_DISPLAY_MS - elapsed)
      setTimeout(() => {
        setFading(true)
        setTimeout(() => setVisible(false), 500)
      }, remaining)
    }

    function handleLoad() {
      pageLoaded = true
      tryFinish()
    }

    if (document.readyState === 'complete') {
      handleLoad()
    } else {
      window.addEventListener('load', handleLoad)
    }
    return () => window.removeEventListener('load', handleLoad)
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
