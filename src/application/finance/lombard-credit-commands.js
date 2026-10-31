/**
 * Lombard credit use cases. Auth metadata persistence is injected by the caller.
 */
(function exposeLombardCreditCommands(root) {
  'use strict';
  const api = Object.freeze({
    create({ rules } = {}) {
      const domain = rules || (typeof LombardCreditRules !== 'undefined'
        ? LombardCreditRules : require('../../domain/finance/lombard-credit-rules.js'));
      if (!domain || typeof domain.normalize !== 'function') throw new TypeError('Lombard credit rules are required');
      return Object.freeze({
        normalize(value) { return domain.normalize(value); },
        fromMetadata(metadata) { return domain.normalize(metadata?.lombardCredit); },
        async save({ user, metadataRepository, credit }) {
          if (!user || !user.id) throw new Error('Connectez-vous pour enregistrer le crédit lombard.');
          if (!metadataRepository || typeof metadataRepository.update !== 'function') {
            throw new TypeError('auth metadata repository is required');
          }
          const normalized = domain.normalize(credit);
          await metadataRepository.update({ lombardCredit: normalized });
          return normalized;
        }
      });
    }
  });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.LombardCreditCommands = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
