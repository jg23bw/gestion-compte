/**
 * Pure normalization and filtering rules for account pledge metadata.
 */
(function exposeAccountPledgeRules(root) {
  'use strict';
  const MAX_NOTE_LENGTH = 160;
  function normalize(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    const result = {};
    for (const [id, entry] of Object.entries(value)) {
      if (!id) continue;
      if (entry === true) {
        result[id] = { note: '' };
        continue;
      }
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) continue;
      result[id] = { note: String(entry.note || '').trim().slice(0, MAX_NOTE_LENGTH) };
    }
    return result;
  }
  function forAccounts(value, accounts) {
    const result = normalize(value);
    const accountIds = new Set((accounts || []).map(account => account.id));
    for (const id of Object.keys(result)) if (!accountIds.has(id)) delete result[id];
    return result;
  }
  return expose(root, { normalize, forAccounts, MAX_NOTE_LENGTH });
  function expose(target, api) {
    if (typeof module !== 'undefined' && module.exports) module.exports = Object.freeze(api);
    if (target) target.AccountPledgeRules = Object.freeze(api);
    return api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
