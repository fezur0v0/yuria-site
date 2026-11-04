import test from 'node:test';
import assert from 'node:assert/strict';
import { resizeSheet, sheetBounds } from '../utils/sheetGesture.ts';

test('dragging up expands, dragging down shrinks, and a new gesture starts at the retained height', () => {
  const {min,max}=sheetBounds(780);
  const expanded=resizeSheet(400,400,200,min,max);
  assert.equal(expanded,600);
  const lowered=resizeSheet(expanded,200,450,min,max);
  assert.equal(lowered,350);
  assert.equal(resizeSheet(lowered,450,450,min,max),lowered);
});

test('dragging past either limit leaves a usable sheet within the visible viewport', () => {
  const {min,max}=sheetBounds(780,32);
  assert.equal(resizeSheet(400,400,-2000,min,max),748);
  assert.equal(resizeSheet(400,400,2000,min,max),176);
  assert.deepEqual(sheetBounds(150,24),{min:126,max:126});
});
