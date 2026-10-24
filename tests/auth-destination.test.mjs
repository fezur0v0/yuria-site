import assert from 'node:assert/strict'
import test from 'node:test'
import { safeAuthDestination } from '../utils/auth/destination.ts'

test('OAuth return paths stay within account, admin, or notes', () => {
  assert.equal(safeAuthDestination('/notes/library?tab=one'), '/notes/library?tab=one')
  assert.equal(safeAuthDestination('/account'), '/account')
  for (const destination of ['//evil.test', '/%2fevil.test', '/%5cevil.test', '/\\evil.test',
    'https://evil.test', '/public', '/administration', '/notes-other', '/%zz']) {
    assert.equal(safeAuthDestination(destination), '/admin', destination)
  }
})
