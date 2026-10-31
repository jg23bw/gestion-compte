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
          else Object.assign(accounts[index], account);
          return index < 0 ? account : accounts[index];
        },
        delete(id) {
          const accounts = getState().accounts;
          const index = accounts.findIndex(account => account.id === id);
          return index < 0 ? null : accounts.splice(index, 1)[0];
        },
        findPledgeByAccount(id) { return getState().accountPledges?.[id] || null; },
        deletePledgeByAccount(id) {
          const state = getState();
          const pledge = state.accountPledges?.[id] || null;
          if (pledge) {
            const next = { ...state.accountPledges };
            delete next[id];
            state.accountPledges = next;
          }
          return pledge;
        }
      });
    }
  });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.StateAccountRepository = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
