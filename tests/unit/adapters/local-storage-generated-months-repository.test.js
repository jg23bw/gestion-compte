'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const port = require('../../../src/ports/recurring/generated-months-repository.js');
const { create } = require('../../../src/adapters/persistence/local-storage/generated-months-repository.js');

function memoryStorage(initial = null) {
  let value = initial;
  return {
    getItem() { return value; },
    setItem(key, next) { value = String(next); },
    removeItem() { value = null; },
    raw() { return value; }
  };
}

test('local storage adapter satisfies generated months repository port', () => {
  assert.equal(port.isGeneratedMonthsRepository(create(memoryStorage(), 'months')), true);
});

test('list returns an empty list for missing, malformed or non-array data', () => {
  assert.deepEqual(create(memoryStorage(null), 'months').list(), []);
  assert.deepEqual(create(memoryStorage('{bad json'), 'months').list(), []);
  assert.deepEqual(create(memoryStorage('{}'), 'months').list(), []);
});

test('add is idempotent and remove only removes the requested month', () => {
  const storage = memoryStorage('["2026-01"]');
  const repository = create(storage, 'months');
  repository.add('2026-02');
  repository.add('2026-02');
  assert.deepEqual(repository.list(), ['2026-01', '2026-02']);
  repository.remove('2026-01');
  assert.deepEqual(repository.list(), ['2026-02']);
});

test('raw snapshot can be restored exactly for undo, including a missing key', () => {
  const storage = memoryStorage('["2026-01"]');
  const repository = create(storage, 'months');
  const snapshot = repository.getRaw();
  repository.add('2026-02');
  repository.restoreRaw(snapshot);
  assert.equal(storage.raw(), '["2026-01"]');
  repository.restoreRaw(null);
  assert.equal(storage.raw(), null);
});

test('storage read and write failures do not break marker reads or writes', () => {
  const storage = {
    getItem() { throw new Error('unavailable'); },
    setItem() { throw new Error('quota'); },
    removeItem() { throw new Error('unavailable'); }
  };
  const repository = create(storage, 'months');
  assert.deepEqual(repository.list(), []);
  assert.deepEqual(repository.add('2026-01'), ['2026-01']);
  assert.throws(() => repository.restoreRaw(null), /unavailable/);
});

test('adapter validates its dependencies', () => {
  assert.throws(() => create(null, 'months'), /Storage-compatible/);
  assert.throws(() => create(memoryStorage(), ''), /key is required/);
});
