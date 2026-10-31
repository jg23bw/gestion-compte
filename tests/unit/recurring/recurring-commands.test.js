'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const RecurringRules = require('../../../src/domain/recurring/recurring-rules.js');
const { generateTransactions } = require('../../../src/application/recurring/recurring-commands.js');

test('generation creates enabled transactions with due date and recurring key', () => {
  const templates = [
    { id: 'rent', accountId: 'bank', label: 'Loyer', amount: 850, day: 31, frequency: 'monthly', enabled: true },
    { id: 'disabled', accountId: 'bank', label: 'Disabled', amount: 20, day: 5, frequency: 'monthly', enabled: false },
    { id: 'empty', accountId: 'bank', label: 'À renseigner', amount: null, day: 5, frequency: 'monthly', enabled: true }
  ];
  assert.deepEqual(RecurringRules.buildTransactionsForMonth(templates, [], '2026-04', {
    createId: () => 'generated-id', now: () => 1000
  }), [{
    id: 'generated-id', accountId: 'bank', date: '2026-04-30', amount: 850,
    label: 'Loyer', createdAt: 1000, recurringKey: 'rent@2026-04-30', recurringTemplateId: 'rent'
  }]);
});

test('generation skips existing recurring keys and invalid amounts', () => {
  const templates = [
    { id: 'rent', accountId: 'bank', label: 'Loyer', amount: 850, day: 5, frequency: 'monthly', enabled: true },
    { id: 'bad', accountId: 'bank', label: 'Bad', amount: 'invalid', day: 5, frequency: 'monthly', enabled: true }
  ];
  assert.deepEqual(RecurringRules.buildTransactionsForMonth(templates, [{ recurringKey: 'rent@2026-04-05' }], '2026-04', {
    createId: () => 'unused', now: () => 100
  }), []);
});

test('generation is deterministic and avoids duplicate templates in the same batch', () => {
  const template = { id: 'rent', accountId: 'bank', label: 'Loyer', amount: '12.5', day: 5, frequency: 'monthly', enabled: true };
  let id = 0;
  const result = RecurringRules.buildTransactionsForMonth([template, template], [], '2026-04', {
    createId: () => 'id-' + (++id), now: () => 1000
  });
  assert.equal(result.length, 1);
  assert.equal(result[0].id, 'id-1');
  assert.equal(result[0].amount, 12.5);
  assert.equal(result[0].createdAt, 1000);
  assert.equal(result[0].recurringKey, 'rent@2026-04-05');
});

test('application use case delegates generation to the domain', () => {
  const template = { id: 't', accountId: 'a', label: 'Test', amount: 10, day: 1, frequency: 'monthly', enabled: true };
  const result = generateTransactions({ templates: [template], transactions: [], month: '2026-04' });
  assert.equal(result.length, 1);
  assert.equal(result[0].recurringKey, 't@2026-04-01');
});

test('invalid month produces no generated transactions', () => {
  assert.deepEqual(RecurringRules.buildTransactionsForMonth([], [], '2026-13'), []);
});


function createMarkerRepository(initial = []) {
  const markers = new Set(initial);
  return {
    add: month => markers.add(month),
    remove: month => markers.delete(month),
    has: month => markers.has(month),
    values: () => [...markers]
  };
}

test('inspectMonth trusts generated transactions and repairs the local marker', () => {
  const repository = createMarkerRepository();
  const result = require('../../../src/application/recurring/recurring-commands.js').inspectMonth({
    transactions: [{ recurringKey: 'rent@2026-04-05', date: '2026-04-05' }],
    month: '2026-04',
    generatedMonthsRepository: repository
  });
  assert.equal(result.status, 'already-generated');
  assert.deepEqual(repository.values(), ['2026-04']);
});

test('inspectMonth removes stale markers when no generated transaction remains', () => {
  const repository = createMarkerRepository(['2026-04']);
  const result = require('../../../src/application/recurring/recurring-commands.js').inspectMonth({
    transactions: [], month: '2026-04', generatedMonthsRepository: repository
  });
  assert.equal(result.status, 'not-generated');
  assert.deepEqual(repository.values(), []);
});

test('prepareGeneration returns additions without mutating the transaction collection', () => {
  const repository = createMarkerRepository();
  const transactions = [];
  const template = { id: 'rent', accountId: 'bank', label: 'Loyer', amount: 850, day: 5, frequency: 'monthly', enabled: true };
  const result = require('../../../src/application/recurring/recurring-commands.js').prepareGeneration({
    templates: [template], transactions, month: '2026-04', generatedMonthsRepository: repository
  });
  assert.equal(result.status, 'ready');
  assert.equal(result.additions.length, 1);
  assert.deepEqual(transactions, []);
  assert.deepEqual(repository.values(), []);
});

test('prepareGeneration blocks existing month and reports empty months', () => {
  const commands = require('../../../src/application/recurring/recurring-commands.js');
  const repository = createMarkerRepository();
  assert.equal(commands.prepareGeneration({
    templates: [], transactions: [{ recurringKey: 'x', date: '2026-04-01' }],
    month: '2026-04', generatedMonthsRepository: repository
  }).status, 'already-generated');
  assert.equal(commands.prepareGeneration({
    templates: [], transactions: [], month: '2026-04', generatedMonthsRepository: repository
  }).status, 'no-additions');
});

test('prepareGeneration rejects invalid month without touching marker repository', () => {
  const calls = [];
  const repository = { add: month => calls.push(['add', month]), remove: month => calls.push(['remove', month]) };
  const result = require('../../../src/application/recurring/recurring-commands.js').prepareGeneration({
    templates: [], transactions: [], month: '2026-4', generatedMonthsRepository: repository
  });
  assert.equal(result.status, 'invalid-month');
  assert.deepEqual(calls, []);
});


test('commitGeneration snapshots before mutating transactions and marker', () => {
  const commands = require('../../../src/application/recurring/recurring-commands.js');
  const transactions = [{ id: 'existing' }];
  const repository = createMarkerRepository();
  const addition = { id: 'new' };
  const events = [];
  const result = commands.commitGeneration({
    additions: [addition], transactions, month: '2026-04',
    generatedMonthsRepository: {
      add(month) { events.push(['marker', month, transactions.includes(addition)]); repository.add(month); }
    },
    beforeMutation() { events.push(['undo', transactions.includes(addition), repository.has('2026-04')]); }
  });
  assert.deepEqual(events, [['undo', false, false], ['marker', '2026-04', true]]);
  assert.equal(result.status, 'committed');
  assert.equal(result.count, 1);
  assert.deepEqual(transactions, [{ id: 'existing' }, addition]);
  assert.deepEqual(repository.values(), ['2026-04']);
});

test('commitGeneration does not mutate when there are no additions', () => {
  const commands = require('../../../src/application/recurring/recurring-commands.js');
  const transactions = [];
  let snapshots = 0;
  const result = commands.commitGeneration({
    additions: [], transactions, month: '2026-04',
    generatedMonthsRepository: createMarkerRepository(),
    beforeMutation() { snapshots++; }
  });
  assert.deepEqual(result, { status: 'no-additions', count: 0 });
  assert.deepEqual(transactions, []);
  assert.equal(snapshots, 0);
});

test('commitGeneration validates its mutation dependencies', () => {
  const commands = require('../../../src/application/recurring/recurring-commands.js');
  assert.throws(() => commands.commitGeneration({
    additions: [{ id: 'new' }], transactions: [], month: '2026-04',
    generatedMonthsRepository: {}
  }), /repository are required/);
});
