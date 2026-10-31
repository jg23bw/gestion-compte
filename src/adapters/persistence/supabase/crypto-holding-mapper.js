/**
 * Supabase crypto holding row mapping.
 */
(function exposeSupabaseCryptoHoldingMapper(root) {
  'use strict';
  const api = Object.freeze({
    toCloud(holding, userId) {
      return {
        id: holding.id, user_id: userId, symbol: holding.symbol, name: holding.name || holding.symbol,
        coingecko_id: holding.coingeckoId, status: 'Détenu',
        invested: Number(holding.invested) || 0, quantity: Number(holding.quantity) || 0,
        sort_order: Number(holding.sortOrder) || 0, updated_at: new Date().toISOString()
      };
    },
    fromCloud(holding) {
      return {
        id: holding.id, symbol: holding.symbol, name: holding.name || holding.symbol,
        coingeckoId: holding.coingecko_id, invested: Number(holding.invested) || 0,
        quantity: Number(holding.quantity) || 0, sortOrder: Number(holding.sort_order) || 0
      };
    }
  });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.SupabaseCryptoHoldingMapper = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
