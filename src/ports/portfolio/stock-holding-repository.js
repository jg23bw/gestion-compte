/**
 * Port for stock/ETF holding persistence.
 */
(function exposeStockHoldingRepositoryPort(root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.StockHoldingRepositoryPort = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const methods = ['findAll', 'findById', 'save', 'delete', 'deleteByAccount'];
  function assert(repository) {
    if (!repository || methods.some(method => typeof repository[method] !== 'function')) {
      throw new TypeError('stock holding repository port is required');
    }
    return repository;
  }
  return Object.freeze({ assert });
});
