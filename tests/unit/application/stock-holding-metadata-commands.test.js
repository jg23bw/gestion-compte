'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { create } = require('../../../src/application/portfolio/stock-holding-metadata-commands.js');
const rules = { normalize: value => Array.isArray(value) ? value.map(x => ({ ...x, normalized: true })) : [], normalizeCurrency: value => String(value || 'EUR') };
const commands = create({ rules });

test('reads stock holdings from Auth metadata through normalization', () => {
  assert.deepEqual(commands.fromMetadata({ stockHoldings: [{ id: 'h1' }] }), [{ id: 'h1', normalized: true }]);
  assert.deepEqual(commands.fromMetadata({}), []);
});

test('persists the normalized stock holdings under the existing metadata key', async () => {
  const calls = [];
  const holdings = await commands.save({ user: { id: 'u1' }, metadataRepository: { async update(value) { calls.push(value); } }, holdings: [{ id: 'h1' }] });
  assert.deepEqual(calls, [{ stockHoldings: [{ id: 'h1', normalized: true }] }]);
  assert.deepEqual(holdings, calls[0].stockHoldings);
});

test('requires an authenticated user and metadata repository', async () => {
  await assert.rejects(commands.save({ user: null, metadataRepository: { async update() {} }, holdings: [] }), /Connectez-vous/);
  await assert.rejects(commands.save({ user: { id: 'u1' }, holdings: [] }), /repository/);
});
