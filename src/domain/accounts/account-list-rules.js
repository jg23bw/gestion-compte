/**
 * Pure account-list filtering and sorting rules.
 * Display and balance calculations are supplied by the application layer.
 */
(function exposeAccountListRules(root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.AccountListRules = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function filterAndSort({
    accounts = [],
    query = '',
    kind = 'all',
    sort = 'name-asc',
    effectiveType,
    kindLabel,
    bankName,
    balance
  } = {}) {
    if (![effectiveType, kindLabel, bankName, balance].every(value => typeof value === 'function')) {
      throw new TypeError('Account list selectors are required');
    }
    const normalizedQuery = String(query).trim().toLocaleLowerCase('fr');
    const rows = accounts.filter(account =>
      (String(account.name) + ' ' + String(account.short) + ' ' + String(bankName(account)) + ' ' + String(kindLabel(account)))
        .toLocaleLowerCase('fr').includes(normalizedQuery)
      && (kind === 'all' || effectiveType(account) === kind)
    );
    rows.sort((a, b) => {
      if (sort === 'name-desc') return b.name.localeCompare(a.name, 'fr');
      if (sort === 'balance-desc') return balance(b.id) - balance(a.id);
      if (sort === 'balance-asc') return balance(a.id) - balance(b.id);
      if (sort === 'kind') return kindLabel(a).localeCompare(kindLabel(b), 'fr') || a.name.localeCompare(b.name, 'fr');
      return a.name.localeCompare(b.name, 'fr');
    });
    return rows;
  }

  function selectGroups(accounts = [], { effectiveType, investmentType = ['pea', 'cto', 'av'] } = {}) {
    if (typeof effectiveType !== 'function') throw new TypeError('An effective account type selector is required');
    const operational = accounts.filter(account => !investmentType.includes(effectiveType(account)));
    return Object.freeze({
      operational,
      personal: operational.filter(account => effectiveType(account) !== 'pro'),
      professional: operational.filter(account => effectiveType(account) === 'pro'),
      investment: accounts.filter(account => investmentType.includes(effectiveType(account)))
    });
  }

  return Object.freeze({ filterAndSort, selectGroups });
});
