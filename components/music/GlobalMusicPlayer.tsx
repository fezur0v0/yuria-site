'use client'

import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { FiList, FiMusic, FiPause, FiPlay, FiRepeat, FiSkipBack, FiSkipForward, FiX } from 'react-icons/fi'
import { useMusic } from './MusicProvider'
import './music-player.css'

type Position = { right: number; bottom: number }
type Drag = Position & { x: number; y: number; pointerId: number; moved: boolean }
const MARGIN = 12

export default function GlobalMusicPlayer() {
  const { tracks, current, currentIndex, playing, error, loopOne, toggleLoop, toggle, next, previous, select } = useMusic()
  const [expanded, setExpanded] = useState(false)
  const [playlist, setPlaylist] = useState(false)
  const [position, setPosition] = useState<Position | null>(null)
  const [dragging, setDragging] = useState(false)
  const [listLayout, setListLayout] = useState({ below: false, height: 300 })
  const rootRef = useRef<HTMLElement>(null)
  const discRef = useRef<HTMLButtonElement>(null)
  const dragRef = useRef<Drag | null>(null)
  const suppressClick = useRef(false)
  const hasCurrent = current !== null

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const fit = () => {
      const rect = root.getBoundingClientRect()
      const right = Math.max(MARGIN, Math.min(window.innerWidth - rect.right, window.innerWidth - rect.width - MARGIN))
      const bottom = Math.max(MARGIN, Math.min(window.innerHeight - rect.bottom, window.innerHeight - rect.height - MARGIN))
      if (Math.abs(right - (window.innerWidth - rect.right)) > 1 || Math.abs(bottom - (window.innerHeight - rect.bottom)) > 1) {
        setPosition({ right, bottom })
      }
      const top = window.innerHeight - bottom - rect.height
      const above = Math.max(0, top - MARGIN - 10)
      const below = Math.max(0, bottom - MARGIN - 10)
      setListLayout({ below: below > above, height: Math.min(320, Math.max(above, below)) })
    }
    const observer = new ResizeObserver(fit)
    observer.observe(root)
    window.addEventListener('resize', fit)
    fit()
    return () => { observer.disconnect(); window.removeEventListener('resize', fit) }
  }, [hasCurrent])

  useEffect(() => {
    if (!expanded) return
    const outside = (event: globalThis.PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) { setExpanded(false); setPlaylist(false) }
    }
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      if (playlist) setPlaylist(false)
      else { setExpanded(false); discRef.current?.focus() }
    }
    document.addEventListener('pointerdown', outside)
    document.addEventListener('keydown', escape)
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape) }
  }, [expanded, playlist])

  function move(right: number, bottom: number) {
    const root = rootRef.current
    if (!root) return
    const next = {
      right: Math.max(MARGIN, Math.min(right, window.innerWidth - root.offsetWidth - MARGIN)),
      bottom: Math.max(MARGIN, Math.min(bottom, window.innerHeight - root.offsetHeight - MARGIN)),
    }
    setPosition(next)
    const above = Math.max(0, window.innerHeight - next.bottom - root.offsetHeight - MARGIN - 10)
    const below = Math.max(0, next.bottom - MARGIN - 10)
    setListLayout({ below: below > above, height: Math.min(320, Math.max(above, below)) })
  }

  function startDrag(event: PointerEvent<HTMLButtonElement>) {
    if (event.button !== 0 || !event.isPrimary) return
    const rect = rootRef.current!.getBoundingClientRect()
    suppressClick.current = false
    dragRef.current = { x: event.clientX, y: event.clientY, right: window.innerWidth - rect.right,
      bottom: window.innerHeight - rect.bottom, pointerId: event.pointerId, moved: false }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function onDrag(event: PointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    const dx = event.clientX - drag.x
    const dy = event.clientY - drag.y
    if (!drag.moved && Math.hypot(dx, dy) < 6) return
    drag.moved = true
    suppressClick.current = true
    setDragging(true)
    move(drag.right - dx, drag.bottom - dy)
  }

  function endDrag(event: PointerEvent<HTMLButtonElement>) {
    if (dragRef.current?.pointerId !== event.pointerId) return
    dragRef.current = null
    setDragging(false)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
  }

  if (!current) return null

  return <aside ref={rootRef} className={`music-float${expanded ? ' music-float--open' : ''}${dragging ? ' music-float--dragging' : ''}`}
    style={position ? { right: position.right, bottom: position.bottom } : undefined} aria-label="音乐播放器">
    <span id="music-drag-help" className="music-float__sr">拖动唱片可移动播放器，也可用方向键移动。点击展开或收起。</span>
    {expanded && <div className="music-float__panel" id="music-controls">
      <div className="music-float__info"><span>正在播放</span><strong title={current.title}>{current.title}</strong><small>{current.artist || 'Yuria Music'}</small></div>
      <button className="music-float__close" type="button" aria-label="收起播放器" onClick={() => { setExpanded(false); setPlaylist(false); discRef.current?.focus() }}><FiX size={15} /></button>
      <div className="music-float__controls">
        <button type="button" className={loopOne ? 'is-active' : ''} aria-label={loopOne ? '切换为列表循环' : '切换为单曲循环'} aria-pressed={loopOne} onClick={toggleLoop}><FiRepeat size={17} />{loopOne && <sup>1</sup>}</button>
        <button type="button" aria-label="上一首" onClick={previous}><FiSkipBack size={20} /></button>
        <button type="button" className="music-float__play" aria-label={playing ? '暂停' : '播放'} onClick={toggle}>{playing ? <FiPause size={22} /> : <FiPlay size={22} />}</button>
        <button type="button" aria-label="下一首" onClick={next}><FiSkipForward size={20} /></button>
        <button type="button" className={playlist ? 'is-active' : ''} aria-label={playlist ? '收起播放列表' : '展开播放列表'} aria-expanded={playlist} aria-controls={playlist ? 'music-playlist' : undefined} onClick={() => setPlaylist(value => !value)}><FiList size={20} /></button>
      </div>
    </div>}
    <button ref={discRef} type="button" className={`music-float__disc${playing ? ' is-playing' : ''}`} aria-label={expanded ? '收起音乐播放器' : `展开音乐播放器：${current.title}`}
      aria-expanded={expanded} aria-controls={expanded ? 'music-controls' : undefined} aria-describedby="music-drag-help"
      onPointerDown={startDrag} onPointerMove={onDrag} onPointerUp={endDrag} onPointerCancel={endDrag}
      onLostPointerCapture={() => { dragRef.current = null; setDragging(false) }}
      onKeyDown={event => {
        const delta = { ArrowLeft: [20, 0], ArrowRight: [-20, 0], ArrowUp: [0, 20], ArrowDown: [0, -20] }[event.key]
        if (!delta) return
        event.preventDefault()
        const rect = rootRef.current!.getBoundingClientRect()
        move(window.innerWidth - rect.right + delta[0], window.innerHeight - rect.bottom + delta[1])
      }}
      onClick={event => {
        if (suppressClick.current && event.detail !== 0) { suppressClick.current = false; return }
        setExpanded(value => !value); setPlaylist(false)
      }}>
      <span className="music-float__vinyl">{current.cover_url ? <img src={current.cover_url} alt="" draggable={false} /> : <FiMusic size={28} aria-hidden="true" />}<span className="music-float__spindle" /></span>
      <span className="music-float__badge" aria-hidden="true">{playing ? <span className="music-float__equalizer"><i /><i /><i /></span> : <FiMusic size={12} />}</span>
    </button>
    {expanded && playlist && <div className={`music-float__list${listLayout.below ? ' music-float__list--below' : ''}`} id="music-playlist" style={{ maxHeight: listLayout.height }}>
      <div className="music-float__list-heading"><span>待播清单</span><small>{tracks.length} 首歌曲</small></div>
      {tracks.map((track, index) => <button type="button" key={track.id} onClick={() => select(index)} aria-current={index === currentIndex ? 'true' : undefined}
        className={`music-float__track${index === currentIndex ? ' is-current' : ''}`}>
        <span className="music-float__thumbnail">{track.cover_url ? <img src={track.cover_url} alt="" loading="lazy" /> : <FiMusic size={16} />}</span>
        <span className="music-float__track-name"><strong>{track.title}</strong><small>{track.artist}</small></span>
        {index === currentIndex && <FiMusic size={15} aria-hidden="true" />}
      </button>)}
    </div>}
    {error && <p className="music-float__error" role="status">{error}</p>}
  </aside>
}
