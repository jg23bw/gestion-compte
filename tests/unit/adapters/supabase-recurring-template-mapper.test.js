'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const mapper = require('../../../src/adapters/persistence/supabase/recurring-template-mapper.js');
test('maps recurring templates to the existing Supabase schema and back', () => {
  const row = mapper.toCloud({ id: 't1', accountId: 'a1', day: 5, frequency: 'monthly', months: [1], label: 'Loyer', amount: '', enabled: true }, 'u1');
  assert.equal(row.account_id, 'a1'); assert.equal(row.user_id, 'u1'); assert.equal(row.amount, null);
  assert.deepEqual(mapper.fromCloud(row), { id: 't1', accountId: 'a1', day: 5, frequency: 'monthly', months: [1], startMonth: undefined, endMonth: undefined, date: undefined, label: 'Loyer', amount: null, professionalCategory: null, professionalTreatment: null, enabled: true });
});

test('round-trips explicit VAT provision metadata on recurring templates', () => {
  const row = mapper.toCloud({
    id: 't2', accountId: 'pro', day: 10, frequency: 'monthly', months: [],
    label: 'Autre libellé', amount: -320, professionalCategory: 'vat',
    professionalTreatment: 'provision', enabled: true
  }, 'u1');
  assert.equal(row.professional_category, 'vat');
  assert.equal(row.professional_treatment, 'provision');
  const template = mapper.fromCloud(row);
  assert.equal(template.professionalCategory, 'vat');
  assert.equal(template.professionalTreatment, 'provision');
});
