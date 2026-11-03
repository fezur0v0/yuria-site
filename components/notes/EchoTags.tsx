'use client';

import { useId, useRef, useState } from 'react';
import { parseEchoTags, serializeEchoTags } from '@/utils/notes/echo-tags';
import styles from './echo-tags.module.css';

export function EchoTags({ value }: { value: string | null }) {
  const tags = parseEchoTags(value);
  if (!tags.length) return null;
  return <div className={styles.tags} aria-label="标签">{tags.map(tag => <span key={tag} className={styles.tag}>{tag}</span>)}</div>;
}

export default function EchoTagsInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const tags = parseEchoTags(value);
  const [input, setInput] = useState('');
  const composing = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const hintId = useId();

  function commit() {
    if (!input.trim()) { setInput(''); return; }
    onChange(serializeEchoTags([...tags, input]));
    setInput('');
  }

  return <>
    <div className={styles.inputBox} onClick={event => {
      if (event.target === event.currentTarget) inputRef.current?.focus();
    }}>
      {tags.map(tag => <span key={tag} className={styles.tag}>{tag}<button type="button" aria-label={`删除标签：${tag}`} onMouseDown={event => event.preventDefault()} onClick={() => {
        onChange(serializeEchoTags(tags.filter(item => item !== tag)));
        inputRef.current?.focus();
      }}>×</button></span>)}
      <input ref={inputRef} aria-label="Echo 标签" aria-describedby={hintId} value={input} placeholder={tags.length ? '继续添加…' : '输入标签后按 Enter…'} enterKeyHint="done"
        onChange={event => setInput(event.target.value)} onBlur={commit}
        onCompositionStart={() => { composing.current = true; }} onCompositionEnd={() => { composing.current = false; }}
        onKeyDown={event => {
          if (composing.current || event.nativeEvent.isComposing || event.keyCode === 229) return;
          if (event.key === 'Enter') { event.preventDefault(); commit(); }
          if (event.key === 'Backspace' && !input && tags.length) {
            event.preventDefault(); onChange(serializeEchoTags(tags.slice(0, -1)));
          }
        }} />
    </div>
    <p id={hintId} className={styles.hint}>按 Enter 添加标签，点击 × 删除</p>
  </>;
}
