/**
 * Legacy localStorage state reader used only for the explicit cloud migration flow.
 * The authenticated Supabase state remains the source of truth.
 */
(function exposeLegacyStateLoader(root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.LegacyStateLoader = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  function create({ storage, storageKey, defaultAccounts, bankKeyForAccount, normalizeStockHoldings, normalizeAccountPledges }) {
    if (!storage || typeof storage.getItem !== 'function') throw new TypeError('storage is required');
    if (!storageKey || !Array.isArray(defaultAccounts)) throw new TypeError('storage key and default accounts are required');
    return Object.freeze({
      load() {
        try {
          const saved = JSON.parse(storage.getItem(storageKey));
          if (saved && Array.isArray(saved.accounts) && Array.isArray(saved.transactions)) {
            const accounts = saved.accounts.map(account => {
              const merged = { ...account, ...(defaultAccounts.find(item => item.id === account.id) || {}), ...account };
              if (merged.id === 'cic-montevrayn' && merged.name === 'CIC Montévrayn') merged.name = 'CIC Montévrain';
              merged.bank = bankKeyForAccount(merged);
              return merged;
            });
            const recurringTemplates = Array.isArray(saved.recurringTemplates)
              ? saved.recurringTemplates.map(template => ({ ...template })) : [];
            defaultAccounts.forEach(account => {
              if (!accounts.some(item => item.id === account.id)) accounts.push({ ...account });
            });
            return {
              accounts, transactions: saved.transactions, recurringTemplates,
              stockHoldings: normalizeStockHoldings(saved.stockHoldings || []),
              accountPledges: normalizeAccountPledges(saved.accountPledges || {}),
              lombardCredit: saved.lombardCredit || null
            };
          }
        } catch (error) {
          // The previous loader deliberately treated malformed legacy data as absent.
        }
        return {
          accounts: defaultAccounts.map(account => ({ ...account })),
          transactions: [], recurringTemplates: [], cryptoHoldings: [], stockHoldings: [],
          accountPledges: {}, lombardCredit: null
        };
      }
    });
  }
  return Object.freeze({ create });
});
