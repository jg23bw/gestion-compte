'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const Rules = require('../../../src/domain/accounts/account-pledge-rules.js');

test('normalizes legacy boolean and object pledge metadata', () => {
  assert.deepEqual(Rules.normalize({
    legacy: true, note: { note: '  Garantie bancaire  ' }, ignored: false
  }), { legacy: { note: '' }, note: { note: 'Garantie bancaire' } });
});

test('rejects invalid containers and limits notes to 160 characters', () => {
  assert.deepEqual(Rules.normalize([]), {});
  assert.deepEqual(Rules.normalize(null), {});
  assert.equal(Rules.normalize({ a: { note: 'x'.repeat(200) } }).a.note.length, 160);
});

test('filters metadata to existing accounts only', () => {
  assert.deepEqual(Rules.forAccounts({ a: true, removed: { note: 'x' } }, [{ id: 'a' }]), { a: { note: '' } });
});
