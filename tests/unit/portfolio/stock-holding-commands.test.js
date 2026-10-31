const test = require('node:test');
const assert = require('node:assert/strict');
const Port = require('../../../src/ports/portfolio/stock-holding-repository.js');
const StateRepository = require('../../../src/adapters/persistence/state/state-stock-holding-repository.js');
const Commands = require('../../../src/application/portfolio/stock-holding-commands.js');

function setup(initial = []) {
  const state = { stockHoldings: initial };
  const repository = StateRepository.create(() => state);
  return { state, commands: Commands.create({ repository }) };
}

test('lists holdings and finds a holding by id', () => {
  const first = { id: 'a', symbol: 'AAPL' };
  const { commands } = setup([first]);
  assert.deepEqual(commands.findAll(), [first]);
  assert.equal(commands.findById('a'), first);
  assert.equal(commands.findById('missing'), null);
});

test('saves new holdings and replaces existing holdings', () => {
  const first = { id: 'a', symbol: 'AAPL' };
  const { state, commands } = setup([first]);
  const updated = { id: 'a', symbol: 'AAPL', quantity: 2 };
  const added = { id: 'b', symbol: 'MSFT' };
  commands.save(updated);
  commands.save(added);
  assert.deepEqual(state.stockHoldings, [updated, added]);
});

test('deletes by id', () => {
  const first = { id: 'a' };
  const { state, commands } = setup([first]);
  assert.equal(commands.delete('a'), first);
  assert.equal(commands.delete('missing'), null);
  assert.deepEqual(state.stockHoldings, []);
});

test('deletes holdings by account and preserves other accounts', () => {
  const removed = { id: 'a', accountId: 'pea' };
  const retained = { id: 'b', accountId: 'cto' };
  const { state, commands } = setup([removed, retained]);
  assert.deepEqual(commands.deleteByAccount('pea'), [removed]);
  assert.deepEqual(state.stockHoldings, [retained]);
});

test('validates the repository and saved holding', () => {
  assert.throws(() => Port.assert({}), /port is required/);
  const { commands } = setup();
  assert.throws(() => commands.save({ symbol: 'AAPL' }), /id is required/);
});
