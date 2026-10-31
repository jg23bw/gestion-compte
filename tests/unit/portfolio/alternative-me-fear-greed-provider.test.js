'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { create } = require('../../../src/adapters/market-data/alternative-me-fear-greed-provider.js');

test('returns the latest fear and greed score with its classification', async () => {
  const provider = create({ endpoint: 'https://example.test/fng', fetchImpl: async () => ({
    ok: true, json: async () => ({ data: [{ value: '27', value_classification: 'Fear' }] })
  }) });
  assert.deepEqual(await provider.fetchLatest(), { value: 27, classification: 'Fear' });
});

test('rejects unsuccessful responses and malformed index data', async () => {
  const unavailable = create({ endpoint: 'https://example.test', fetchImpl: async () => ({ ok: false }) });
  await assert.rejects(unavailable.fetchLatest(), /API indisponible/);
  const malformed = create({ endpoint: 'https://example.test', fetchImpl: async () => ({ ok: true, json: async () => ({ data: [] }) }) });
  await assert.rejects(malformed.fetchLatest(), /Indice absent/);
});
