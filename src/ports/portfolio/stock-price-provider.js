(function exposeStockPriceProviderPort(root) {
  const api = Object.freeze({
    assert(provider) {
      if (!provider || typeof provider.getPrice !== 'function') throw new TypeError('stock price provider port is required');
      return provider;
    }
  });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.StockPriceProviderPort = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
