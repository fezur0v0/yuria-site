'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/utils/content/client'
import { moveQueueTrack, shuffledNext } from '@/utils/music/queue'

export type PlaybackMode = 'list' | 'single' | 'shuffle'

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
  mode: PlaybackMode
  cycleMode: () => void
  reorder: (activeId: number, overId: number) => void
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
  const [currentId, setCurrentId] = useState<number | null>(null)
  const [playing, setPlaying] = useState(false)
  const [error, setError] = useState('')
  const [elapsed, setElapsed] = useState(0)
  const [duration, setDuration] = useState(0)
  const [mode, setMode] = useState<PlaybackMode>('list')
  const shuffled = useRef<number[]>([])
  const history = useRef<number[]>([])
  const cycleMode = useCallback(() => {
    shuffled.current = []
    history.current = []
    setMode(value => value === 'list' ? 'single' : value === 'single' ? 'shuffle' : 'list')
  }, [])
  const audioRef = useRef<HTMLAudioElement>(null)
  const startAfterChange = useRef(false)
  const currentIndex = Math.max(0, tracks.findIndex(track => track.id === currentId))
  const current = tracks[currentIndex] ?? null
  const trackId = current?.id
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
  }, [currentSrc, trackId])

  const choose = useCallback((index: number, remember = true) => {
    if (!tracks[index]) return
    setError('')
    if (index === currentIndex) {
      void audioRef.current?.play().catch(() => setError('点击播放后重试'))
      return
    }
    startAfterChange.current = true
    if (remember && current) history.current.push(current.id)
    if (history.current.length > 100) history.current.shift()
    setCurrentId(tracks[index].id)
  }, [tracks, currentIndex, current])
  const select = useCallback((index: number) => choose(index), [choose])
  const reorder = useCallback((activeId: number, overId: number) => {
    // Keep the playing track by ID, including before the first explicit selection.
    if (current) setCurrentId(current.id)
    setTracks(value => moveQueueTrack(value, activeId, overId))
  }, [current])

  const next = useCallback(() => {
    if (!current) return
    if (mode === 'shuffle') {
      const draw = shuffledNext(tracks.map(track => track.id), current.id, shuffled.current)
      shuffled.current = draw.remaining
      choose(tracks.findIndex(track => track.id === draw.id))
    } else choose((currentIndex + 1) % tracks.length)
  }, [currentIndex, choose, tracks, current, mode])

  const previous = useCallback(() => {
    if (!tracks.length) return
    if (mode === 'shuffle') {
      const previousId = history.current.pop()
      if (previousId !== undefined) {
        if (current) shuffled.current = [current.id, ...shuffled.current.filter(id => id !== current.id)]
        choose(tracks.findIndex(track => track.id === previousId), false)
      } else { const audio = audioRef.current; if (audio) audio.currentTime = 0 }
    } else choose((currentIndex - 1 + tracks.length) % tracks.length)
  }, [currentIndex, choose, tracks, mode, current])

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

  const value = useMemo(() => ({ tracks, current, currentIndex, playing, error, elapsed, duration, seek, mode, cycleMode, reorder, toggle, next, previous, select }),
    [tracks, current, currentIndex, playing, error, elapsed, duration, seek, mode, cycleMode, reorder, toggle, next, previous, select])

  return <MusicContext.Provider value={value}>
    {children}
    <audio ref={audioRef} src={currentSrc} preload="metadata" loop={mode === 'single'}
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
