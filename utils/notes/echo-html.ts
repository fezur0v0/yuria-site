export const MAX_ECHO_HTML = 200_000;
export const echoHtmlKey = (id: string) => `airp_echo_html:${id}`;
export function parseEchoHtml(raw: unknown): string {
  if (raw == null) return '';
  const value = typeof raw === 'string' ? JSON.parse(raw) : raw;
  if (!value || typeof value !== 'object' || Array.isArray(value) || typeof value.html !== 'string' || value.html.length > MAX_ECHO_HTML) throw new Error('HTML 格式无效或内容过长');
  return value.html;
}
// The preview may run inline interaction scripts, but has no same-origin access,
// forms, connections, nested frames, or external scripts. This policy comes first.
export function echoHtmlDocument(html: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src https: data: blob:; media-src https: data: blob:; font-src https: data:; connect-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'"><style>html{color-scheme:light}body{margin:0;overflow-wrap:anywhere}img,video{max-width:100%}</style></head><body>${html}</body></html>`;
}
