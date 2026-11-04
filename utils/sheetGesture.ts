export type DragSample = { y: number; time: number };

export function sheetVelocity(samples: DragSample[], now: number): number {
  const recent = samples.filter(sample => now - sample.time <= 100).slice(-3);
  if (recent.length < 2) return 0;
  const first = recent[0], last = recent[recent.length - 1];
  return last.time > first.time ? (last.y - first.y) / (last.time - first.time) : 0;
}

export function shouldDismissSheet(distance: number, height: number, velocity: number): boolean {
  return distance >= Math.min(120, Math.max(56, height * .24)) || distance >= 20 && velocity >= .55;
}
