import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { MEDIA_BUCKETS, type BackupSource } from '@/utils/migration/backup';

export function supabaseBackupSource(supabase: SupabaseClient): BackupSource {
  return {
    async table(name) {
      const rows = [];
      for (let offset = 0; ; offset += 1000) {
        const { data, error } = await supabase.from(name).select('*')
          .order(name === 'site_config' ? 'key' : 'id').range(offset, offset + 999);
        if (error) throw new Error('读取业务表失败');
        rows.push(...(data ?? []));
        if (!data || data.length < 1000) return rows;
      }
    },
    async files() {
      const files: { bucket: string; path: string }[] = [];
      for (const bucket of MEDIA_BUCKETS) {
        const folders = [''];
        while (folders.length) {
          const folder = folders.pop()!;
          for (let offset = 0; ; offset += 1000) {
            const { data, error } = await supabase.storage.from(bucket).list(folder, {
              limit: 1000, offset, sortBy: { column: 'name', order: 'asc' },
            });
            if (error) throw new Error('读取图片列表失败');
            for (const item of data ?? []) {
              const path = folder ? `${folder}/${item.name}` : item.name;
              if (item.id) files.push({ bucket, path });
              else folders.push(path);
            }
            if (!data || data.length < 1000) break;
          }
        }
      }
      return files;
    },
    async download(file) {
      const { data, error } = await supabase.storage.from(file.bucket).download(file.path);
      if (error || !data) throw new Error('读取原图片失败');
      if (data.size > 64 * 1024 * 1024) throw new Error('存在超过 64 MB 的文件，需要分批迁移');
      return { bytes: new Uint8Array(await data.arrayBuffer()), type: data.type || 'application/octet-stream' };
    },
  };
}
