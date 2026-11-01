'use client';

import { useEffect, useRef, useState, useSyncExternalStore, type Ref } from 'react';
import { BsEjectFill } from 'react-icons/bs';
import { FiImage } from 'react-icons/fi';
import { siteAsset } from '@/utils/siteAssets';
import type { MeContent } from './content';
import { editable, type MeEditor } from './editing';
import styles from './me.module.css';

const desktopQuery = '(min-width: 1024px)';
function subscribeDesktop(update: () => void) {
  const media = window.matchMedia(desktopQuery);
  media.addEventListener('change', update);
  return () => media.removeEventListener('change', update);
}
const isDesktop = () => window.matchMedia(desktopQuery).matches;
const serverDesktop = () => false;

function DialogueMessage({ lines, active, canAdvance, onAdvance, nextRef }: {
  lines: string[]; active: boolean; canAdvance: boolean; onAdvance: () => void; nextRef: Ref<HTMLButtonElement>;
}) {
  const characters = Array.from(lines.join('\n'));
  const total = characters.length;
  const [visible, setVisible] = useState(0);
  const finished = useRef(false);
  const body = useRef<HTMLButtonElement>(null);
  const typing = visible < total;

  useEffect(() => {
    if (!active) return;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0;
    const complete = () => { finished.current = true; cancelAnimationFrame(frame); setVisible(total); };
    const onMotion = () => { if (media.matches) complete(); };
    if (media.matches) complete();
    else {
      const start = performance.now();
      const tick = (now: number) => {
        if (finished.current) return;
        const count = Math.min(total, Math.floor((now - start) / 32));
        setVisible(count);
        if (count < total) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    }
    media.addEventListener('change', onMotion);
    return () => { cancelAnimationFrame(frame); media.removeEventListener('change', onMotion); };
  }, [active, total]);

  function next() {
    if (typing) { finished.current = true; setVisible(total); }
    else if (canAdvance) { onAdvance(); body.current?.scrollTo({ top: 0 }); }
  }

  return <>
    <button ref={body} type="button" className={styles.dialogueText} onClick={next} aria-label={typing ? '点击显示完整对白' : '当前对白；点击继续'} disabled={!typing && !canAdvance}>
      <span aria-hidden="true" className={styles.typewriterText}><span>{characters.slice(0, visible).join('')}</span><span className={styles.unrevealed}>{characters.slice(visible).join('')}</span></span>
      <span className={styles.srOnly} role="status" aria-live="polite" aria-atomic="true">{typing ? '' : lines.join('\n')}</span>
    </button>
    <div className={styles.dialogueActions}><button type="button" ref={nextRef} onClick={next} disabled={!typing && !canAdvance} aria-label={typing ? '显示完整对白' : '下一步对话'}><span>NEXT</span><BsEjectFill className={styles.nextIcon} size={20} aria-hidden="true" /></button></div>
  </>;
}

export default function MeDialogue({ content, view, editor }: { content: MeContent; view: 'profile' | 'dialogue'; editor?: MeEditor }) {
  const [topicId, setTopicId] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const nextButton = useRef<HTMLButtonElement>(null);
  const firstChoice = useRef<HTMLButtonElement>(null);
  const desktop = useSyncExternalStore(subscribeDesktop, isDesktop, serverDesktop);
  const active = desktop || view === 'dialogue';
  const selectedId = editor ? editor.dialogue.topicId : topicId;
  const topic = content.topics.find(item => item.id === selectedId);
  const pageIndex = Math.min(editor ? editor.dialogue.pageIndex : step, topic ? topic.pages.length - 1 : 0);
  const lines = topic ? topic.pages[pageIndex] : content.greeting;

  function choose(id: string) {
    if (editor) { editor.onEdit({ kind: 'dialogue', topicId: id, pageIndex: 0 }); return; }
    setTopicId(id); setStep(0);
    requestAnimationFrame(() => nextButton.current?.focus({ preventScroll: true }));
  }

  function advance() {
    if (editor) { editor.onPreviewDialogue(topic && pageIndex < topic.pages.length - 1 ? { topicId: topic.id, pageIndex: pageIndex + 1 } : { pageIndex: 0 }); return; }
    if (topic && step < topic.pages.length - 1) {
      setStep(previous => previous + 1);
      requestAnimationFrame(() => nextButton.current?.focus({ preventScroll: true }));
    }
    else {
      setTopicId(null); setStep(0);
      requestAnimationFrame(() => firstChoice.current?.focus({ preventScroll: true }));
    }
  }

  return <section id="me-dialogue" className={styles.stage} aria-label={`和${content.profile.alias}聊聊`}>
    {content.backgroundUrl && <div className={styles.sceneBackground} aria-hidden="true" style={{ backgroundImage: `url(${JSON.stringify(siteAsset(content.backgroundUrl))})` }} />}
    {editor && <button type="button" className={styles.editBackground} onClick={() => editor.onEdit({ kind: 'image', field: 'backgroundUrl' })} disabled={editor.busy}><FiImage size={16} aria-hidden="true" /><span>背景</span></button>}
    <header className={styles.stageHeading}><span className={styles.eyebrow}>ABOUT ME</span><h2>Nice to meet you.</h2><span className={styles.hatch} aria-hidden="true" /></header>
    <div className={styles.portrait} aria-hidden={editor ? undefined : true} {...editable(editor, { kind: 'image', field: 'portraitUrl' }, '立绘')}><img src={siteAsset(content.portraitUrl)} alt="" width={661} height={1504} fetchPriority="high" /></div>
    <div className={styles.choices} aria-label="选择想聊的话题" hidden={topic !== undefined}>
      {content.topics.map((item, index) => <button key={item.id} ref={index === 0 ? firstChoice : undefined} type="button" onClick={() => choose(item.id)}><span>{item.label}</span></button>)}
    </div>
    <div className={styles.dialogue}>
      <span className={styles.nameplate} lang="ja">{content.profile.alias}</span>
      {editor ? <><div className={styles.dialogueText} {...editable(editor, { kind: 'dialogue', topicId: topic?.id, pageIndex }, '对白')}><span className={styles.typewriterText}>{lines.join('\n')}</span></div><div className={styles.dialogueActions}><button type="button" onClick={advance} disabled={!topic} aria-label="预览下一页对白"><span>NEXT</span><BsEjectFill className={styles.nextIcon} size={20} aria-hidden="true" /></button></div></> : <DialogueMessage key={`${topicId}-${step}-${active}`} lines={lines} active={active} canAdvance={Boolean(topic)} onAdvance={advance} nextRef={nextButton} />}
    </div>
  </section>;
}
