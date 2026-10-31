/**
 * Pure rules for account subtype metadata stored in Supabase Auth.
 * Investment account subtypes remain overrides; persisted account kinds are unchanged.
 */
(function exposeAccountTypeRules(root) {
  'use strict';
  const SUBTYPES = Object.freeze(['pea', 'av', 'cto']);
  const ACCOUNT_TYPES = Object.freeze(['bank', 'savings', 'pro', 'pea', 'av', 'cto']);
  function isAccountType(value) { return ACCOUNT_TYPES.includes(String(value || '')); }
  function effectiveType(account) {
    const type = account?.accountType || account?.kind || 'bank';
    return isAccountType(type) ? type : 'bank';
  }
  function isSubtype(value) {
    return SUBTYPES.includes(String(value || ''));
  }
  function normalize(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    const result = {};
    for (const [id, type] of Object.entries(value)) {
      if (id && isSubtype(type)) result[id] = type;
    }
    return result;
  }
  function overrides(accounts = []) {
    const result = {};
    for (const account of accounts || []) {
      if (!account || !account.id) continue;
      const type = account.accountType || account.kind;
      if (isSubtype(type) && type !== account.kind) result[account.id] = type;
    }
    return result;
  }
  function typeFor(kind, override) {
    return isSubtype(override) ? override : (kind || 'bank');
  }
  function applyOverrides(accounts = [], value = {}) {
    const normalized = normalize(value);
    return (accounts || []).map(account => ({
      ...account,
      accountType: normalized[account.id] || account.accountType || account.kind
    }));
  }
  function hasOverrides(accounts = []) {
    return Object.keys(overrides(accounts)).length > 0;
  }
  const api = Object.freeze({ SUBTYPES, ACCOUNT_TYPES, isAccountType, effectiveType, isSubtype, normalize, overrides, typeFor, applyOverrides, hasOverrides });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.AccountTypeRules = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
