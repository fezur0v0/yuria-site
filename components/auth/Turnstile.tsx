'use client'

import Script from 'next/script'
import { useCallback, useEffect, useRef } from 'react'

type TurnstileApi = {
  render: (element: HTMLElement, options: Record<string, unknown>) => string
  remove: (id: string) => void
}
declare global { interface Window { turnstile?: TurnstileApi } }

export default function Turnstile({ siteKey, onToken, onError }: {
  siteKey: string; onToken: (token: string) => void; onError: (message: string) => void
}) {
  const container = useRef<HTMLDivElement>(null)
  const widget = useRef<string | null>(null)
  const callbacks = useRef({ onToken, onError })
  useEffect(() => { callbacks.current = { onToken, onError } }, [onToken, onError])
  const render = useCallback(() => {
    if (!container.current || !window.turnstile || widget.current !== null) return
    widget.current = window.turnstile.render(container.current, {
      sitekey: siteKey, action: 'login', theme: 'light', size: 'flexible', language: 'en',
      callback: (token: string) => { callbacks.current.onError(''); callbacks.current.onToken(token) },
      'expired-callback': () => { callbacks.current.onToken(''); callbacks.current.onError('Verification expired. Please verify again.') },
      'error-callback': () => { callbacks.current.onToken(''); callbacks.current.onError('Verification is unavailable. Check your connection or reload.') },
      'timeout-callback': () => { callbacks.current.onToken(''); callbacks.current.onError('Verification timed out. Please try again.') },
    })
  }, [siteKey])
  useEffect(() => {
    render()
    return () => {
      if (widget.current !== null) window.turnstile?.remove(widget.current)
      widget.current = null
    }
  }, [render])
  return <>
    <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" onReady={render}
      onError={() => { onToken(''); onError('Verification could not load. Check your connection or reload.') }} />
    <div ref={container} className="w-full min-h-[65px]" aria-label="Human verification" />
  </>
}
