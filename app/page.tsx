'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import {
  Home,
  LayoutGrid,
  ImageIcon,
  Lock,
  ChevronRight,
  ArrowRight,
  Shield,
} from 'lucide-react'

type PortfolioItem = {
  title: string
  desc: string
  tag: string
  image: string
  reverse?: boolean
  href: string
}

type GalleryItem = {
  title: string
  image: string
  href: string
}

export default function HomePage() {
  const [mounted, setMounted] = useState(false)

  // 小剧场验证
  const [openModal, setOpenModal] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // ====== 作品集数据 ======
  const portfolioItems: PortfolioItem[] = useMemo(
    () => [
      {
        title: '个人网页作品集',
        desc: '将视觉、动效与情绪氛围融合成独立的网页空间。偏向韩系、极简与留白感设计。',
        tag: 'WEB DESIGN · 2026',
        image:
          'https://images.unsplash.com/photo-1498050108023-c5249f4df085?q=80&w=1600&auto=format&fit=crop',
        href: '/portfolio',
      },
      {
        title: '私人摄影图集',
        desc: '记录日常光影、城市氛围与安静时刻。更偏向电影感与柔和低饱和色调。',
        tag: 'PHOTO COLLECTION · 2026',
        image:
          'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?q=80&w=1600&auto=format&fit=crop',
        href: '/gallery',
        reverse: true,
      },
    ],
    []
  )

  // ====== 图集数据 ======
  const galleryItems: GalleryItem[] = useMemo(
    () => [
      {
        title: '黄昏时刻',
        image:
          'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1200&auto=format&fit=crop',
        href: '/gallery',
      },
      {
        title: '森林雾气',
        image:
          'https://images.unsplash.com/photo-1448375240586-882707db888b?q=80&w=1200&auto=format&fit=crop',
        href: '/gallery',
      },
      {
        title: '夜色城市',
        image:
          'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?q=80&w=1200&auto=format&fit=crop',
        href: '/gallery',
      },
      {
        title: '静谧角落',
        image:
          'https://images.unsplash.com/photo-1494526585095-c41746248156?q=80&w=1200&auto=format&fit=crop',
        href: '/gallery',
      },
      {
        title: '胶片感',
        image:
          'https://images.unsplash.com/photo-1510127034890-ba27508e9f1c?q=80&w=1200&auto=format&fit=crop',
        href: '/gallery',
      },
      {
        title: '蓝调时间',
        image:
          'https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=1200&auto=format&fit=crop',
        href: '/gallery',
      },
    ],
    []
  )

  // ====== 小剧场验证逻辑 ======
  async function handleVerify() {
    try {
      setLoading(true)
      setError('')

      // 绝对不要把真实密码写前端
      // 这里调用 middleware + api 校验
      const res = await fetch('/api/theater/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          password,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data?.message || '验证失败')
        return
      }

      // 登录成功后设置 session
      localStorage.setItem('theater_access', 'granted')

      window.location.href = '/theater'
    } catch (err) {
      setError('服务器错误')
    } finally {
      setLoading(false)
    }
  }

  if (!mounted) return null

  return (
    <main className="min-h-screen bg-[#f7f7f4] text-[#1a1a1a]">
      {/* ===== 背景柔光 ===== */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-[-10%] top-[-5%] h-[500px] w-[500px] rounded-full bg-white/40 blur-3xl" />
        <div className="absolute bottom-[-10%] right-[-5%] h-[400px] w-[400px] rounded-full bg-[#d9d9d4]/40 blur-3xl" />
      </div>

      <div className="relative flex">
        {/* ===== 侧边栏 ===== */}
        <aside className="fixed left-0 top-0 hidden h-screen w-[260px] flex-col border-r border-white/10 bg-[#171717]/90 backdrop-blur-2xl lg:flex">
          <div className="px-8 pt-12">
            <h1 className="font-serif text-[28px] font-light tracking-[0.25em] text-[#f4f4f2]">
              Yuria
            </h1>
          </div>

          <nav className="mt-14 flex flex-1 flex-col gap-2 px-5">
            <SidebarLink href="/" icon={<Home size={16} />} label="首页" />
            <SidebarLink
              href="/portfolio"
              icon={<LayoutGrid size={16} />}
              label="作品集"
            />
            <SidebarLink
              href="/gallery"
              icon={<ImageIcon size={16} />}
              label="图集"
            />

            <button
              onClick={() => setOpenModal(true)}
              className="group relative flex items-center gap-3 rounded-xl px-4 py-3 text-left text-[13px] tracking-[0.08em] text-[#9c9c9c] transition-all hover:bg-white/5 hover:text-white"
            >
              <span className="absolute left-0 top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-full bg-white opacity-0 transition-all group-hover:opacity-100" />

              <Lock size={16} />
              小剧场
            </button>
          </nav>

          {/* ===== 安全状态 ===== */}
          <div className="mx-5 mb-6 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10">
                <Shield size={18} className="text-white/80" />
              </div>

              <div>
                <p className="text-[12px] tracking-[0.15em] text-white/85">
                  PRIVATE ACCESS
                </p>
                <p className="mt-1 text-[11px] text-[#9e9e9e]">
                  Middleware 已启用
                </p>
              </div>
            </div>
          </div>
        </aside>

        {/* ===== 主区域 ===== */}
        <section className="w-full lg:ml-[260px]">
          {/* ===== Hero ===== */}
          <div className="relative h-[420px] overflow-hidden">
            <img
              src="https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=2000&auto=format&fit=crop"
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />

            <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/10 to-[#f7f7f4]" />

            <div className="absolute bottom-0 left-0 right-0 z-10 px-7 pb-10 md:px-14">
              <h2 className="font-serif text-[52px] font-light tracking-[0.18em] text-white drop-shadow-sm md:text-[72px]">
                Yuria
              </h2>

              <p className="mt-3 text-[11px] tracking-[0.35em] text-white/75">
                MY PRIVATE LITTLE WORLD
              </p>
            </div>
          </div>

          {/* ===== 作品集 ===== */}
          <section className="px-6 pt-14 md:px-14">
            <div className="mb-10 flex items-center justify-between">
              <span className="text-[11px] tracking-[0.35em] text-[#9a9a9a]">
                PORTFOLIO
              </span>

              <Link
                href="/portfolio"
                className="flex items-center gap-1 text-[12px] text-[#999] transition hover:text-[#111]"
              >
                全部作品
                <ChevronRight size={14} />
              </Link>
            </div>

            <div className="flex flex-col gap-20">
              {portfolioItems.map((item, index) => (
                <div
                  key={index}
                  className={`flex flex-col gap-10 lg:items-stretch ${
                    item.reverse
                      ? 'lg:flex-row-reverse'
                      : 'lg:flex-row'
                  }`}
                >
                  {/* 图片 */}
                  <div className="flex-1">
                    <div className="group relative aspect-[3/2] overflow-hidden rounded-[28px] bg-[#ddd] shadow-[0_12px_40px_rgba(0,0,0,0.06)]">
                      <img
                        src={item.image}
                        alt={item.title}
                        className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.03]"
                      />

                      <div className="absolute inset-0 bg-black/5 transition group-hover:bg-black/0" />
                    </div>
                  </div>

                  {/* 文字 */}
                  <div className="flex flex-1 flex-col justify-center">
                    <div>
                      <p className="text-[11px] tracking-[0.25em] text-[#b3b3b3]">
                        {item.tag}
                      </p>

                      <h3 className="mt-5 font-serif text-[34px] font-light leading-[1.2] text-[#1a1a1a] md:text-[42px]">
                        {item.title}
                      </h3>

                      <p className="mt-6 max-w-[520px] text-[16px] leading-[1.8] text-[#666]">
                        {item.desc}
                      </p>
                    </div>

                    <Link
                      href={item.href}
                      className="mt-10 inline-flex items-center gap-2 self-start border-b border-[#d6d6d6] pb-1 text-[14px] text-[#7a7a7a] transition hover:border-[#111] hover:text-[#111]"
                    >
                      查看详情
                      <ArrowRight size={14} />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ===== 图集 ===== */}
          <section className="px-6 pb-32 pt-24 md:px-14">
            <div className="mb-10 flex items-center justify-between">
              <span className="text-[11px] tracking-[0.35em] text-[#9a9a9a]">
                GALLERY
              </span>

              <Link
                href="/gallery"
                className="flex items-center gap-1 text-[12px] text-[#999] transition hover:text-[#111]"
              >
                全部图集
                <ChevronRight size={14} />
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-3">
              {galleryItems.map((item, index) => (
                <Link
                  key={index}
                  href={item.href}
                  className="group block"
                >
                  {/* 堆叠效果 */}
                  <div className="relative mb-5 aspect-[3/2]">
                    <div className="absolute left-[6%] top-0 z-[1] w-[88%] rotate-[-4deg] overflow-hidden rounded-[18px] border-2 border-white opacity-40 shadow-lg">
                      <img
                        src={item.image}
                        alt=""
                        className="aspect-[3/2] w-full object-cover"
                      />
                    </div>

                    <div className="absolute left-[4%] top-3 z-[2] w-[92%] rotate-[2deg] overflow-hidden rounded-[18px] border-2 border-white opacity-70 shadow-xl">
                      <img
                        src={item.image}
                        alt=""
                        className="aspect-[3/2] w-full object-cover"
                      />
                    </div>

                    <div className="absolute left-[2%] top-5 z-[3] w-[96%] overflow-hidden rounded-[18px] border-2 border-white shadow-2xl transition duration-500 group-hover:-translate-y-1">
                      <img
                        src={item.image}
                        alt={item.title}
                        className="aspect-[3/2] w-full object-cover transition duration-700 group-hover:scale-[1.04]"
                      />
                    </div>
                  </div>

                  <p className="text-center font-serif text-[16px] text-[#2a2a2a]">
                    {item.title}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        </section>
      </div>

      {/* ===== 手机底部导航 ===== */}
      <div className="fixed bottom-0 left-0 right-0 z-50 flex border-t border-black/5 bg-white/85 px-2 py-3 backdrop-blur-xl lg:hidden">
        <MobileLink href="/" icon={<Home size={18} />} label="主页" />
        <MobileLink
          href="/portfolio"
          icon={<LayoutGrid size={18} />}
          label="作品"
        />
        <MobileLink
          href="/gallery"
          icon={<ImageIcon size={18} />}
          label="图集"
        />

        <button
          onClick={() => setOpenModal(true)}
          className="flex flex-1 flex-col items-center justify-center gap-1 text-[#999]"
        >
          <Lock size={18} />
          <span className="text-[10px]">小剧场</span>
        </button>
      </div>

      {/* ===== 密码弹窗 ===== */}
      {openModal && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-5 backdrop-blur-md"
          onClick={() => setOpenModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[360px] rounded-[28px] bg-[#fcfcfa]/95 p-8 shadow-[0_30px_80px_rgba(0,0,0,0.18)]"
          >
            <div className="text-center">
              <h3 className="font-serif text-[22px] font-light tracking-[0.18em] text-[#1a1a1a]">
                小剧场
              </h3>

              <p className="mt-3 text-[11px] tracking-[0.15em] text-[#9f9f9f]">
                PRIVATE ACCESS ONLY
              </p>
            </div>

            <div className="mt-8">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="请输入访问密码"
                className="w-full rounded-2xl border border-[#e5e5e2] bg-transparent px-5 py-4 text-center text-[15px] tracking-[0.2em] outline-none transition focus:border-[#999]"
              />

              {error && (
                <p className="mt-3 text-center text-[12px] text-[#c0392b]">
                  {error}
                </p>
              )}

              <button
                onClick={handleVerify}
                disabled={loading}
                className="mt-5 w-full rounded-2xl bg-[#1a1a1a] py-4 text-[13px] tracking-[0.18em] text-white transition hover:opacity-90 disabled:opacity-60"
              >
                {loading ? '验证中...' : '进入'}
              </button>

              <button
                onClick={() => setOpenModal(false)}
                className="mt-4 w-full text-center text-[12px] text-[#b0b0b0] transition hover:text-[#666]"
              >
                取消
              </button>
            </div>

            {/* ===== 安全提示 ===== */}
            <div className="mt-7 rounded-2xl border border-black/5 bg-black/[0.03] p-4">
              <p className="text-[11px] leading-6 text-[#888]">
                已启用：
                <br />
                · Middleware 路由保护
                <br />
                · 服务端密码校验
                <br />
                · LocalStorage Session
                <br />
                · 防止前端暴露真实密码
              </p>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

// ===== Sidebar Link =====
function SidebarLink({
  href,
  icon,
  label,
}: {
  href: string
  icon: React.ReactNode
  label: string
}) {
  return (
    <Link
      href={href}
      className="group relative flex items-center gap-3 rounded-xl px-4 py-3 text-[13px] tracking-[0.08em] text-[#9c9c9c] transition-all hover:bg-white/5 hover:text-white"
    >
      <span className="absolute left-0 top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-full bg-white opacity-0 transition-all group-hover:opacity-100" />

      {icon}
      {label}
    </Link>
  )
}

// ===== Mobile Link =====
function MobileLink({
  href,
  icon,
  label,
}: {
  href: string
  icon: React.ReactNode
  label: string
}) {
  return (
    <Link
      href={href}
      className="flex flex-1 flex-col items-center justify-center gap-1 text-[#999]"
    >
      {icon}
      <span className="text-[10px]">{label}</span>
    </Link>
  )
}
