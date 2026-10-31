'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { create } = require('../../../src/application/synchronization/cloud-state-loader.js');

function fixture(options = {}) {
  const calls = [];
  const rows = {
    accounts: [{ id: 'account-1', kind: 'bank' }],
    transactions: [
      { id: 'late', transaction_date: '2026-10-20' },
      { id: 'early', transaction_date: '2026-10-02' }
    ],
    templates: [{ id: 'template-1' }],
    crypto: [{ id: 'crypto-1' }]
  };
  const repository = name => ({
    async listAll() {
      calls.push(name + '.listAll');
      if (name === 'crypto' && options.cryptoError) throw options.cryptoError;
      return rows[name];
    }
  });
  const service = create({
    accountRepository: () => repository('accounts'),
    transactionRepository: () => repository('transactions'),
    recurringTemplateRepository: () => repository('templates'),
    cryptoHoldingRepository: () => repository('crypto'),
    mapAccount: (row, types) => ({ ...row, accountType: types[row.id] || row.kind }),
    mapTransaction: row => ({ ...row }),
    mapRecurringTemplate: row => ({ ...row }),
    mapCryptoHolding: row => ({ ...row }),
    normalizeLombardCredit: value => value || null,
    normalizeAccountTypes: value => value || {},
    normalizeAccountPledges: value => value || {},
    normalizeStockHoldings: value => value || [],
    isMissingCryptoTable: error => error.code === 'PGRST205'
  });
  return { service, calls, rows };
}

test('loads cloud records and maps them with authenticated user metadata', async () => {
  const f = fixture();
  const result = await f.service.load({
    client: {},
    user: {
      id: 'user-1',
      user_metadata: {
        accountTypes: { 'account-1': 'pea' },
        accountPledges: { 'account-1': { note: 'Nantissement' } },
        lombardCredit: { amount: 60000 },
        stockHoldings: [{ id: 'holding-1' }]
      }
    }
  });

  assert.equal(result.accounts[0].accountType, 'pea');
  assert.deepEqual(result.accountPledges, { 'account-1': { note: 'Nantissement' } });
  assert.deepEqual(result.lombardCredit, { amount: 60000 });
  assert.deepEqual(result.stockHoldings, [{ id: 'holding-1' }]);
  assert.deepEqual(result.transactions.map(row => row.id), ['early', 'late']);
  assert.deepEqual(result.cryptoHoldings, [{ id: 'crypto-1' }]);
  assert.equal(result.cryptoTableReady, true);
  assert.deepEqual(f.calls.sort(), ['accounts.listAll', 'crypto.listAll', 'templates.listAll', 'transactions.listAll']);
});

test('keeps the rest of cloud loading available when the crypto table is missing', async () => {
  const f = fixture({ cryptoError: Object.assign(new Error('table missing'), { code: 'PGRST205' }) });
  const result = await f.service.load({ client: {}, user: { id: 'user-1' } });

  assert.equal(result.cryptoTableReady, false);
  assert.deepEqual(result.cryptoHoldings, []);
  assert.equal(result.accounts.length, 1);
  assert.equal(result.transactions.length, 2);
});

test('propagates unexpected crypto repository failures', async () => {
  const f = fixture({ cryptoError: new Error('network unavailable') });
  await assert.rejects(
    f.service.load({ client: {}, user: { id: 'user-1' } }),
    /network unavailable/
  );
});

test('requires an authenticated user and a Supabase client', async () => {
  const f = fixture();
  await assert.rejects(f.service.load({ client: {}, user: null }), /authenticated user/);
  await assert.rejects(f.service.load({ client: null, user: { id: 'user-1' } }), /client and authenticated user/);
});
