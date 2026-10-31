'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const Rules = require('../../../src/domain/accounts/account-type-rules.js');

test('normalizes only supported investment account subtypes', () => {
  assert.deepEqual(Rules.normalize({ pea: 'pea', av: 'av', cto: 'cto', bank: 'bank', bad: 'PEA' }), {
    pea: 'pea', av: 'av', cto: 'cto'
  });
  assert.deepEqual(Rules.normalize([]), {});
});

test('derives only subtype overrides without mutating accounts', () => {
  const accounts = [
    { id: 'pea', kind: 'savings', accountType: 'pea' },
    { id: 'bank', kind: 'bank', accountType: 'bank' },
    { id: 'legacy', kind: 'savings' }
  ];
  assert.deepEqual(Rules.overrides(accounts), { pea: 'pea' });
  assert.deepEqual(accounts[0], { id: 'pea', kind: 'savings', accountType: 'pea' });
  assert.equal(Rules.hasOverrides(accounts), true);
  assert.equal(Rules.hasOverrides([{ id: 'x', kind: 'bank' }]), false);
});

test('resolves cloud type overrides and preserves legacy local subtype values', () => {
  assert.equal(Rules.typeFor('savings', 'av'), 'av');
  assert.equal(Rules.typeFor('savings', 'invalid'), 'savings');
  assert.deepEqual(Rules.applyOverrides([{ id: 'a', kind: 'savings' }, { id: 'b', kind: 'bank' }], { a: 'cto', b: 'invalid' }), [
    { id: 'a', kind: 'savings', accountType: 'cto' },
    { id: 'b', kind: 'bank', accountType: 'bank' }
  ]);
});

test('classifies supported account types and safely falls back to bank', () => {
  assert.equal(Rules.isAccountType('pea'), true);
  assert.equal(Rules.isAccountType('unknown'), false);
  assert.equal(Rules.effectiveType({ accountType: 'cto', kind: 'savings' }), 'cto');
  assert.equal(Rules.effectiveType({ kind: 'pro' }), 'pro');
  assert.equal(Rules.effectiveType({ accountType: 'invalid', kind: 'savings' }), 'bank');
  assert.equal(Rules.effectiveType(null), 'bank');
});
