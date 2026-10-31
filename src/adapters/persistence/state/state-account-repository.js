/**
 * In-memory account repository backed by the legacy application state.
 */
(function exposeStateAccountRepository(root) {
  const api = Object.freeze({
    create(getState) {
      if (typeof getState !== 'function') throw new TypeError('state provider is required');
      return Object.freeze({
        findAll() { return getState().accounts; },
        findById(id) { return getState().accounts.find(account => account.id === id) || null; },
        save(account) {
          if (!account || !account.id) throw new TypeError('account with id is required');
          const accounts = getState().accounts;
          const index = accounts.findIndex(item => item.id === account.id);
          if (index < 0) accounts.push(account);
          else accounts[index] = account;
          return account;
        }
      });
    }
  });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.StateAccountRepository = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
