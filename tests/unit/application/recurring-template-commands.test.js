'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { create: createPortAdapter } = require('../../../src/adapters/persistence/state/state-recurring-template-repository.js');
const { create: createCommands } = require('../../../src/application/recurring/recurring-template-commands.js');

function fixture() {
  const state = { recurringTemplates: [
    { id: 'rent', accountId: 'a', label: 'Loyer', amount: 900, enabled: true }
  ] };
  const repository = createPortAdapter(() => state);
  return { state, repository, commands: createCommands({ repository }) };
}

test('save creates a recurring template through the repository', () => {
  const f = fixture();
  const template = { id: 'salary', accountId: 'b', label: 'Salaire', amount: 3000, enabled: true };
  assert.deepEqual(f.commands.save(template), template);
  assert.equal(f.state.recurringTemplates.length, 2);
  assert.equal(f.commands.findById('salary').label, 'Salaire');
});

test('update changes selected fields and preserves the template identity and other values', () => {
  const f = fixture();
  const updated = f.commands.update('rent', { amount: 950, enabled: false });
  assert.deepEqual(updated, {
    id: 'rent', accountId: 'a', label: 'Loyer', amount: 950, enabled: false
  });
  assert.equal(f.state.recurringTemplates.length, 1);
});

test('update and remove return null for unknown templates', () => {
  const f = fixture();
  assert.equal(f.commands.update('missing', { enabled: false }), null);
  assert.equal(f.commands.remove('missing'), null);
  assert.equal(f.state.recurringTemplates.length, 1);
});

test('remove deletes only the selected recurring template', () => {
  const f = fixture();
  assert.equal(f.commands.remove('rent').id, 'rent');
  assert.deepEqual(f.state.recurringTemplates, []);
});

test('save rejects records without an identifier', () => {
  const f = fixture();
  assert.throws(() => f.commands.save({ label: 'Sans identifiant' }), /id is required/);
});

test('commands require a repository implementing the port', () => {
  assert.throws(() => createCommands({ repository: {} }), /repository port is required/);
});
