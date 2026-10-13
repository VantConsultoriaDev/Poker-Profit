// Legacy expenses originated in Fechamentos before Financeiro supported expenses.
export function bankrollDebit(transaction: any): number {
  const description = String(transaction.description || '').trim();
  if (transaction.type === 'withdraw' && !description.startsWith('FECHAMENTO'))
    return Number(transaction.amount_brl || 0);
  if (transaction.type === 'expense' && transaction.affects_bankroll !== false)
    return Number(transaction.amount_brl || 0);
  return 0;
}
