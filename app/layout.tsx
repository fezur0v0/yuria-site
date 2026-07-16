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

    function tryFinish() import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import SiteSplash from "@/components/SiteSplash";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});
export const metadata: Metadata = {
  title: "Yuria",
  description: "那一天你走进了我的生命 谢谢你成为了我的几分之几",
};
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <SiteSplash />
        {children}
      </body>
    </html>
  );
}
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
