/**
 * Account write use cases. UI validation messages and undo orchestration stay in app.js.
 */
(function exposeAccountCommands(root) {
  const api = Object.freeze({
    create({ repository, isBankKey, accountShort, transactionRepository, recurringTemplateRepository, stockHoldingCommands }) {
      const repo = typeof AccountRepositoryPort !== 'undefined'
        ? AccountRepositoryPort.assert(repository)
        : require('../../ports/accounts/account-repository.js').assert(repository);
      if (typeof isBankKey !== 'function' || typeof accountShort !== 'function') {
        throw new TypeError('account selectors are required');
      }
      if (!transactionRepository || typeof transactionRepository.findByAccount !== 'function'
        || typeof transactionRepository.delete !== 'function') throw new TypeError('transaction repository is required');
      if (!recurringTemplateRepository || typeof recurringTemplateRepository.findAll !== 'function'
        || typeof recurringTemplateRepository.delete !== 'function') throw new TypeError('recurring template repository is required');
      if (!stockHoldingCommands || typeof stockHoldingCommands.findAll !== 'function'
        || typeof stockHoldingCommands.deleteByAccount !== 'function') throw new TypeError('stock holding commands are required');
      return Object.freeze({
        save({ id, name, accountType, bank, opening = 0, existing = null }) {
          const normalizedName = String(name || '').trim();
          const types = ['bank', 'savings', 'pro', 'pea', 'av', 'cto'];
          if (!normalizedName) throw new TypeError('account name is required');
          if (!types.includes(accountType)) throw new TypeError('invalid account type');
          if (!isBankKey(bank)) throw new TypeError('invalid bank');
          const current = existing ? repo.findById(existing.id) : null;
          if (existing && !current) throw new Error('account no longer exists');
          const accountId = current?.id || id;
          if (!accountId) throw new TypeError('account id is required');
          const kind = ['pea', 'av', 'cto'].includes(accountType) ? 'savings' : accountType;
          const account = {
            ...(current || {}),
            id: accountId,
            name: normalizedName,
            short: accountShort(normalizedName),
            bank,
            kind,
            accountType,
            opening: Number(opening) || 0,
            ...(current ? {} : { vatRate: 20, socialRate: 45, netOpening: 0 })
          };
          return repo.save(account);
        },
        remove(id) {
          const account = repo.findById(id);
          if (!account) return null;
          const transactions = transactionRepository.findByAccount(id);
          const templates = recurringTemplateRepository.findAll().filter(item => item.accountId === id);
          const stockHoldings = stockHoldingCommands.findAll().filter(item => item.accountId === id);
          const pledge = repo.findPledgeByAccount(id);
          for (const transaction of transactions) transactionRepository.delete(transaction.id);
          for (const template of templates) recurringTemplateRepository.delete(template.id);
          const removedStockHoldings = stockHoldingCommands.deleteByAccount(id);
          const removedPledge = repo.deletePledgeByAccount(id);
          const removedAccount = repo.delete(id);
          return {
            account: removedAccount,
            transactions,
            templates,
            stockHoldings: removedStockHoldings || stockHoldings,
            pledge: removedPledge || pledge
          };
        }
      });
    }
  });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.AccountCommands = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
