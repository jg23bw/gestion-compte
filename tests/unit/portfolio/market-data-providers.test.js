const test = require('node:test');
const assert = require('node:assert/strict');
const StockPriceProvider = require('../../../src/adapters/market-data/supabase-stock-price-provider.js');
const FxProvider = require('../../../src/adapters/market-data/http-exchange-rate-provider.js');
const StockPricePort = require('../../../src/ports/portfolio/stock-price-provider.js');
const FxPort = require('../../../src/ports/portfolio/exchange-rate-provider.js');

test('market data provider invokes non-price Edge actions through the same adapter', async () => {
  const calls = [];
  const provider = StockPriceProvider.create({
    getClient: () => ({ functions: { invoke: async (...args) => { calls.push(args); return { data: { points: [1, 2] }, error: null }; } } }),
    functionName: 'stock-data'
  });
  assert.deepEqual(await provider.invoke('history', { id: 'NASDAQ-AAPL', period: '1y' }), { points: [1, 2] });
  assert.deepEqual(calls, [['stock-data', { body: { action: 'history', id: 'NASDAQ-AAPL', period: '1y' } }]]);
  assert.equal(StockPricePort.assert(provider), provider);
});

test('stock price provider invokes the authenticated Edge Function and returns a positive price', async () => {
  const calls = [];
  const provider = StockPriceProvider.create({
    getClient: () => ({ functions: { invoke: async (...args) => { calls.push(args); return { data: { price: 123.45 }, error: null }; } } }),
    functionName: 'stock-data'
  });
  assert.equal(await provider.getPrice('NASDAQ-AAPL'), 123.45);
  assert.deepEqual(calls, [['stock-data', { body: { action: 'price', id: 'NASDAQ-AAPL' } }]]);
});

test('stock price provider rejects missing clients and invalid prices', async () => {
  const unavailable = StockPriceProvider.create({ getClient: () => null, functionName: 'stock-data' });
  await assert.rejects(unavailable.getPrice('AAPL'), /connexion cloud requise/);
  const invalid = StockPriceProvider.create({
    getClient: () => ({ functions: { invoke: async () => ({ data: { price: 0 }, error: null }) } }),
    functionName: 'stock-data'
  });
  await assert.rejects(invalid.getPrice('AAPL'), /aucun cours reçu/);
  assert.throws(() => StockPricePort.assert({}), /provider port is required/);
});

test('market data provider isolates one-minute HTTP 429 cooldowns by action', async () => {
  let now = 1000;
  const actions = [];
  const provider = StockPriceProvider.create({
    getClient: () => ({ functions: { invoke: async (_name, options) => {
      actions.push(options.body.action);
      if (options.body.action === 'price') return { data: null, error: { message: 'Too many requests', status: 429 } };
      return { data: { points: [] }, error: null };
    } } }),
    functionName: 'stock-data',
    now: () => now
  });
  await assert.rejects(provider.getPrice('AAPL'), /HTTP 429/);
  await assert.rejects(provider.getPrice('AAPL'), /temporairement limité/);
  assert.deepEqual(await provider.invoke('history', { id: 'AAPL' }), { points: [] });
  now += 60001;
  await assert.rejects(provider.getPrice('AAPL'), /HTTP 429/);
  assert.deepEqual(actions, ['price', 'history', 'price']);
});

test('FX provider converts EUR-base rates into EUR per unit and handles GBX', async () => {
  let calls = 0;
  const provider = FxProvider.create({
    endpoint: 'https://rates.invalid/latest/EUR',
    fetchImpl: async (url, options) => {
      calls++;
      assert.equal(url, 'https://rates.invalid/latest/EUR');
      assert.equal(options.cache, 'no-store');
      return { ok: true, json: async () => ({ result: 'success', rates: { USD: 1.1, GBP: 0.85, CHF: 0.95 } }) };
    }
  });
  assert.deepEqual(await provider.fetchRates(['USD', 'GBX', 'CHF', 'EUR']), {
    USD: 1 / 1.1, GBX: (1 / 0.85) / 100, CHF: 1 / 0.95
  });
  assert.equal(calls, 1);
  assert.equal(FxPort.assert(provider), provider);
});

test('FX provider returns an empty result for EUR-only requests and rejects invalid responses', async () => {
  const unused = FxProvider.create({ endpoint: 'x', fetchImpl: async () => { throw new Error('must not fetch'); } });
  assert.deepEqual(await unused.fetchRates(['EUR']), {});
  const invalid = FxProvider.create({
    endpoint: 'x',
    fetchImpl: async () => ({ ok: false, status: 503 })
  });
  await assert.rejects(invalid.fetchRates(['USD']), /HTTP 503/);
  assert.throws(() => FxPort.assert({}), /provider port is required/);
});
