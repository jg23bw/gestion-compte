(function exposeCryptoCatalogProviderPort(root) {
  const api = Object.freeze({
    assert(provider) {
      if (!provider || typeof provider.searchCoins !== 'function') throw new TypeError('crypto catalog provider port is required');
      return provider;
    }
  });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.CryptoCatalogProviderPort = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
