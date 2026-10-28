export function moveQueueTrack<T extends { id: number }>(tracks: T[], activeId: number, overId: number): T[] {
  const from = tracks.findIndex(track => track.id === activeId)
  const to = tracks.findIndex(track => track.id === overId)
  if (from < 0 || to < 0 || from === to) return tracks
  const result = [...tracks]
  const [track] = result.splice(from, 1)
  result.splice(to, 0, track)
  return result
}

export function shuffledNext(ids: number[], currentId: number, remaining: number[], random = Math.random) {
  const valid = new Set(ids)
  let bag = [...new Set(remaining)].filter(id => valid.has(id) && id !== currentId)
  if (!bag.length) {
    bag = ids.filter(id => id !== currentId)
    for (let i = bag.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1))
      ;[bag[i], bag[j]] = [bag[j], bag[i]]
    }
  }
  return { id: bag[0] ?? (valid.has(currentId) ? currentId : ids[0]), remaining: bag.slice(1) }
}
