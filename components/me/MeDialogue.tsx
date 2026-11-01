'use client';

import { useRef, useState } from 'react';
import { FiArrowDown, FiClock, FiCornerUpLeft, FiX } from 'react-icons/fi';
import { siteAsset } from '@/utils/siteAssets';
import { greeting, topics, type TopicId } from './content';
import styles from './me.module.css';

type Entry = { topic: string; lines: readonly string[] };

export default function MeDialogue() {
  const [topicId, setTopicId] = useState<TopicId | null>(null);
  const [step, setStep] = useState(0);
  const [history, setHistory] = useState<Entry[]>([{ topic: '初次见面', lines: greeting }]);
  const dialog = useRef<HTMLDialogElement>(null);
  const historyButton = useRef<HTMLButtonElement>(null);
  const dialogueButton = useRef<HTMLButtonElement>(null);
  const firstChoice = useRef<HTMLButtonElement>(null);
  const topic = topics.find(item => item.id === topicId);
  const lines = topic ? topic.pages[step] : greeting;
  const hasNext = topic ? step < topic.pages.length - 1 : false;

  function choose(id: TopicId) {
    const selected = topics.find(item => item.id === id)!;
    setTopicId(id); setStep(0);
    setHistory(previous => [...previous, { topic: selected.label, lines: selected.pages[0] }]);
    requestAnimationFrame(() => dialogueButton.current?.focus({ preventScroll: true }));
  }

  function advance() {
    if (topic && hasNext) {
      const next = step + 1;
      setStep(next);
      setHistory(previous => [...previous, { topic: topic.label, lines: topic.pages[next] }]);
    } else {
      setTopicId(null); setStep(0);
      requestAnimationFrame(() => firstChoice.current?.focus({ preventScroll: true }));
    }
  }

  return <section id="me-dialogue" className={styles.stage} aria-label="和悠里亜聊聊">
    <header className={styles.stageHeading}><span className={styles.eyebrow}>ABOUT ME / CHAPTER 01</span><h2>Nice to meet you.</h2><span className={styles.hatch} aria-hidden="true" /></header>
    <div className={styles.portrait} aria-hidden="true"><img src={siteAsset('/images/me/yuria-portrait.webp')} alt="" width={661} height={1504} fetchPriority="high" /></div>
    <div className={styles.choices} aria-label="选择想聊的话题" hidden={topic !== undefined}>
      {topics.map((item, index) => <button key={item.id} ref={index === 0 ? firstChoice : undefined} type="button" onClick={() => choose(item.id)}><span className={styles.diamond} aria-hidden="true" /><span>{item.label}</span></button>)}
    </div>
    <div className={styles.dialogue}>
      <span className={styles.nameplate} lang="ja">悠里亜</span>
      <div key={`${topicId}-${step}`} className={styles.dialogueText} role="status" aria-live="polite" aria-atomic="true">{lines.map(line => <p key={line}>{line}</p>)}</div>
      <div className={styles.dialogueActions}>
        <button type="button" ref={historyButton} onClick={() => dialog.current?.showModal()} aria-label="查看对话记录"><FiClock size={15} aria-hidden="true" /><span>对话记录</span></button>
        <button type="button" ref={dialogueButton} onClick={advance} disabled={!topic} aria-label={hasNext ? '继续对话' : '返回话题'}>{topic ? <><span>{hasNext ? '继续' : '再聊点别的'}</span>{hasNext ? <FiArrowDown size={17} aria-hidden="true" /> : <FiCornerUpLeft size={17} aria-hidden="true" />}</> : <span className={styles.chooseHint}>选择话题，慢慢认识我。</span>}</button>
      </div>
    </div>
    <dialog ref={dialog} className={styles.history} aria-labelledby="me-history-title" onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }} onClose={() => historyButton.current?.focus({ preventScroll: true })}>
      <div className={styles.historyHeading}><h2 id="me-history-title">对话记录</h2><button type="button" aria-label="关闭对话记录" onClick={() => dialog.current?.close()} autoFocus><FiX size={20} aria-hidden="true" /></button></div>
      <div className={styles.historyBody}>{history.map((entry, index) => <article key={index}><span>{entry.topic}</span><strong lang="ja">悠里亜</strong>{entry.lines.map(line => <p key={line}>{line}</p>)}</article>)}</div>
    </dialog>
  </section>;
}
