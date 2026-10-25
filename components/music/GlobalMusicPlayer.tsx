'use client'

import { useState } from 'react'
import { FiChevronDown, FiChevronUp, FiMusic, FiPause, FiPlay, FiSkipBack, FiSkipForward } from 'react-icons/fi'
import { useMusic } from './MusicProvider'
import './music-player.css'

export default function GlobalMusicPlayer() {
  const { tracks, current, currentIndex, playing, error, toggle, next, previous, select } = useMusic()
  const [expanded, setExpanded] = useState(false)

  if (!current) return null

  return <aside className="music-player" aria-label="音乐播放器">
    {expanded && <div className="music-player__list" id="music-playlist">
      <div className="music-player__list-heading"><span>PLAYLIST</span><span>{String(tracks.length).padStart(2, '0')} TRACKS</span></div>
      {tracks.map((track, index) => <button type="button" key={track.id} onClick={() => select(index)}
        className={`music-player__track ${index === currentIndex ? 'music-player__track--current' : ''}`}>
        <span className="music-player__track-number">{String(index + 1).padStart(2, '0')}</span>
        <span className="music-player__track-name">{track.title}<small>{track.artist}</small></span>
        {index === currentIndex && <FiMusic size={14} aria-hidden="true" />}
      </button>)}
    </div>}
    <div className="music-player__main">
      <div className="music-player__cover">
        {current.cover_url ? <img src={current.cover_url} alt="" /> : <FiMusic size={21} aria-hidden="true" />}
      </div>
      <div className="music-player__info"><span className="music-player__eyebrow">NOW PLAYING</span><strong>{current.title}</strong><small>{current.artist}</small></div>
      <div className="music-player__controls">
        <button type="button" aria-label="上一首" onClick={previous}><FiSkipBack size={15} /></button>
        <button type="button" className="music-player__toggle" aria-label={playing ? '暂停' : '播放'} onClick={toggle}>
          {playing ? <FiPause size={17} /> : <FiPlay size={17} />}
        </button>
        <button type="button" aria-label="下一首" onClick={next}><FiSkipForward size={15} /></button>
        <button type="button" aria-label={expanded ? '收起播放列表' : '展开播放列表'} aria-expanded={expanded}
          aria-controls={expanded ? 'music-playlist' : undefined} onClick={() => setExpanded(value => !value)}>
          {expanded ? <FiChevronDown size={16} /> : <FiChevronUp size={16} />}
        </button>
      </div>
    </div>
    {error && <p className="music-player__error" role="status">{error}</p>}
  </aside>
}
