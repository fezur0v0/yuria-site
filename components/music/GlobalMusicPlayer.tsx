'use client'

import { useEffect, useRef, useState, type PointerEvent, type CSSProperties } from 'react'
import { FiHeadphones, FiMusic, FiRepeat, FiShuffle } from 'react-icons/fi'
import { IoPlayBackSharp, IoPlayForwardSharp, IoPauseSharp, IoPlaySharp } from 'react-icons/io5'
import { useMusic } from './MusicProvider'
import MusicQueue from './MusicQueue'
import './music-player.css'

type Position = { side: 'left' | 'right'; offset: number; bottom: number }
type Drag = { left: number; bottom: number; x: number; y: number; pointerId: number; moved: boolean }
const MARGIN = 12
function formatTime(seconds: number) {
  const total = Math.max(0, Math.floor(seconds))
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}

export default function GlobalMusicPlayer() {
  const { current, playing, error, elapsed, duration, seek, mode, cycleMode, toggle, next, previous } = useMusic()
  const [expanded, setExpanded] = useState(false)
  const [playlist, setPlaylist] = useState(false)
  const [position, setPosition] = useState<Position | null>(null)
  const [dragging, setDragging] = useState(false)
  const [listLayout, setListLayout] = useState({ below: false, height: 300 })
  const rootRef = useRef<HTMLElement>(null)
  const discRef = useRef<HTMLButtonElement>(null)
  const listButtonRef = useRef<HTMLButtonElement>(null)
  const dragRef = useRef<Drag | null>(null)
  const suppressClick = useRef(false)
  const sorting = useRef(false)
  const hasCurrent = current !== null

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const fit = () => {
      const rect = root.getBoundingClientRect()
      const side = position?.side ?? 'left'
      const rawOffset = side === 'left' ? rect.left : document.documentElement.clientWidth - rect.right
      const offset = Math.max(MARGIN, Math.min(rawOffset, document.documentElement.clientWidth - rect.width - MARGIN))
      const bottom = Math.max(MARGIN, Math.min(window.innerHeight - rect.bottom, window.innerHeight - rect.height - MARGIN))
      if (Math.abs(offset - rawOffset) > 1 || Math.abs(bottom - (window.innerHeight - rect.bottom)) > 1) {
        setPosition({ side, offset, bottom })
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
  }, [hasCurrent, position?.side])

  useEffect(() => {
    if (!expanded) return
    const outside = (event: globalThis.PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) { setExpanded(false); setPlaylist(false) }
    }
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      if (sorting.current) return
      if (playlist) { setPlaylist(false); listButtonRef.current?.focus() }
      else { setExpanded(false); discRef.current?.focus() }
    }
    document.addEventListener('pointerdown', outside)
    document.addEventListener('keydown', escape)
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape) }
  }, [expanded, playlist])

  function move(left: number, bottom: number) {
    const root = rootRef.current
    if (!root) return
    const fittedLeft = Math.max(MARGIN, Math.min(left, document.documentElement.clientWidth - root.offsetWidth - MARGIN))
    const side = fittedLeft + root.offsetWidth / 2 > document.documentElement.clientWidth / 2 ? 'right' : 'left'
    const next: Position = {
      side, offset: side === 'left' ? fittedLeft : document.documentElement.clientWidth - root.offsetWidth - fittedLeft,
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
    dragRef.current = { x: event.clientX, y: event.clientY, left: rect.left,
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
    move(drag.left + dx, drag.bottom - dy)
  }

  function endDrag(event: PointerEvent<HTMLButtonElement>) {
    if (dragRef.current?.pointerId !== event.pointerId) return
    if (dragRef.current.moved) {
      const rect = rootRef.current!.getBoundingClientRect()
      const side = rect.left + rect.width / 2 > document.documentElement.clientWidth / 2 ? 'right' : 'left'
      setPosition({ side, offset: side === 'left' ? rect.left : document.documentElement.clientWidth - rect.right,
        bottom: window.innerHeight - rect.bottom })
    }
    dragRef.current = null
    setDragging(false)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
  }

  if (!current) return null

  const modeLabel = mode === 'list' ? '列表循环；切换为单曲循环' : mode === 'single' ? '单曲循环；切换为随机播放' : '随机播放；切换为列表循环'
  return <aside ref={rootRef} className={`music-float${position?.side === 'right' ? ' music-float--right' : ''}${expanded ? ' music-float--open' : ''}${dragging ? ' music-float--dragging' : ''}${playing ? ' music-float--playing' : ''}`}
    style={position ? { left: position.side === 'left' ? position.offset : 'auto', right: position.side === 'right' ? position.offset : 'auto', bottom: position.bottom } : undefined} aria-label="音乐播放器">
    <span id="music-drag-help" className="music-float__sr">拖动封面可移动播放器，也可用方向键移动。点击展开或收起。</span>
    <div className="music-float__panel" aria-hidden={!expanded} inert={!expanded}>
      <div className="music-float__body" id="music-controls">
        <div className="music-float__header">
          <span aria-hidden="true" />
          <div className="music-float__info"><strong title={current.title}>{current.title}</strong><small>{current.artist || 'Yuria Music'}</small></div>
          <span className="music-float__wave" aria-hidden="true"><i /><i /><i /><i /><i /></span>
        </div>
        <div className="music-float__timeline">
          <span>{formatTime(elapsed)}</span>
          <input type="range" min={0} max={duration || 0} step={0.1} value={Math.min(elapsed, duration || 0)} disabled={!duration}
            aria-label="播放进度" aria-valuetext={`${formatTime(elapsed)}，总时长 ${formatTime(duration)}`}
            style={{ '--progress': `${duration ? Math.min(100, elapsed / duration * 100) : 0}%` } as CSSProperties}
            onChange={event => seek(Number(event.target.value))} />
          <span>{duration ? `−${formatTime(duration - elapsed)}` : '--:--'}</span>
        </div>
        <div className="music-float__controls">
          <button type="button" className={mode !== 'list' ? 'is-active' : ''} aria-label={`播放模式：${modeLabel}`} title={modeLabel} onClick={cycleMode}>
            {mode === 'shuffle' ? <FiShuffle size={20} /> : <span className="music-float__repeat"><FiRepeat size={22} />{mode === 'single' && <span>1</span>}</span>}
          </button>
          <button type="button" aria-label="上一首" onClick={previous}><IoPlayBackSharp size={29} /></button>
          <button type="button" className="music-float__play" aria-label={playing ? '暂停' : '播放'} onClick={toggle}>{playing ? <IoPauseSharp size={35} /> : <IoPlaySharp size={35} />}</button>
          <button type="button" aria-label="下一首" onClick={next}><IoPlayForwardSharp size={29} /></button>
          <button ref={listButtonRef} type="button" className={playlist ? 'is-active' : ''} aria-label={playlist ? '收起播放列表' : '展开播放列表'} aria-expanded={playlist} aria-controls="music-playlist" onClick={() => setPlaylist(value => !value)}><FiHeadphones size={22} /></button>
        </div>
      </div>
    </div>
    <button ref={discRef} type="button" className="music-float__disc" aria-label={expanded ? '收起音乐播放器' : `展开音乐播放器：${current.title}`}
      aria-expanded={expanded} aria-controls={expanded ? 'music-controls' : undefined} aria-describedby="music-drag-help"
      onPointerDown={startDrag} onPointerMove={onDrag} onPointerUp={endDrag} onPointerCancel={endDrag}
      onLostPointerCapture={() => { dragRef.current = null; setDragging(false) }}
      onKeyDown={event => {
        const delta = { ArrowLeft: [20, 0], ArrowRight: [-20, 0], ArrowUp: [0, 20], ArrowDown: [0, -20] }[event.key]
        if (!delta) return
        event.preventDefault()
        const rect = rootRef.current!.getBoundingClientRect()
        move(rect.left - delta[0], window.innerHeight - rect.bottom + delta[1])
      }}
      onClick={event => {
        if (suppressClick.current && event.detail !== 0) { suppressClick.current = false; return }
        setExpanded(value => !value); setPlaylist(false)
      }}>
      {current.cover_url ? <img src={current.cover_url} alt="" draggable={false} /> : <FiMusic size={26} aria-hidden="true" />}
    </button>
    <div className={`music-float__list${listLayout.below ? ' music-float__list--below' : ''}${expanded && playlist ? ' is-visible' : ''}`} id="music-playlist" style={{ maxHeight: listLayout.height }} aria-hidden={!expanded || !playlist} inert={!expanded || !playlist}>
      <MusicQueue onSortingChange={value => { sorting.current = value }} />
    </div>
    {error && <p className="music-float__error" role="status">{error}</p>}
  </aside>
}
