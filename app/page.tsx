'use client'

import { useEffect, useRef, useState } from 'react'

export default function HomePage() {
  const tracks = [
    { title: '晨雾即兴曲', artist: 'Yuria · 钢琴' },
    { title: '雨中漫步', artist: 'Yuria · 吉他' },
    { title: '夜晚的城市', artist: 'Yuria · 电子' },
  ]

  const galleryItems = [
    { name: '黄昏之光', bg1: '#aab0ba', bg2: '#7a8090' },
    { name: '森林系列', bg1: '#bcb8c8', bg2: '#8a8898' },
    { name: '城市迷雾', bg1: '#b4bcb8', bg2: '#848c88' },
    { name: '黑白系列', bg1: '#4a4a4a', bg2: '#1a1a1a' },
    { name: '春日记录', bg1: '#c8d0b8', bg2: '#909878' },
    { name: '蓝调时刻', bg1: '#a8b8d0', bg2: '#6878a0' },
  ]

  const [cur, setCur] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [listOpen, setListOpen] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const srRefs = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('on')
          }
        })
      },
      { threshold: 0.08 }
    )

    srRefs.current.forEach((el) => {
      if (el) observer.observe(el)
    })

    return () => observer.disconnect()
  }, [])

  const togglePlay = () => {
    setPlaying(!playing)
  }

  const prevTrack = () => {
    setCur((prev) => (prev - 1 + tracks.length) % tracks.length)
    setPlaying(true)
  }

  const nextTrack = () => {
    setCur((prev) => (prev + 1) % tracks.length)
    setPlaying(true)
  }

  const verifyPassword = () => {
    if (password === '1212') {
      alert('小剧场即将开放（演示模式）')
      setShowModal(false)
      setPassword('')
      setError('')
    } else {
      setError('密码错误，请重试')
      setPassword('')
    }
  }

  return (
    <>
      <style jsx global>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        html {
          scroll-behavior: smooth;
        }

        body {
          background: #f2f2ef;
          font-family: Inter, sans-serif;
          color: #1a1a1a;
        }

        .sr {
          opacity: 0;
          transform: translateY(26px);
          filter: blur(3px);
          transition:
            opacity 0.9s cubic-bezier(0.22, 1, 0.36, 1),
            transform 0.9s cubic-bezier(0.22, 1, 0.36, 1),
            filter 0.9s cubic-bezier(0.22, 1, 0.36, 1);
        }

        .sr.on {
          opacity: 1;
          transform: none;
          filter: none;
        }

        @keyframes br {
          0%,
          100% {
            opacity: 0.2;
            transform: scale(0.6);
          }
          50% {
            opacity: 0.65;
            transform: scale(1.15);
          }
        }

        .bdot {
          display: inline-block;
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: #1a1a1a;
          margin: 0 7px;
          vertical-align: middle;
          animation: br 3s ease-in-out infinite;
        }

        .bdot2 {
          animation-delay: 1s;
        }

        @keyframes vspin {
          to {
            transform: rotate(360deg);
          }
        }

        .vinyl-spin {
          animation: vspin 3s linear infinite;
        }

        @keyframes wa {
          0%,
          100% {
            height: 3px;
          }
          50% {
            height: 15px;
          }
        }

        @keyframes wb {
          0%,
          100% {
            height: 8px;
          }
          50% {
            height: 12px;
          }
        }

        @keyframes wc {
          0%,
          100% {
            height: 12px;
          }
          50% {
            height: 4px;
          }
        }

        @keyframes wd {
          0%,
          100% {
            height: 5px;
          }
          50% {
            height: 17px;
          }
        }

        @keyframes we {
          0%,
          100% {
            height: 14px;
          }
          50% {
            height: 3px;
          }
        }

        .wv-on:nth-child(1) {
          animation: wa 0.7s ease-in-out infinite;
        }

        .wv-on:nth-child(2) {
          animation: wb 0.55s ease-in-out infinite 0.08s;
        }

        .wv-on:nth-child(3) {
          animation: wc 0.85s ease-in-out infinite 0.04s;
        }

        .wv-on:nth-child(4) {
          animation: wd 0.65s ease-in-out infinite 0.12s;
        }

        .wv-on:nth-child(5) {
          animation: we 0.75s ease-in-out infinite 0.06s;
        }

        .layout {
          display: flex;
          min-height: 100vh;
        }

        .sidebar {
          position: fixed;
          left: 0;
          top: 0;
          bottom: 0;
          width: 260px;
          background: rgba(20, 20, 20, 0.88);
          backdrop-filter: blur(24px);
          display: flex;
          flex-direction: column;
          padding: 48px 0 32px;
          z-index: 50;
          box-shadow: 4px 0 40px rgba(0, 0, 0, 0.12);
        }

        .logo {
          font-size: 24px;
          font-weight: 300;
          letter-spacing: 0.2em;
          color: #f0f0ee;
          padding: 0 32px;
          margin-bottom: 52px;
        }

        .nav-links {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 2px;
          padding: 0 20px;
        }

        .sb-link {
          position: relative;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 11px 16px;
          border-radius: 8px;
          cursor: pointer;
          color: #aaa;
          font-size: 13px;
          letter-spacing: 0.08em;
          transition: 0.2s;
          text-decoration: none;
          border: none;
          background: transparent;
        }

        .sb-link:hover {
          color: #e8e8e6;
          background: rgba(255, 255, 255, 0.07);
        }

        .main-area {
          margin-left: 260px;
          flex: 1;
          background: #fafaf8;
          min-height: 100vh;
          padding-bottom: 80px;
        }

        .hero-section {
          position: relative;
          height: 400px;
          overflow: hidden;
        }

        .hero-bg {
          position: absolute;
          inset: 0;
          background: linear-gradient(160deg, #b8c4d0, #90a0b0 45%, #687888);
        }

        .hero-gradient {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            to bottom,
            rgba(250, 250, 248, 0) 0%,
            rgba(250, 250, 248, 0) 15%,
            rgba(250, 250, 248, 0.08) 38%,
            rgba(250, 250, 248, 0.38) 60%,
            rgba(250, 250, 248, 0.82) 80%,
            #fafaf8 100%
          );
        }

        .hero-content {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          padding: 0 52px 28px;
          z-index: 2;
        }

        .hero-name {
          font-size: 58px;
          font-weight: 300;
          letter-spacing: 0.16em;
          line-height: 1;
        }

        .hero-sig {
          font-size: 11px;
          color: #999;
          letter-spacing: 0.3em;
          margin-top: 10px;
        }

        .player-wrap {
          padding: 0 52px;
          border-bottom: 0.5px solid #f0f0ee;
        }

        .player-bar {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 16px 0;
        }

        .vinyl-disc {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: radial-gradient(circle at 30% 30%, #1a1a1a, #3a3a3a);
          position: relative;
        }

        .vinyl-disc::after {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #fafaf8;
        }

        .track-info {
          flex: 1;
        }

        .track-title {
          font-size: 13px;
          font-weight: 500;
        }

        .track-artist {
          font-size: 11px;
          color: #999;
          margin-top: 2px;
        }

        .waveform {
          display: flex;
          align-items: flex-end;
          gap: 3px;
          height: 20px;
        }

        .wave-bar {
          width: 2.5px;
          border-radius: 2px;
          background: #d0d0d0;
        }

        .player-controls {
          display: flex;
          align-items: center;
          gap: 7px;
        }

        .ctrl-btn {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: 1px solid #d0d0ce;
          background: white;
          cursor: pointer;
        }

        .ctrl-btn.play {
          background: #1a1a1a;
          color: white;
        }

        .track-list {
          overflow: hidden;
          transition: 0.3s;
        }

        .track-item {
          padding: 10px 0;
          border-top: 0.5px solid #f0f0ee;
          cursor: pointer;
        }

        .section {
          padding: 48px 52px 0;
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 28px;
        }

        .section-label {
          font-size: 10px;
          letter-spacing: 0.3em;
          color: #aaa;
        }

        .portfolio-list {
          display: flex;
          flex-direction: column;
          gap: 48px;
        }

        .portfolio-item {
          display: flex;
          gap: 40px;
        }

        .portfolio-item.reverse {
          flex-direction: row-reverse;
        }

        .portfolio-img {
          flex: 1;
          aspect-ratio: 3 / 2;
          border-radius: 20px;
          overflow: hidden;
        }

        .img-fill {
          width: 100%;
          height: 100%;
        }

        .portfolio-text {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        .portfolio-title {
          font-size: 32px;
          margin: 14px 0;
        }

        .portfolio-excerpt {
          color: #666;
          line-height: 1.6;
        }

        .read-link {
          margin-top: 24px;
          color: #888;
          text-decoration: none;
        }

        .gallery-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
        }

        .gallery-card {
          text-decoration: none;
          color: inherit;
        }

        .stack-wrapper {
          position: relative;
          aspect-ratio: 3 / 2;
          margin-bottom: 16px;
        }

        .stack-layer {
          position: absolute;
          inset: 0;
          border-radius: 16px;
        }

        .layer-1 {
          transform: rotate(-3deg);
          opacity: 0.4;
        }

        .layer-2 {
          transform: rotate(2deg);
          opacity: 0.7;
        }

        .layer-3 {
          transform: rotate(0deg);
        }

        .stack-fill {
          width: 100%;
          height: 100%;
          border-radius: 16px;
        }

        .gallery-title {
          text-align: center;
        }

        .modal-overlay {
          position: fixed;
          inset: 0;
          z-index: 100;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0, 0, 0, 0.4);
          backdrop-filter: blur(10px);
        }

        .modal-card {
          width: 320px;
          background: white;
          border-radius: 22px;
          padding: 40px;
        }

        .modal-input {
          width: 100%;
          margin-top: 20px;
          padding: 12px;
          border-radius: 12px;
          border: 1px solid #ddd;
          outline: none;
        }

        .modal-btn {
          width: 100%;
          margin-top: 16px;
          padding: 12px;
          border-radius: 12px;
          border: none;
          background: #1a1a1a;
          color: white;
          cursor: pointer;
        }

        .modal-cancel {
          margin-top: 12px;
          width: 100%;
          background: none;
          border: none;
          color: #999;
          cursor: pointer;
        }

        .error-msg {
          color: #c0392b;
          font-size: 12px;
          margin-top: 10px;
        }

        @media (max-width: 768px) {
          .sidebar {
            display: none;
          }

          .main-area {
            margin-left: 0;
          }

          .hero-section {
            height: 280px;
          }

          .hero-name {
            font-size: 40px;
          }

          .hero-content,
          .player-wrap,
          .section {
            padding-left: 24px;
            padding-right: 24px;
          }

          .portfolio-item,
          .portfolio-item.reverse {
            flex-direction: column;
          }

          .gallery-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
      `}</style>

      <div className="layout">
        <aside className="sidebar">
          <div className="logo">Yuria</div>

          <nav className="nav-links">
            <a className="sb-link">首页</a>
            <a className="sb-link">作品集</a>
            <a className="sb-link">图集</a>

            <button
              className="sb-link"
              onClick={() => setShowModal(true)}
            >
              小剧场
            </button>
          </nav>
        </aside>

        <main className="main-area">
          <div className="hero-section">
            <div className="hero-bg" />
            <div className="hero-gradient" />

            <div className="hero-content">
              <div className="hero-name">Yuria</div>

              <div className="hero-sig">
                <span className="bdot" />
                我的小小世界
                <span className="bdot bdot2" />
              </div>
            </div>
          </div>

          <div
            className="player-wrap sr"
            ref={(el) => {
              srRefs.current[0] = el
            }}
          >
            <div className="player-bar">
              <div
                className={`vinyl-disc ${playing ? 'vinyl-spin' : ''}`}
              />

              <div className="track-info">
                <div className="track-title">
                  {tracks[cur].title}
                </div>

                <div className="track-artist">
                  {tracks[cur].artist}
                </div>
              </div>

              <div className="waveform">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className={`wave-bar ${playing ? 'wv-on' : ''}`}
                  />
                ))}
              </div>

              <div className="player-controls">
                <button
                  className="ctrl-btn"
                  onClick={prevTrack}
                >
                  ◀
                </button>

                <button
                  className="ctrl-btn play"
                  onClick={togglePlay}
                >
                  {playing ? '❚❚' : '▶'}
                </button>

                <button
                  className="ctrl-btn"
                  onClick={nextTrack}
                >
                  ▶
                </button>
              </div>

              <button
                className="ctrl-btn"
                onClick={() => setListOpen(!listOpen)}
              >
                ↓
              </button>
            </div>

            {listOpen && (
              <div className="track-list">
                {tracks.map((track, i) => (
                  <div
                    key={i}
                    className="track-item"
                    onClick={() => {
                      setCur(i)
                      setPlaying(true)
                    }}
                  >
                    {i + 1}. {track.title}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div
            className="section sr"
            ref={(el) => {
              srRefs.current[1] = el
            }}
          >
            <div className="section-header">
              <span className="section-label">PORTFOLIO</span>
            </div>

            <div className="portfolio-list">
              <div className="portfolio-item">
                <div className="portfolio-img">
                  <div
                    className="img-fill"
                    style={{
                      background:
                        'linear-gradient(160deg,#8a9aaa,#5a6a7a)',
                    }}
                  />
                </div>

                <div className="portfolio-text">
                  <div className="portfolio-tag">
                    PHOTOGRAPHY · 2025
                  </div>

                  <div className="portfolio-title">
                    秋日系列
                  </div>

                  <div className="portfolio-excerpt">
                    光影交错的午后，城市在镜头里变得温柔而遥远。
                  </div>

                  <a className="read-link">阅读更多 →</a>
                </div>
              </div>

              <div className="portfolio-item reverse">
                <div className="portfolio-img">
                  <div
                    className="img-fill"
                    style={{
                      background:
                        'linear-gradient(160deg,#9898aa,#686878)',
                    }}
                  />
                </div>

                <div className="portfolio-text">
                  <div className="portfolio-tag">
                    ILLUSTRATION · 2025
                  </div>

                  <div className="portfolio-title">
                    城市素描
                  </div>

                  <div className="portfolio-excerpt">
                    用线条描绘城市的轮廓，黑白线条的呼吸感。
                  </div>

                  <a className="read-link">阅读更多 →</a>
                </div>
              </div>
            </div>
          </div>

          <div
            className="section sr"
            ref={(el) => {
              srRefs.current[2] = el
            }}
          >
            <div className="section-header">
              <span className="section-label">GALLERY</span>
            </div>

            <div className="gallery-grid">
              {galleryItems.map((item, index) => (
                <a
                  href="#"
                  className="gallery-card"
                  key={index}
                >
                  <div className="stack-wrapper">
                    <div className="stack-layer layer-1">
                      <div
                        className="stack-fill"
                        style={{
                          background: `linear-gradient(150deg, ${item.bg1}, ${item.bg2})`,
                        }}
                      />
                    </div>

                    <div className="stack-layer layer-2">
                      <div
                        className="stack-fill"
                        style={{
                          background: `linear-gradient(150deg, ${item.bg1}, ${item.bg2})`,
                        }}
                      />
                    </div>

                    <div className="stack-layer layer-3">
                      <div
                        className="stack-fill"
                        style={{
                          background: `linear-gradient(150deg, ${item.bg1}, ${item.bg2})`,
                        }}
                      />
                    </div>
                  </div>

                  <div className="gallery-title">
                    {item.name}
                  </div>
                </a>
              ))}
            </div>
          </div>
        </main>
      </div>

      {showModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowModal(false)}
        >
          <div
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                fontSize: 18,
                marginBottom: 8,
              }}
            >
              小剧场
            </div>

            <div
              style={{
                color: '#999',
                fontSize: 12,
              }}
            >
              私密空间 · 请输入密码
            </div>

            <input
              type="password"
              className="modal-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') verifyPassword()
              }}
            />

            {error && (
              <div className="error-msg">{error}</div>
            )}

            <button
              className="modal-btn"
              onClick={verifyPassword}
            >
              进入
            </button>

            <button
              className="modal-cancel"
              onClick={() => setShowModal(false)}
            >
              取消
            </button>
          </div>
        </div>
      )}
    </>
  )
}
