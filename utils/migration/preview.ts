export function previewMatches(header: string | null, active: boolean) {
  return header === null || header === (active ? '1' : '0');
}
