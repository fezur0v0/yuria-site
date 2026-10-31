'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { FiX } from 'react-icons/fi'
import PortfolioNav from '@/components/PortfolioNav'
import styles from './notes-shell.module.css'

type Props = {
  active: 'library' | 'records'
  search: string
  onSearch: (value: string) => void
  filterCount: number
  filterContent: ReactNode
}

export default function NotesNavigation({ active, search, onSearch, filterCount, filterContent }: Props) {
  const [filterOpen, setFilterOpen] = useState(false)
  const dialog = useRef<HTMLDialogElement>(null)
  const closeButton = useRef<HTMLButtonElement>(null)
  const trigger = useRef<HTMLElement | null>(null)
  const close = () => setFilterOpen(false)
  function openFilter() {
    trigger.current = document.activeElement as HTMLElement
    setFilterOpen(true)
  }

  useEffect(() => {
    const element = dialog.current
    if (!element || !filterOpen) return
    if (!element.open) element.showModal()
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const frame = requestAnimationFrame(() => closeButton.current?.focus())
    return () => {
      cancelAnimationFrame(frame)
      document.body.style.overflow = overflow
    }
  }, [filterOpen])

  useEffect(() => {
    if (!filterOpen && dialog.current?.open) {
      dialog.current.close()
      trigger.current?.focus({ preventScroll: true })
    }
  }, [filterOpen])

  return <>
    <PortfolioNav theme="light" mode="notes" notesControls={{ active, search, onSearch, onFilter: openFilter, filterOpen, filterCount }} />
    <dialog ref={dialog} className={styles.drawer} aria-label={active === 'library' ? '分类与标签筛选' : '角色筛选'} onCancel={close} onClose={close} onClick={event => { if (event.target === event.currentTarget) { const box = event.currentTarget.getBoundingClientRect(); if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) close() } }}>
      <div className={styles.drawerHeader}><span>筛选</span><button ref={closeButton} type="button" aria-label="关闭侧栏" onClick={close}><FiX size={22} /></button></div>
      {filterOpen && <div className={styles.filterBody}>{filterContent}</div>}
    </dialog>
  </>
}
