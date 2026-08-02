'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';

const supabase = createClient();

export default function AdminBasicPage() {
  const [coverUrl, setCoverUrl] = useState('');
  const [signature, setSignature] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    fetchConfig();
  }, []);

  async function fetchConfig() {
    const { data } = await supabase.from('site_config').select('*');
    if (data) {
      data.forEach((r: any) => {
        if (r.key === 'cover_url') setCoverUrl(r.value || '');
        if (r.key === 'signature') setSignature(r.value || '');
      });
    }
  }

  async function saveConfig() {
    setSaving(true);
    await supabase.from('site_config').upsert({ key: 'cover_url', value: coverUrl });
    await supabase.from('site_config').upsert({ key: 'signature', value: signature });
    setSaving(false);
    showMsg('已保存 ✓');
  }

  function showMsg(text: string) {
    setMsg(text);
    setTimeout(() => setMsg(''), 2500);
  }

  return (
    <section className="max-w-lg space-y-6">
      <h1
        style={{ fontFamily: 'Noto Serif SC,serif' }}
        className="text-2xl font-light tracking-wide text-black/80"
      >
        基本设置
      </h1>

      {msg && <div className="text-xs text-green-600 bg-green-50 px-4 py-2 rounded-xl">{msg}</div>}

      <div>
        <label className="text-xs text-black/40 mb-1.5 block">封面图 URL</label>
        <input
          value={coverUrl}
          onChange={(e) => setCoverUrl(e.target.value)}
          className="w-full border border-black/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-black/40"
          placeholder="https://..."
        />
        {coverUrl && (
          <img
            src={coverUrl}
            className="mt-3 h-28 rounded-xl object-cover"
            alt="预览"
            onError={(e) => (e.currentTarget.style.display = 'none')}
          />
        )}
      </div>
      <div>
        <label className="text-xs text-black/40 mb-1.5 block">个性签名</label>
        <input
          value={signature}
          onChange={(e) => setSignature(e.target.value)}
          className="w-full border border-black/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-black/40"
          placeholder="我的小小世界"
        />
      </div>
      <button
        onClick={saveConfig}
        disabled={saving}
        className="bg-black text-white rounded-xl px-6 py-2.5 text-sm tracking-wide hover:opacity-90 disabled:opacity-50"
      >
        {saving ? '保存中...' : '保存设置'}
      </button>
    </section>
  );
}
