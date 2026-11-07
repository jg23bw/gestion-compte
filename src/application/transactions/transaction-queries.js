/**
 * Read-side transaction use cases.
 * Depends only on the repository port and pure domain rules.
 */
(function exposeTransactionQueries(root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.TransactionQueries = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function sortDisplayRows(rows, sort, domain) {
    return rows.slice().sort((a, b) => {
      const pendingFirst = Number(a.isPaid === true) - Number(b.isPaid === true);
      if (pendingFirst) return pendingFirst;
      if (sort === 'date-asc') return a.date.localeCompare(b.date) || a.createdAt - b.createdAt;
      if (sort === 'date-desc') return b.date.localeCompare(a.date) || b.createdAt - a.createdAt;
      if (sort === 'label') return a.label.localeCompare(b.label, 'fr');
      if (sort === 'amount-asc') return Number(a.amount) - Number(b.amount);
      if (sort === 'amount-desc') return Number(b.amount) - Number(a.amount);
      return domain.transactionOrder(a, b);
    });
  }

  function projection(startingBalance, futureTransactions, amountOf) {
    let balance = Number(startingBalance) || 0;
    let lowestBalance = balance;
    let lowestDate = null;
    const ordered = futureTransactions.slice().sort((a, b) =>
      a.date.localeCompare(b.date) || Number(a.createdAt || 0) - Number(b.createdAt || 0)
    );
    for (const transaction of ordered) {
      balance += Number(amountOf(transaction)) || 0;
      if (balance < lowestBalance) {
        lowestBalance = balance;
        lowestDate = transaction.date;
      }
    }
    return Object.freeze({
      endingBalance: balance,
      lowestBalance,
      lowestDate,
      futureCount: ordered.length
    });
  }

  function create({ repository, domain }) {
    if (!repository || !domain) throw new TypeError('repository and domain are required');
    return Object.freeze({
      monthlyHistory({ month, accountFilter = 'all', typeFilter = 'all', query = '', sort = 'date-asc' } = {}) {
        const normalizedQuery = String(query).trim().toLocaleLowerCase('fr');
        const monthTransactions = repository.findAll().filter(item => String(item.date || '').slice(0, 7) === month);
        const transferGroups = new Map();
        const ordinaryRows = [];
        for (const transaction of monthTransactions) {
          if (!transaction.transferId) { ordinaryRows.push(transaction); continue; }
          if (!transferGroups.has(transaction.transferId)) transferGroups.set(transaction.transferId, []);
          transferGroups.get(transaction.transferId).push(transaction);
        }
        const transferRows = [...transferGroups.entries()].map(([transferId, linked]) => {
          const outgoing = linked.find(item => item.transferRole === 'outgoing') || linked[0];
          const incoming = linked.find(item => item.transferRole === 'incoming') || null;
          const sourceName = repository.findAccount(outgoing.accountId)?.name || 'Compte supprimé';
          const destinationId = outgoing.transferAccountId || incoming?.accountId;
          const destinationName = repository.findAccount(destinationId)?.name || 'Compte supprimé';
          return {
            ...outgoing, id: 'transfer:' + transferId, amount: Math.abs(Number(outgoing.amount)),
            displayAccountName: sourceName + ' → ' + destinationName,
            displayLabel: outgoing.label || 'Virement', isTransfer: true,
            isPaid: linked.length > 1 ? linked.every(item => item.isPaid === true) : outgoing.isPaid === true,
            transferSourceAccountId: outgoing.accountId, transferDestinationAccountId: destinationId
          };
        });
        const rows = [...ordinaryRows, ...transferRows].filter(transaction => {
          const isTransfer = transaction.isTransfer === true, amount = Number(transaction.amount);
          const accountName = transaction.displayAccountName || repository.findAccount(transaction.accountId)?.name || '';
          const accountMatches = accountFilter === 'all' || transaction.accountId === accountFilter
            || (isTransfer && transaction.transferDestinationAccountId === accountFilter);
          const typeMatches = typeFilter === 'all' || (typeFilter === 'transfer' && isTransfer)
            || (typeFilter === 'income' && !isTransfer && amount >= 0)
            || (typeFilter === 'expense' && !isTransfer && amount < 0);
          const searchable = (transaction.displayLabel || transaction.label || '') + ' ' + accountName;
          return accountMatches && typeMatches && searchable.toLocaleLowerCase('fr').includes(normalizedQuery);
        });
        rows.sort((a, b) => {
          if (sort === 'date-desc') return b.date.localeCompare(a.date) || Number(b.createdAt || 0) - Number(a.createdAt || 0);
          if (sort === 'label') return String(a.displayLabel || a.label || '').localeCompare(String(b.displayLabel || b.label || ''), 'fr');
          if (sort === 'amount-asc') return Number(a.amount) - Number(b.amount);
          if (sort === 'amount-desc') return Number(b.amount) - Number(a.amount);
          if (sort === 'account') return String(a.displayAccountName || repository.findAccount(a.accountId)?.name || '').localeCompare(String(b.displayAccountName || repository.findAccount(b.accountId)?.name || ''), 'fr') || a.date.localeCompare(b.date);
          return a.date.localeCompare(b.date) || Number(a.createdAt || 0) - Number(b.createdAt || 0);
        });
        const ordinary = rows.filter(item => item.isTransfer !== true);
        const incoming = ordinary.filter(item => Number(item.amount) > 0).reduce((sum, item) => sum + Number(item.amount), 0);
        const outgoing = ordinary.filter(item => Number(item.amount) < 0).reduce((sum, item) => sum + Number(item.amount), 0);
        return Object.freeze({ rows, incoming, outgoing, net: incoming + outgoing });
      },
      listAccountTransactions(accountId) {
        return domain.sortAccountTransactions(repository.findByAccount(accountId), accountId);
      },
      filterAccountTransactions({ accountId, typeFilter = 'all', query = '', sort = 'date-desc' } = {}) {
        const normalizedQuery = String(query).trim().toLocaleLowerCase('fr');
        const rows = repository.findAll().filter(transaction => {
          if (transaction.accountId !== accountId) return false;
          const account = repository.findAccount(transaction.accountId);
          const accountName = account?.name || '';
          const amount = Number(transaction.amount);
          const isTransfer = Boolean(transaction.transferId);
          const peerAccount = isTransfer ? repository.findAccount(transaction.transferAccountId) : null;
          const typeMatches = typeFilter === 'all' || (typeFilter === 'transfer' && isTransfer)
            || (typeFilter === 'income' && !isTransfer && amount >= 0)
            || (typeFilter === 'expense' && !isTransfer && amount < 0);
          return typeMatches
            && (String(transaction.label || '') + ' ' + accountName + ' ' + (peerAccount?.name || '')).toLocaleLowerCase('fr').includes(normalizedQuery);
        });
        return sortDisplayRows(rows, sort, domain);
      },
      accountTransactionDisplayRows({ accountId, typeFilter = 'all', query = '', sort = 'date-desc' } = {}) {
        const account = repository.findAccount(accountId);
        const ordered = domain.sortAccountTransactions(repository.findByAccount(accountId), accountId);
        const positions = new Map();
        const balances = new Map();
        let balance = Number(account?.opening || 0);
        ordered.forEach((transaction, position) => {
          positions.set(transaction.id, position);
          balance += Number(transaction.amount);
          balances.set(transaction.id, balance);
        });
        return this.filterAccountTransactions({ accountId, typeFilter, query, sort }).map(transaction => ({
          transaction,
          balance: account ? balances.get(transaction.id) ?? 0 : 0,
          position: positions.get(transaction.id) ?? -1,
          accountTransactionCount: ordered.length
        }));
      },
      balanceAt(accountId, untilDate = null) {
        const account = repository.findAccount(accountId);
        if (!account) return 0;
        return domain.balanceAt(account.opening, repository.findByAccount(accountId), untilDate);
      },
      balanceAfterTransaction(transaction) {
        if (!transaction) return 0;
        const account = repository.findAccount(transaction.accountId);
        if (!account) return 0;
        let balance = Number(account.opening || 0);
        for (const item of domain.sortAccountTransactions(
          repository.findByAccount(transaction.accountId),
          transaction.accountId
        )) {
          balance += Number(item.amount);
          if (item.id === transaction.id) break;
        }
        return balance;
      },
      projectAccountBalance(accountId, asOfDate) {
        const account = repository.findAccount(accountId);
        if (!account) return projection(0, [], () => 0);
        const transactions = repository.findByAccount(accountId);
        const startingBalance = domain.balanceAt(account.opening, transactions, asOfDate);
        return projection(startingBalance, transactions.filter(item => item.date > asOfDate), item => item.amount);
      },
      professionalAdjustedBalanceAt(accountId, untilDate) {
        const account = repository.findAccount(accountId);
        if (!account) return 0;
        return domain.professionalAdjustedBalanceAt(
          account,
          repository.findByAccount(accountId),
          repository.findRecurringTemplates(),
          untilDate
        );
      },
      projectProfessionalAdjustedBalance(accountId, asOfDate) {
        const account = repository.findAccount(accountId);
        if (!account) return projection(0, [], () => 0);
        const transactions = repository.findByAccount(accountId);
        const templates = repository.findRecurringTemplates();
        const startingBalance = domain.professionalAdjustedBalanceAt(account, transactions, templates, asOfDate);
        return projection(
          startingBalance,
          transactions.filter(item => item.date > asOfDate),
          item => domain.professionalAdjustedDelta(item, templates)
        );
      },
      professionalAdjustedBalanceAfterTransaction(transaction) {
        if (!transaction) return 0;
        const account = repository.findAccount(transaction.accountId);
        if (!account) return 0;
        return domain.professionalAdjustedBalanceAfterTransaction(
          account,
          repository.findByAccount(transaction.accountId),
          repository.findRecurringTemplates(),
          transaction.id
        );
      }
    });
  }

  return Object.freeze({ create });
});
