'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/content/client';
import MePage from '@/components/me/MePage';
import { defaultMeContent, ME_CONFIG_KEY, moveMePhoto, parseMeContent, type MeContent } from '@/components/me/content';
import type { DialoguePosition, MeEditTarget } from '@/components/me/editing';
import MeEditDialog from './MeEditDialog';
import AdminLoading from './AdminLoading';
import styles from './me-settings.module.css';

export default function MeSettings() {
  const router = useRouter();
  const [draft, setDraft] = useState<MeContent>(() => structuredClone(defaultMeContent));
  const [saved, setSaved] = useState<MeContent>(() => structuredClone(defaultMeContent));
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [target, setTarget] = useState<MeEditTarget | null>(null);
  const [dialogue, setDialogue] = useState<DialoguePosition>({ pageIndex: 0 });
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const { data, error } = await createClient().from('site_config').select('value').eq('key', ME_CONFIG_KEY).limit(1);
        if (error) throw new Error(error.message);
        const content = parseMeContent(data?.[0]?.value);
        if (active) { setDraft(content); setSaved(structuredClone(content)); setLoadError(false); }
      } catch { if (active) setLoadError(true); }
      finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, [attempt]);

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(''), 4500);
    return () => clearTimeout(timer);
  }, [message]);

  async function save() {
    setSaving(true); setError(''); setMessage('');
    try {
      const content = parseMeContent(draft);
      const { error } = await createClient().from('site_config').upsert({ key: ME_CONFIG_KEY, value: JSON.stringify(content) }, { onConflict: 'key' });
      if (error) throw new Error(error.message);
      setSaved(content); setDraft(content); setMessage('已保存到主页。');
    } catch (cause) { setError(cause instanceof Error ? cause.message : '保存未完成，请重试'); }
    finally { setSaving(false); }
  }

  function edit(next: MeEditTarget) {
    setError(''); setMessage('');
    if (next.kind === 'dialogue') setDialogue({ topicId: next.topicId, pageIndex: next.pageIndex });
    setTarget(next);
  }

  if (loading) return <AdminLoading />;
  if (loadError) return <div className={styles.loadState}><p role="alert">Unable to load.</p><button type="button" onClick={() => { setLoading(true); setAttempt(value => value + 1); }}>Retry</button><Link href="/admin">Back</Link></div>;

  return <>
    <div className={styles.editorPreview} data-modal-open={Boolean(target)} inert={Boolean(target)}><MePage content={draft} editor={{ busy: saving, dirty, dialogue, onEdit: edit, onPreviewDialogue: setDialogue, onMovePhoto: (from, to) => setDraft(previous => moveMePhoto(previous, from, to)), onSave: () => { void save(); }, onCancel: () => router.push('/admin') }} /></div>
    {target && <MeEditDialog key={JSON.stringify(target)} content={draft} target={target} onClose={() => setTarget(null)} onApply={(content, position) => { setDraft(content); if (position) setDialogue(position); setTarget(null); setMessage('预览已更新，点击顶部 ✓ 保存。'); }} />}
    {(error || message) && <div className={`${styles.toast}${error ? ` ${styles.toastError}` : ''}`} role={error ? 'alert' : 'status'}>{error || message}{error && <button type="button" aria-label="关闭提示" onClick={() => setError('')}>×</button>}</div>}
  </>;
}
