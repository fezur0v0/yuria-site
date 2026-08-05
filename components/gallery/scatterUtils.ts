
export function seededRandom(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) % 1000;
  }
  return hash / 1000;
}

export function getScatterStyle(id: string) {
  const r1 = seededRandom(id + 'r');
  const r2 = seededRandom(id + 'y');
  return {
    rotate: (r1 - 0.5) * 14, // -7deg ~ 7deg
    translateY: r2 * 14,      // 0 ~ 14px
  };
}
