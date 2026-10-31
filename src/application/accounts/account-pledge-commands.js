/**
 * Account pledge use cases. Persistence is provided by the account repository port.
 */
(function exposeAccountPledgeCommands(root) {
  'use strict';
  const api = Object.freeze({
    create({ repository, rules }) {
      if (!repository || typeof repository.findById !== 'function'
        || typeof repository.findPledgeByAccount !== 'function'
        || typeof repository.findAllPledges !== 'function'
        || typeof repository.savePledge !== 'function'
        || typeof repository.deletePledgeByAccount !== 'function') {
        throw new TypeError('account repository is required');
      }
      const domain = rules || (typeof AccountPledgeRules !== 'undefined'
        ? AccountPledgeRules : require('../../domain/accounts/account-pledge-rules.js'));
      if (typeof domain.normalize !== 'function' || typeof domain.forAccounts !== 'function') {
        throw new TypeError('account pledge rules are required');
      }
      return Object.freeze({
        find(accountId) { return repository.findPledgeByAccount(accountId); },
        normalize(value) { return domain.normalize(value); },
        overrides(accounts) { return domain.forAccounts(repository.findAllPledges(), accounts); },
        save({ accountId, pledged, note = '' }) {
          if (!repository.findById(accountId)) throw new Error('account no longer exists');
          if (!pledged) return repository.deletePledgeByAccount(accountId);
          const normalized = domain.normalize({ [accountId]: { note } })[accountId];
          return repository.savePledge(accountId, normalized);
        }
      });
    }
  });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.AccountPledgeCommands = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
