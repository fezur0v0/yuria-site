interface UploadTicket {
  uploadUrl: string;
  publicUrl: string;
}

interface ApiError {
  error?: string;
}

export async function uploadPublicMedia(file: File, folder: string) {
  const ticketResponse = await fetch('/api/r2/media', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fileName: file.name,
      contentType: file.type,
      size: file.size,
      folder,
    }),
  });

  if (!ticketResponse.ok) {
    const body = await ticketResponse.json().catch(() => ({})) as ApiError;
    throw new Error(body.error || '无法准备上传');
  }

  const ticket = await ticketResponse.json() as UploadTicket;
  const uploadResponse = await fetch(ticket.uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file,
  });

  if (!uploadResponse.ok) {
    throw new Error(`R2 上传失败（${uploadResponse.status}）`);
  }

  return ticket.publicUrl;
}

export async function deletePublicMedia(url: string) {
  const response = await fetch('/api/r2/media', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as ApiError;
    throw new Error(body.error || '无法删除 R2 文件');
  }
}
