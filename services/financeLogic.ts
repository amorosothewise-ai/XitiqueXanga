import { Transaction, TransactionType, Xitique, Participant } from '../types';

/**
 * CORE PRINCIPLE: All balances must be derived from transactions.
 * Never rely on a stored 'currentBalance' property.
 */
export const calculateBalance = (transactions: Transaction[]): number => {
  if (!transactions) return 0;
  
  return transactions.reduce((acc, tx) => {
    switch (tx.type) {
      case TransactionType.DEPOSIT:
        return acc + tx.amount;
      case TransactionType.WITHDRAWAL:
        // Money leaving the system (Individual)
        return acc - tx.amount;
      case TransactionType.PAYOUT: 
        // Money leaving the system (Group Payout)
        return acc - tx.amount; 
      case TransactionType.PAYOUT_REVERSAL:
        // A correction that cancels a previous payout.
        return acc + tx.amount;
      default:
        return acc;
    }
  }, 0);
};

/**
 * Calculates the Total Pot for a single rotation cycle.
 * Handles the "Exception Handling" rule where contributions might differ.
 */
export const calculateCyclePot = (baseAmount: number, participants: Participant[]): number => {
    return participants.reduce((sum, p) => {
        return sum + (p.customContribution !== undefined ? p.customContribution : baseAmount);
    }, 0);
};

/**
 * Validates if a transaction can occur based on business rules.
 */
export const validateTransaction = (
  xitique: Xitique, 
  type: TransactionType, 
  amount: number
): { valid: boolean; error?: string } => {
  
  if (amount <= 0) {
    return { valid: false, error: "Amount must be positive." };
  }

  const currentBalance = calculateBalance(xitique.transactions);

  if (type === TransactionType.WITHDRAWAL) {
    if (currentBalance < amount) {
      return { valid: false, error: "Insufficient funds." };
    }
  }

  return { valid: true };
};

/**
 * Creates a standard transaction object to ensure data integrity.
 */
export const createTransaction = (
  type: TransactionType,
  amount: number,
  description: string,
  referenceId?: string
): Transaction => {
  return {
    id: crypto.randomUUID(),
    date: new Date().toISOString(),
    type,
    amount,
    description,
    referenceId
  };
};