/**
 * Application use cases for stock/ETF holding mutations and queries.
 */
(function exposeStockHoldingCommands(root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.StockHoldingCommands = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  function create({ repository }) {
    const repo = typeof StockHoldingRepositoryPort !== 'undefined'
      ? StockHoldingRepositoryPort.assert(repository)
      : require('../../ports/portfolio/stock-holding-repository.js').assert(repository);
    return Object.freeze({
      findAll() { return repo.findAll(); },
      findById(id) { return repo.findById(id); },
      save(holding) { return repo.save(holding); },
      delete(id) { return repo.delete(id); },
      deleteByAccount(accountId) { return repo.deleteByAccount(accountId); }
    });
  }
  return Object.freeze({ create });
});
