/**
 * Write-side transaction use cases.
 * State changes go through the repository port; UI concerns (undo, rendering,
 * cloud sync flags) remain in the legacy composition layer for now.
 */
(function exposeTransactionCommands(root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.TransactionCommands = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function create({ repository, domain }) {
    if (!repository || !domain) throw new TypeError('repository and domain are required');
    return Object.freeze({
      findById(id) {
        return repository.findById(id);
      },
      save(input) {
        const previous = input.id ? repository.findById(input.id) : null;
        if (previous?.transferId) throw new Error('Un virement doit être modifié avec saveTransfer.');
        const transaction = domain.createTransactionRecord({
          transactions: repository.findAll(),
          previous,
          ...input
        });
        repository.save(transaction);
        return transaction;
      },
      findLinkedTransactions(id) {
        const transaction = repository.findById(id);
        if (!transaction) return [];
        if (!transaction.transferId) return [transaction];
        return repository.findAll().filter(item => item.transferId === transaction.transferId);
      },
      saveTransfer({ id, incomingId, transferId, sourceAccountId, destinationAccountId, date, amount, label, createdAt }) {
        if (!sourceAccountId || !destinationAccountId || sourceAccountId === destinationAccountId) {
          throw new TypeError('Deux comptes différents sont nécessaires pour un virement.');
        }
        if (!repository.findAccount(sourceAccountId) || !repository.findAccount(destinationAccountId)) {
          throw new TypeError('Les deux comptes du virement doivent exister.');
        }
        const parsedAmount = Math.abs(Number(amount));
        if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) throw new TypeError('Le montant du virement doit être supérieur à zéro.');
        const value = Math.round(parsedAmount * 100) / 100;
        if (value <= 0) throw new TypeError('Le montant du virement doit être supérieur à zéro.');
        if (!transferId || !id || !incomingId) throw new TypeError('Les identifiants du virement sont requis.');
        const allTransactions = repository.findAll();
        const linked = allTransactions.filter(item => item.transferId === transferId);
        const previousOutgoing = linked.find(item => item.transferRole === 'outgoing') || null;
        const previousIncoming = linked.find(item => item.transferRole === 'incoming') || null;
        const transactions = allTransactions.filter(item => item.transferId !== transferId);
        const outgoing = domain.createTransactionRecord({
          transactions, previous: previousOutgoing, id,
          accountId: sourceAccountId, date, amount: -value, label, createdAt,
          professionalCategory: null, professionalTreatment: null, professionalAmount: -value
        });
        const incoming = domain.createTransactionRecord({
          transactions, previous: previousIncoming, id: incomingId,
          accountId: destinationAccountId, date, amount: value, label, createdAt,
          professionalCategory: null, professionalTreatment: null, professionalAmount: value
        });
        const isPaid = previousOutgoing?.isPaid === true || previousIncoming?.isPaid === true;
        Object.assign(outgoing, { transferId, transferRole: 'outgoing', transferAccountId: destinationAccountId, isPaid });
        Object.assign(incoming, { transferId, transferRole: 'incoming', transferAccountId: sourceAccountId, isPaid });
        repository.save(outgoing);
        repository.save(incoming);
        return Object.freeze({ transferId, outgoing, incoming });
      },
      remove(id) {
        const transaction = repository.findById(id);
        if (!transaction) return null;
        const linked = transaction.transferId
          ? repository.findAll().filter(item => item.transferId === transaction.transferId)
          : [transaction];
        linked.forEach(item => repository.delete(item.id));
        return transaction;
      },
      setPaid(id, { isPaid, date } = {}) {
        const previous = repository.findById(id);
        if (!previous) return null;
        const linked = previous.transferId
          ? repository.findAll().filter(item => item.transferId === previous.transferId)
          : [previous];
        let updated = null;
        for (const item of linked) {
          const transaction = { ...item, ...(date ? { date } : {}), isPaid: isPaid === true };
          repository.save(transaction);
          if (item.id === id) updated = transaction;
        }
        return updated;
      },
      normalizeOrder(accounts) {
        let changed = 0;
        for (const account of accounts || []) {
          const rows = repository.findAll()
            .filter(transaction => transaction.accountId === account.id)
            .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')) || (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0));
          rows.forEach((transaction, index) => {
            if (!Number.isFinite(Number(transaction.sortOrder)) || transaction.sortOrder === null) {
              repository.save({ ...transaction, sortOrder: index + 1 });
              changed += 1;
            }
          });
        }
        return changed;
      },
      reorder(accountId, orderedIds) {
        const byId = new Map(repository.findAll()
          .filter(transaction => transaction.accountId === accountId)
          .map(transaction => [transaction.id, transaction]));
        const updated = [];
        orderedIds.forEach((id, index) => {
          const previous = byId.get(id);
          if (!previous) return;
          const transaction = { ...previous, sortOrder: index + 1 };
          repository.save(transaction);
          updated.push(transaction);
        });
        return updated;
      }
    });
  }

  return Object.freeze({ create });
});
