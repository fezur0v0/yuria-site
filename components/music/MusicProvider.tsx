'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/utils/content/client'

export type MusicTrack = {
  id: number
  title: string
  artist: string | null
  src: string
  cover_url: string | null
}

type MusicContextValue = {
  tracks: MusicTrack[]
  current: MusicTrack | null
  currentIndex: number
  playing: boolean
  error: string
  elapsed: number
  duration: number
  seek: (seconds: number) => void
  loopOne: boolean
  toggleLoop: () => void
  toggle: () => void
  next: () => void
  previous: () => void
  select: (index: number) => void
}

const MusicContext = createContext<MusicContextValue | null>(null)

export function useMusic() {
  const value = useContext(MusicContext)
  if (!value) throw new Error('useMusic must be used within MusicProvider')
  return value
}

export default function MusicProvider({ children }: { children: React.ReactNode }) {
  const [tracks, setTracks] = useState<MusicTrack[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [error, setError] = useState('')
  const [elapsed, setElapsed] = useState(0)
  const [duration, setDuration] = useState(0)
  const [loopOne, setLoopOne] = useState(false)
  const toggleLoop = useCallback(() => setLoopOne(value => !value), [])
  const audioRef = useRef<HTMLAudioElement>(null)
  const startAfterChange = useRef(false)
  const current = tracks[currentIndex] ?? null
  const currentSrc = current?.src

  useEffect(() => {
    let active = true
    void createClient().from('music_tracks')
      .select('id, title, artist, src, cover_url')
      .order('sort_order')
      .then(({ data, error: queryError }) => {
        if (!active) return
        if (queryError) { setError('暂时无法载入音乐'); return }
        setTracks((data ?? []).filter(track => typeof track.src === 'string' && track.src.length > 0))
      })
    return () => { active = false }
  }, [])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !currentSrc) return
    audio.load()
    if (startAfterChange.current) {
      startAfterChange.current = false
      void audio.play().catch(() => { setPlaying(false); setError('点击播放后重试') })
    }
  }, [currentSrc])

  const select = useCallback((index: number) => {
    if (!tracks[index]) return
    setError('')
    if (index === currentIndex) {
      void audioRef.current?.play().catch(() => setError('点击播放后重试'))
      return
    }
    startAfterChange.current = true
    setCurrentIndex(index)
  }, [tracks, currentIndex])

  const next = useCallback(() => {
    if (tracks.length) select((currentIndex + 1) % tracks.length)
  }, [currentIndex, select, tracks.length])

  const previous = useCallback(() => {
    if (tracks.length) select((currentIndex - 1 + tracks.length) % tracks.length)
  }, [currentIndex, select, tracks.length])

  const toggle = useCallback(() => {
    const audio = audioRef.current
    if (!audio || !current) return
    setError('')
    if (audio.paused) void audio.play().catch(() => setError('暂时无法播放这首歌'))
    else audio.pause()
  }, [current])

  const seek = useCallback((seconds: number) => {
    const audio = audioRef.current
    if (!audio || !Number.isFinite(audio.duration) || !Number.isFinite(seconds)) return
    audio.currentTime = Math.max(0, Math.min(seconds, audio.duration))
    setElapsed(audio.currentTime)
  }, [])

  const value = useMemo(() => ({ tracks, current, currentIndex, playing, error, elapsed, duration, seek, loopOne, toggleLoop, toggle, next, previous, select }),
    [tracks, current, currentIndex, playing, error, elapsed, duration, seek, loopOne, toggleLoop, toggle, next, previous, select])

  return <MusicContext.Provider value={value}>
    {children}
    <audio ref={audioRef} src={currentSrc} preload="metadata" loop={loopOne}
      onPlay={() => { setPlaying(true); setError('') }}
      onPause={() => setPlaying(false)}
      onTimeUpdate={event => setElapsed(event.currentTarget.currentTime)}
      onLoadedMetadata={event => setDuration(Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : 0)}
      onDurationChange={event => setDuration(Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : 0)}
      onEmptied={() => { setElapsed(0); setDuration(0) }}
      onEnded={next}
      onError={() => { if (current) { setPlaying(false); setError('这首歌暂时无法播放') } }} />
  </MusicContext.Provider>
}
