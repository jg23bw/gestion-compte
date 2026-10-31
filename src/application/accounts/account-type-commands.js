/**
 * Application facade for account subtype metadata rules.
 * Auth persistence remains behind the existing auth-metadata repository.
 */
(function exposeAccountTypeCommands(root) {
  'use strict';
  const api = Object.freeze({
    create({ rules } = {}) {
      const domain = rules || (typeof AccountTypeRules !== 'undefined'
        ? AccountTypeRules : require('../../domain/accounts/account-type-rules.js'));
      const methods = ['isSubtype', 'normalize', 'overrides', 'typeFor', 'applyOverrides', 'hasOverrides'];
      if (!domain || methods.some(method => typeof domain[method] !== 'function')) {
        throw new TypeError('account type rules are required');
      }
      return Object.freeze({
        isSubtype: value => domain.isSubtype(value),
        normalize: value => domain.normalize(value),
        overrides: accounts => domain.overrides(accounts),
        typeFor: (kind, override) => domain.typeFor(kind, override),
        applyOverrides: (accounts, value) => domain.applyOverrides(accounts, value),
        hasOverrides: accounts => domain.hasOverrides(accounts)
      });
    }
  });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.AccountTypeCommands = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
