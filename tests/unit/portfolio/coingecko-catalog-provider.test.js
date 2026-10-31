'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { create } = require('../../../src/adapters/market-data/coingecko-catalog-provider.js');

test('searches CoinGecko and limits the number of returned coins', async () => {
  let requested = '';
  const provider = create({ searchEndpoint: 'https://example.test/search', resultLimit: 2, fetchImpl: async url => {
    requested = url;
    return { ok: true, json: async () => ({ coins: [{ id: 'btc' }, { id: 'eth' }, { id: 'sol' }] }) };
  }});
  assert.match(requested, /^$/);
  assert.deepEqual(await provider.searchCoins('bitcoin & ether'), [{ id: 'btc' }, { id: 'eth' }]);
  assert.match(requested, /bitcoin%20%26%20ether/);
});

test('reports rate limits and propagates request cancellation', async () => {
  const limited = create({ searchEndpoint: 'https://example.test', fetchImpl: async () => ({ ok: false, status: 429 }) });
  await assert.rejects(limited.searchCoins('btc'), /limite de requêtes/);
  const controller = new AbortController();
  const aborted = create({ searchEndpoint: 'https://example.test', fetchImpl: async (url, options) => {
    assert.equal(options.signal, controller.signal);
    const error = new Error('aborted'); error.name = 'AbortError'; throw error;
  }});
  await assert.rejects(aborted.searchCoins('btc', { signal: controller.signal }), /aborted/);
});
