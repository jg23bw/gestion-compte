'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { create } = require('../../../src/application/finance/lombard-credit-commands.js');
const commands = create();

test('reads and normalizes Lombard credit from Auth metadata', () => {
  assert.deepEqual(commands.fromMetadata({ lombardCredit: { amount: '60000' } }), {
    label: 'Crédit lombard', amount: 60000, rate: null, notes: ''
  });
  assert.equal(commands.fromMetadata({}), null);
});

test('persists only the Lombard metadata field and returns its normalized value', async () => {
  const calls = [];
  const metadataRepository = { async update(value) { calls.push(value); } };
  const credit = await commands.save({ user: { id: 'user-1' }, metadataRepository, credit: { amount: '60000' } });
  assert.deepEqual(calls, [{ lombardCredit: { label: 'Crédit lombard', amount: 60000, rate: null, notes: '' } }]);
  assert.deepEqual(credit, calls[0].lombardCredit);
});

test('requires an authenticated user and metadata repository', async () => {
  const metadataRepository = { async update() {} };
  await assert.rejects(commands.save({ user: null, metadataRepository, credit: {} }), /Connectez-vous/);
  await assert.rejects(commands.save({ user: { id: 'u1' }, credit: {} }), /repository/);
});
