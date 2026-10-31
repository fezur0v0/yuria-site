'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { FiChevronDown, FiSearch, FiCheck } from 'react-icons/fi'
import PrivateTheaterImage from './PrivateTheaterImage'
import styles from './notes-shell.module.css'

type Character = { id: string; name: string; avatar: string | null }
type Props = { characters: Character[]; value: string; onChange: (value: string) => void; open: boolean; onOpenChange: (open: boolean) => void }

export default function CharacterSelect({ characters, value, onChange, open, onOpenChange }: Props) {
  const [query, setQuery] = useState('')
  const root = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const listId = useId()
  const selected = characters.find(character => character.id === value)
  const matching = characters.filter(character => character.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()))
  useEffect(() => {
    if (!open) return
    const frame = requestAnimationFrame(() => input.current?.focus())
    return () => cancelAnimationFrame(frame)
  }, [open])
  useEffect(() => {
    if (!open) return
    const outside = (event: PointerEvent) => { if (root.current && !root.current.contains(event.target as Node)) onOpenChange(false) }
    document.addEventListener('pointerdown', outside)
    return () => document.removeEventListener('pointerdown', outside)
  }, [open, onOpenChange])
  return <div ref={root} className={styles.characterSelect} onKeyDown={event => {
    if (event.key === 'Escape' && open) { event.preventDefault(); event.stopPropagation(); onOpenChange(false); trigger.current?.focus() }
    if (event.key === 'ArrowDown' && event.target === input.current) { event.preventDefault(); root.current?.querySelector<HTMLButtonElement>('[role="option"]')?.focus() }
  }}>
    <button ref={trigger} type="button" className={styles.selectTrigger} aria-label="选择角色" aria-haspopup="listbox" aria-expanded={open} aria-controls={listId} onClick={() => { setQuery(''); onOpenChange(!open) }}>
      {selected ? <><span className={styles.selectAvatar} aria-hidden="true">{selected.avatar ? <PrivateTheaterImage src={selected.avatar} alt="" /> : selected.name[0]}</span><span>{selected.name}</span></> : <span className={styles.selectPlaceholder}>点击选择角色</span>}
      <FiChevronDown size={15} aria-hidden="true" />
    </button>
    {open && <div className={styles.selectPopup}>
      <div className={styles.selectSearch}><FiSearch size={15} aria-hidden="true" /><input ref={input} aria-label="搜索角色" type="search" placeholder="搜索角色…" value={query} onChange={event => setQuery(event.target.value)} /></div>
      <div id={listId} role="listbox" aria-label="角色列表" className={styles.selectOptions}>
        {matching.map(character => <button type="button" role="option" key={character.id} aria-selected={character.id === value} onClick={() => { onChange(character.id); onOpenChange(false); setQuery('') }} onKeyDown={event => {
          if (!['ArrowDown', 'ArrowUp'].includes(event.key)) return
          event.preventDefault()
          const options = Array.from(root.current?.querySelectorAll<HTMLButtonElement>('[role="option"]') ?? [])
          const index = options.indexOf(event.currentTarget)
          options[(index + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length]?.focus()
        }}><span className={styles.selectAvatar} aria-hidden="true">{character.avatar ? <PrivateTheaterImage src={character.avatar} alt="" /> : character.name[0]}</span><span>{character.name}</span>{character.id === value && <FiCheck size={14} className={styles.selectedCheck} aria-hidden="true" />}</button>)}
        {matching.length === 0 && <p className={styles.selectEmpty}>没有找到角色</p>}
      </div>
    </div>}
  </div>
}
