/**
 * In-memory adapter for stock/ETF holdings in the legacy application state.
 */
(function exposeStateStockHoldingRepository(root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.StateStockHoldingRepository = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  function create(getState) {
    if (typeof getState !== 'function') throw new TypeError('state provider is required');
    const holdings = () => {
      const state = getState();
      if (!Array.isArray(state.stockHoldings)) state.stockHoldings = [];
      return state.stockHoldings;
    };
    return Object.freeze({
      findAll() { return holdings(); },
      findById(id) { return holdings().find(item => item.id === id) || null; },
      save(holding) {
        if (!holding || !holding.id) throw new TypeError('holding with id is required');
        const current = holdings();
        const index = current.findIndex(item => item.id === holding.id);
        if (index < 0) current.push(holding);
        else current[index] = holding;
        return holding;
      },
      delete(id) {
        const current = holdings();
        const index = current.findIndex(item => item.id === id);
        return index < 0 ? null : current.splice(index, 1)[0];
      },
      deleteByAccount(accountId) {
        const current = holdings();
        const removed = current.filter(item => item.accountId === accountId);
        const remaining = current.filter(item => item.accountId !== accountId);
        getState().stockHoldings = remaining;
        return removed;
      }
    });
  }
  return Object.freeze({ create });
});
