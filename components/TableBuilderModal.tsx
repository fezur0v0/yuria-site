'use client'
import { useState } from 'react'

type TableBuilderModalProps = {
  onInsert: (markdown: string) => void
  onClose: () => void
}

export default function TableBuilderModal({ onInsert, onClose }: TableBuilderModalProps) {
  const [rows, setRows] = useState<string[][]>([
    ['标题1', '标题2'],
    ['内容1', '内容2'],
  ])
  const [copied, setCopied] = useState(false)

  function addRow() {
    setRows(prev => [...prev, prev[0].map(() => '')])
  }
  function addColumn() {
    setRows(prev => prev.map(row => [...row, '']))
  }
  function removeRow(index: number) {
    if (rows.length <= 2) return
    setRows(prev => prev.filter((_, i) => i !== index))
  }
  function removeColumn(index: number) {
    if (rows[0].length <= 1) return
    setRows(prev => prev.map(row => row.filter((_, i) => i !== index)))
  }
  function updateCell(r: number, c: number, value: string) {
    setRows(prev => {
      const next = prev.map(row => [...row])
      next[r][c] = value
      return next
    })
  }

  function buildMarkdown() {
    const header = rows[0]
    const body = rows.slice(1)
    const headerLine = `| ${header.join(' | ')} |`
    const dividerLine = `| ${header.map(() => '---').join(' | ')} |`
    const bodyLines = body.map(row => `| ${row.join(' | ')} |`)
    return [headerLine, dividerLine, ...bodyLines].join('\n')
  }

  async function handleCopy() {
    const md = buildMarkdown()
    await navigator.clipboard.writeText(md)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  function handleInsert() {
    onInsert(buildMarkdown())
    onClose()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
      onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: '16px', padding: '24px', width: 'min(620px,100%)', maxHeight: '80vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h3 style={{ fontFamily: 'Noto Serif SC,serif', fontWeight: 300, fontSize: '16px', color: '#1a1a1a', margin: 0 }}>编辑表格</h3>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button onClick={addColumn} style={{ background: '#f5f5f3', border: '1px solid #ebebeb', borderRadius: '6px', padding: '4px 10px', fontSize: '12px', color: '#666', cursor: 'pointer' }}>+ 列</button>
            <button onClick={addRow} style={{ background: '#f5f5f3', border: '1px solid #ebebeb', borderRadius: '6px', padding: '4px 10px', fontSize: '12px', color: '#666', cursor: 'pointer' }}>+ 行</button>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%' }}>
            <tbody>
              {rows.map((row, r) => (
                <tr key={r}>
                  {row.map((cell, c) => (
                    <td key={c} style={{ border: '1px solid #ebebeb', padding: '2px', position: 'relative' }}>
                      <input value={cell} onChange={e => updateCell(r, c, e.target.value)}
                        style={{ width: '110px', border: 'none', outline: 'none', padding: '6px 8px', fontSize: '13px', fontWeight: r === 0 ? 600 : 400, background: r === 0 ? '#fafaf8' : '#fff', color: '#333' }} />
                      {r === 0 && rows[0].length > 1 && (
                        <button onClick={() => removeColumn(c)}
                          style={{ position: 'absolute', top: '-8px', right: '-8px', width: '16px', height: '16px', borderRadius: '50%', background: '#fff', border: '1px solid #ebebeb', color: '#ccc', fontSize: '10px', cursor: 'pointer', lineHeight: 1 }}>×</button>
                      )}
                    </td>
                  ))}
                  {rows.length > 2 && (
                    <td style={{ border: 'none', padding: '0 6px' }}>
                      <button onClick={() => removeRow(r)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ccc', fontSize: '13px' }}>×</button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ fontSize: '11px', color: '#bbb', margin: '14px 0' }}>
          提示：markdown 表格不支持合并单元格，只能是规整的行列结构
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={handleCopy}
            style={{ flex: 1, padding: '10px', borderRadius: '10px', border: '1px solid #ebebeb', background: copied ? '#f0fdf4' : '#fff', color: copied ? '#22c55e' : '#666', fontSize: '13px', cursor: 'pointer' }}>
            {copied ? '已复制 ✓' : '复制表格内容'}
          </button>
          <button onClick={handleInsert}
            style={{ flex: 1, padding: '10px', borderRadius: '10px', border: 'none', background: '#1a1a1a', color: '#fff', fontSize: '13px', cursor: 'pointer' }}>
            插入到正文
          </button>
        </div>
      </div>
    </div>
  )
}
