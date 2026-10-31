/**
 * Account write use cases. UI validation messages and undo orchestration stay in app.js.
 */
(function exposeAccountCommands(root) {
  const api = Object.freeze({
    create({ repository, isBankKey, accountShort }) {
      const repo = typeof AccountRepositoryPort !== 'undefined'
        ? AccountRepositoryPort.assert(repository)
        : require('../../ports/accounts/account-repository.js').assert(repository);
      if (typeof isBankKey !== 'function' || typeof accountShort !== 'function') {
        throw new TypeError('account selectors are required');
      }
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
        }
      });
    }
  });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.AccountCommands = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
