'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { FiArrowUpRight, FiLock } from 'react-icons/fi'
import { createClient } from '@/utils/supabase/client'
import PortfolioNav from '@/components/PortfolioNav'
import './home.css'

type PortfolioItem = {
  id: string
  title: string
  category: string | null
  date: string | null
  content: string | null
  cover_url: string | null
}

type GalleryAlbum = {
  id: string
  title: string
  cover_image_url: string | null
}

function excerpt(html: string | null) {
  return (html ?? '').replace(/<h[23][^>]*>[\s\S]*?<\/h[23]>/gi, '')
    .replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim().slice(0, 110)
}

export default function Home() {
  const [coverUrl, setCoverUrl] = useState('')
  const [works, setWorks] = useState<PortfolioItem[]>([])
  const [albums, setAlbums] = useState<GalleryAlbum[]>([])

  useEffect(() => {
    let active = true
    const supabase = createClient()
    void supabase.from('site_config').select('key, value').then(({ data }) => {
      if (!active || !data) return
      const entries = Object.fromEntries(data.map(row => [row.key, row.value]))
      setCoverUrl(entries.cover_url ?? '')
    })
    void supabase.from('portfolio_items')
      .select('id, title, category, date, content, cover_url')
      .eq('is_visible', true).order('sort_order', { ascending: true, nullsFirst: false }).limit(4)
      .then(({ data }) => { if (active) setWorks(data ?? []) })
    void supabase.from('gallery_albums')
      .select('id, title, cover_image_url')
      .eq('is_featured_home', true).eq('is_visible', true).order('sort_order').limit(3)
      .then(({ data }) => { if (active) setAlbums(data ?? []) })
    return () => { active = false }
  }, [])

  const featured = works[0]
  const heroArt = featured?.cover_url || albums[0]?.cover_image_url || coverUrl

  return <div className="home-editorial">
    <PortfolioNav showSections />
    <main>
      <section className="home-hero" aria-labelledby="home-title">
        {coverUrl && <img className="home-hero__background" src={coverUrl} alt="" />}
        <div className="home-hero__shade" aria-hidden="true" />
        <div className="home-hero__meta"><span>PERSONAL ARCHIVE</span><span>EST. YURIA</span></div>
        <h1 id="home-title" className="home-hero__title">YURIA</h1>

        <div className="home-hero__caption">
          <span className="home-hero__eyebrow">AN OPEN JOURNAL</span>
          <p>칼바람</p>
          <span className="home-hero__caption-line" />
          <span>於你而言我是一顆星嗎</span>
        </div>

        {heroArt && <Link href={featured ? `/portfolio/${featured.id}` : albums[0] ? `/gallery/${albums[0].id}` : '/gallery'} className="home-hero__print" aria-label={featured ? `查看作品：${featured.title}` : '查看图集'}>
          <div className="home-hero__print-image"><img src={heroArt} alt={featured?.title ?? albums[0]?.title ?? 'Yuria 封面'} /></div>
          <div className="home-hero__print-caption"><span>FEATURED</span><strong>{featured?.title ?? albums[0]?.title ?? 'Yuria'}</strong><FiArrowUpRight size={18} aria-hidden="true" /></div>
        </Link>}

        <div className="home-hero__edge" aria-hidden="true"><span>IMAGES / WORDS / MUSIC</span><span>YURIA.XIN</span></div>
      </section>

      <section id="home-works" className="home-section home-works" aria-labelledby="home-works-title">
        <div className="home-section__heading">
          <span className="home-section__index">SELECTED WORKS</span>
          <div className="home-section__title-row"><h2 id="home-works-title">随笔</h2><Link href="/portfolio">more</Link></div>
          <p>如果某天有人读懂我  我也会愣在原地</p>
        </div>
        {works.length ? <div className="home-works__grid">
          {works.map((work, index) => <Link href={`/portfolio/${work.id}`} key={work.id} className="home-work">
            <div className="home-work__image">
              {work.cover_url ? <img src={work.cover_url} alt="" loading="lazy" /> : <span aria-hidden="true">Y.</span>}
              <span className="home-work__view"><FiArrowUpRight size={20} aria-hidden="true" /></span>
            </div>
            <div className="home-work__meta"><span>{work.category || '随笔'}</span><span>{work.date ? new Date(work.date).getFullYear() : 'YURIA'}</span></div>
            <h3>{work.title}</h3>
            {index === 0 && excerpt(work.content) && <p>{excerpt(work.content)}</p>}
          </Link>)}
        </div> : <p className="home-section__empty">作品正在准备中。</p>}
      </section>

      <section className="home-gallery" aria-labelledby="home-gallery-title">
        <div className="home-gallery__inner">
          <div className="home-section__heading home-section__heading--dark">
            <span className="home-section__index">VISUAL NOTES</span>
            <div className="home-section__title-row"><h2 id="home-gallery-title">图册</h2><Link href="/gallery">more</Link></div>
            <p>镜中花  水中月</p>
          </div>
          {albums.length ? <div className="home-gallery__grid">
            {albums.map(album => <Link href={`/gallery/${album.id}`} className="home-gallery__frame" key={album.id}>
              <div className="home-gallery__image">{album.cover_image_url ? <img src={album.cover_image_url} alt="" loading="lazy" /> : <span aria-hidden="true">Y.</span>}</div>
              <div className="home-gallery__caption"><span>{album.title}</span><FiArrowUpRight size={16} aria-hidden="true" /></div>
            </Link>)}
          </div> : <p className="home-section__empty">图册正在准备中。</p>}
        </div>
      </section>

      <section className="home-theater" aria-labelledby="home-theater-title">
        <div className="home-theater__top"><span>PRIVATE SPACE</span><FiLock size={18} aria-hidden="true" /></div>
        <h2 id="home-theater-title">AIRP</h2>
        <p>我原以为我是这颗心脏的主人  后来发现  你才是</p>
        <Link href="/notes">more</Link>
        <span className="home-theater__watermark" aria-hidden="true">STORY</span>
      </section>
    </main>
    <footer className="home-footer"><span>Yuria</span><span>IMAGES · WORDS · MUSIC</span><a href="#home-title" aria-label="回到顶部">back</a></footer>
  </div>
}
