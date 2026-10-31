/**
 * Stock/ETF holding metadata use cases. Persistence is injected through Auth metadata port.
 */
(function exposeStockHoldingMetadataCommands(root) {
  'use strict';
  const api = Object.freeze({
    create({ rules }) {
      const domain = rules || (typeof StockHoldingRules !== 'undefined'
        ? StockHoldingRules : require('../../domain/portfolio/stock-holding-rules.js'));
      if (!domain || typeof domain.normalize !== 'function') throw new TypeError('Stock holding rules are required');
      return Object.freeze({
        normalize(value) { return domain.normalize(value); },
        normalizeCurrency(value) { return domain.normalizeCurrency(value); },
        fromMetadata(metadata) { return domain.normalize(metadata?.stockHoldings); },
        async save({ user, metadataRepository, holdings }) {
          if (!user || !user.id) throw new Error('Connectez-vous pour enregistrer les positions actions.');
          if (!metadataRepository || typeof metadataRepository.update !== 'function') {
            throw new TypeError('auth metadata repository is required');
          }
          const normalized = domain.normalize(holdings);
          await metadataRepository.update({ stockHoldings: normalized });
          return normalized;
        }
      });
    }
  });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.StockHoldingMetadataCommands = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
