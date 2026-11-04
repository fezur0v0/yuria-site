import test from 'node:test';
import assert from 'node:assert/strict';
import { sheetVelocity, shouldDismissSheet } from '../utils/sheetGesture.ts';

test('short slow drags rebound while deliberate pulls and short downward flings close', () => {
  assert.equal(shouldDismissSheet(35, 500, .1), false);
  assert.equal(shouldDismissSheet(130, 500, .1), true);
  assert.equal(shouldDismissSheet(35, 500, .8), true);
  assert.equal(shouldDismissSheet(5, 500, 1), false);
  assert.equal(shouldDismissSheet(0, 500, -.8), false);
});

test('holding or reversing a gesture does not reuse an earlier downward fling', () => {
  const down = [{ y: 100, time: 0 }, { y: 140, time: 40 }];
  assert.equal(shouldDismissSheet(40, 500, sheetVelocity(down, 40)), true);
  assert.equal(shouldDismissSheet(40, 500, sheetVelocity([...down, { y: 140, time: 240 }], 240)), false);
  assert.equal(shouldDismissSheet(20, 500, sheetVelocity([...down, { y: 120, time: 80 }], 80)), false);
  assert.equal(shouldDismissSheet(60, 500, sheetVelocity([{ y: 100, time: 0 }, { y: 180, time: 40 }, { y: 160, time: 60 }, { y: 160, time: 61 }], 61)), false);
});
