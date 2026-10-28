import assert from 'node:assert/strict'
import { test } from 'node:test'
import { moveQueueTrack, shuffledNext } from '../utils/music/queue.ts'

test('reordering preserves track objects and the playing song identity', () => {
  const tracks = [1, 2, 3, 4].map(id => ({ id, src: `track-${id}` }))
  const playing = tracks[1]
  const moved = moveQueueTrack(tracks, 2, 4)
  assert.deepEqual(moved.map(track => track.id), [1, 3, 4, 2])
  assert.equal(moved.find(track => track.id === playing.id), playing)
  assert.equal(moved.find(track => track.id === playing.id).src, 'track-2')
  assert.deepEqual(tracks.map(track => track.id), [1, 2, 3, 4])
  assert.equal(moveQueueTrack(tracks, 99, 1), tracks)
  assert.equal(moveQueueTrack(tracks, 1, 1), tracks)
})

test('shuffle visits the remaining songs once, survives reordering and avoids an immediate repeat', () => {
  let ids = [1, 2, 3, 4]
  let current = 1
  let bag = []
  const visited = [current]
  for (let i = 0; i < 3; i++) {
    const draw = shuffledNext(ids, current, bag, () => 0.25)
    assert.notEqual(draw.id, current)
    visited.push(draw.id)
    current = draw.id; bag = draw.remaining
    ids = [...ids].reverse()
  }
  assert.equal(new Set(visited).size, 4)
  assert.notEqual(shuffledNext(ids, current, bag, () => 0.75).id, current)
  assert.equal(shuffledNext([7], 7, [], () => 0).id, 7)
  assert.deepEqual(shuffledNext([1, 2], 1, [999, 2, 2], () => 0), { id: 2, remaining: [] })
})
