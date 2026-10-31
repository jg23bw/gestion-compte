'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { create } = require('../../../src/adapters/market-data/coincap-fallback-provider.js');

test('maps fallback USD prices to EUR and back to holding identifiers', async () => {
  const provider = create({
    endpoint: 'https://example.test/assets',
    coinIds: { bitcoin: 'bitcoin', ethereum: 'ethereum' },
    fetchImpl: async url => {
      assert.match(url, /ids=bitcoin%2Cethereum/);
      return { ok: true, json: async () => ({ data: [{ id: 'bitcoin', priceUsd: '70000' }, { id: 'ethereum', priceUsd: '2500' }] }) };
    }
  });
  assert.deepEqual(await provider.fetchPrices(['bitcoin', 'ethereum'], 0.9), { bitcoin: 63000, ethereum: 2250 });
});

test('returns no fallback prices when IDs or a valid FX rate are unavailable', async () => {
  let calls = 0;
  const provider = create({ endpoint: 'https://example.test', coinIds: { bitcoin: 'bitcoin' }, fetchImpl: async () => { calls++; return { ok: true, json: async () => ({ data: [] }) }; } });
  assert.deepEqual(await provider.fetchPrices(['unknown'], 0.9), {});
  assert.deepEqual(await provider.fetchPrices(['bitcoin'], 0), {});
  assert.equal(calls, 0);
});

test('returns an empty map for an unsuccessful HTTP response', async () => {
  const provider = create({ endpoint: 'https://example.test', coinIds: { bitcoin: 'bitcoin' }, fetchImpl: async () => ({ ok: false, status: 503 }) });
  assert.deepEqual(await provider.fetchPrices(['bitcoin'], 0.9), {});
});
