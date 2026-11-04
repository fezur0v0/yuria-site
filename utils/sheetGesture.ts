export function sheetBounds(viewport: number, topInset = 24) {
  const max = Math.max(1, viewport - topInset);
  return { min: Math.min(176, max), max };
}

export function resizeSheet(startHeight: number, startY: number, currentY: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, startHeight + startY - currentY));
}
