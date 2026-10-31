'use client'

import { useState } from 'react'
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi'
import styles from './notes-shell.module.css'

function pageItems(page: number, total: number, compact: boolean): (number | string)[] {
  let pages: number[]
  if (total <= (compact ? 4 : 7)) pages = Array.from({ length: total }, (_, i) => i + 1)
  else if (compact) pages = [1, page, page === 1 ? 2 : page === total ? total - 1 : page, total]
  else if (page <= 3) pages = [1, 2, 3, total - 1, total]
  else if (page >= total - 2) pages = [1, 2, total - 2, total - 1, total]
  else pages = [1, page - 1, page, page + 1, total]
  const unique = [...new Set(pages)].sort((a, b) => a - b)
  const items: (number | string)[] = []
  unique.forEach((value, index) => {
    if (index && value - unique[index - 1] > 1) items.push(`gap-${value}`)
    items.push(value)
  })
  return items
}

export default function NotesPagination({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (page: number) => void }) {
  const [jump, setJump] = useState('')
  const [invalid, setInvalid] = useState(false)
  if (totalPages <= 1) return null
  const renderPages = (compact: boolean) => pageItems(page, totalPages, compact).map(item => typeof item === 'number'
    ? <button type="button" key={item} onClick={() => onChange(item)} aria-label={`第 ${item} 页`} aria-current={item === page ? 'page' : undefined}>{item}</button>
    : <span className={styles.pageGap} key={item} aria-hidden="true">…</span>)
  return <nav className={styles.pagination} aria-label="分页">
    <button type="button" className={styles.pageArrow} aria-label="上一页" onClick={() => onChange(page - 1)} disabled={page <= 1}><FiChevronLeft size={25} aria-hidden="true" /></button>
    <div className={styles.pagesWide}>{renderPages(false)}</div>
    <div className={styles.pagesCompact}>{renderPages(true)}</div>
    <button type="button" className={styles.pageArrow} aria-label="下一页" onClick={() => onChange(page + 1)} disabled={page >= totalPages}><FiChevronRight size={25} aria-hidden="true" /></button>
    <form onSubmit={event => { event.preventDefault(); const next = Number(jump); if (!/^\d+$/.test(jump) || !Number.isSafeInteger(next) || next < 1 || next > totalPages) { setInvalid(true); return } onChange(next); setJump(''); setInvalid(false) }}>
      <input type="text" inputMode="numeric" aria-label="跳转页码" aria-invalid={invalid} title={`输入 1–${totalPages}，按回车跳转`} value={jump} onChange={event => { setJump(event.target.value); setInvalid(false) }} />
    </form>
  </nav>
}
