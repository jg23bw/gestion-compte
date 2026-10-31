'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { dueDateForTemplate } = require('../../../src/domain/recurring/recurring-rules.js');

test('monthly recurrence clamps its due day to the last day of the month', () => {
  assert.equal(dueDateForTemplate({ frequency: 'monthly', day: 31 }, '2026-04'), '2026-04-30');
  assert.equal(dueDateForTemplate({ frequency: 'monthly', day: 31 }, '2024-02'), '2024-02-29');
  assert.equal(dueDateForTemplate({ frequency: 'monthly', day: 31 }, '2025-02'), '2025-02-28');
});

test('monthly recurrence respects inclusive start and end months', () => {
  const template = { frequency: 'monthly', day: 15, startMonth: '2026-03', endMonth: '2026-05' };
  assert.equal(dueDateForTemplate(template, '2026-02'), null);
  assert.equal(dueDateForTemplate(template, '2026-03'), '2026-03-15');
  assert.equal(dueDateForTemplate(template, '2026-05'), '2026-05-15');
  assert.equal(dueDateForTemplate(template, '2026-06'), null);
});

test('quarterly and annual recurrences only run in configured months', () => {
  const quarterly = { frequency: 'quarterly', day: 10, months: [1, 4, 7, 10] };
  assert.equal(dueDateForTemplate(quarterly, '2026-04'), '2026-04-10');
  assert.equal(dueDateForTemplate(quarterly, '2026-05'), null);
  const annual = { frequency: 'annual', day: 3, months: [9] };
  assert.equal(dueDateForTemplate(annual, '2026-09'), '2026-09-03');
  assert.equal(dueDateForTemplate(annual, '2026-10'), null);
});

test('one-off recurrence is emitted only in its exact month and day', () => {
  const template = { frequency: 'once', date: '2026-11-07', day: 7 };
  assert.equal(dueDateForTemplate(template, '2026-11'), '2026-11-07');
  assert.equal(dueDateForTemplate(template, '2026-10'), null);
});

test('unknown frequency and invalid month are rejected', () => {
  assert.equal(dueDateForTemplate({ frequency: 'weekly', day: 1 }, '2026-01'), null);
  assert.equal(dueDateForTemplate({ frequency: 'monthly', day: 1 }, '2026-13'), null);
  assert.equal(dueDateForTemplate({ frequency: 'monthly', day: 1 }, '2026-1'), null);
});
