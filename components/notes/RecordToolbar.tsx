'use client'

import { FiGrid } from 'react-icons/fi'
import styles from './notes-shell.module.css'

type Format = 'bold' | 'quote' | 'strike' | 'ul' | 'ol'
export default function RecordToolbar({ onFormat, onTable }: { onFormat: (format: Format) => void; onTable: () => void }) {
  return <div className={styles.editorHeading}>
    <span className={styles.editorLabel}>正文</span>
    <div className={styles.editorTools} role="toolbar" aria-label="正文格式">
      <button type="button" title="加粗" aria-label="加粗" onClick={() => onFormat('bold')}><strong>B</strong></button>
      <button type="button" title="引用" aria-label="引用" onClick={() => onFormat('quote')}>“”</button>
      <button type="button" title="删除线" aria-label="删除线" onClick={() => onFormat('strike')}><s>S</s></button>
      <button type="button" title="无序列表" aria-label="无序列表" onClick={() => onFormat('ul')}>•</button>
      <button type="button" title="插入表格" aria-label="插入表格" onClick={onTable}><FiGrid size={14} aria-hidden="true" /></button>
    </div>
  </div>
}
