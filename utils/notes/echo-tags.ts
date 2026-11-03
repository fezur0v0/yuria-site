// Keep the existing text field searchable; newlines separate tags without
// splitting legacy labels that contain spaces, commas or punctuation.
export function parseEchoTags(value: string | null | undefined): string[] {
  return [...new Set((value ?? '').split(/\r?\n/).map(tag => tag.trim()).filter(Boolean))];
}

export function serializeEchoTags(tags: string[]): string {
  return parseEchoTags(tags.join('\n')).join('\n');
}
