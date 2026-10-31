'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const Commands = require('../../../src/application/accounts/account-type-commands.js');
const Rules = require('../../../src/domain/accounts/account-type-rules.js');

test('exposes account subtype metadata operations through the application facade', () => {
  const commands = Commands.create({ rules: Rules });
  const accounts = [{ id: 'a', kind: 'savings', accountType: 'pea' }, { id: 'b', kind: 'bank' }];
  assert.deepEqual(commands.normalize({ a: 'pea', b: 'bank' }), { a: 'pea' });
  assert.deepEqual(commands.overrides(accounts), { a: 'pea' });
  assert.equal(commands.typeFor('savings', 'av'), 'av');
  assert.deepEqual(commands.applyOverrides([{ id: 'a', kind: 'savings' }], { a: 'cto' }), [
    { id: 'a', kind: 'savings', accountType: 'cto' }
  ]);
  assert.equal(commands.hasOverrides(accounts), true);
});

test('rejects an invalid rules dependency', () => {
  assert.throws(() => Commands.create({ rules: {} }), /account type rules/);
});
