
import { Transaction, TransactionType, Xitique, Participant } from '../types';

/**
 * CORE PRINCIPLE: All balances must be derived from transactions.
 */
export const calculateBalance = (transactions: Transaction[]): number => {
  if (!transactions) return 0;
  
  return transactions.reduce((acc, tx) => {
    switch (tx.type) {
      case TransactionType.DEPOSIT:
        return acc + tx.amount;
      case TransactionType.WITHDRAWAL:
        return acc - tx.amount;
      case TransactionType.PAYOUT: 
        return acc - tx.amount; 
      case TransactionType.PAYOUT_REVERSAL:
        return acc + tx.amount;
      default:
        return acc;
    }
  }, 0);
};

/**
 * Calculates the Total Volume of the Cycle.
 * In a Dynamic System, this is the sum of all individual Dynamic Pots.
 * This represents the total amount of money that will change hands in one full rotation.
 */
export const calculateCyclePot = (baseAmount: number, participants: Participant[]): number => {
    // Construct a temporary Xitique-like object to reuse the dynamic logic
    const tempXitique = { amount: baseAmount, participants } as Xitique;
    
    return participants.reduce((totalVolume, participant) => {
        return totalVolume + calculateDynamicPot(tempXitique, participant);
    }, 0);
};

// --- DYNAMIC / VARIABLE CONTRIBUTION LOGIC ---

/**
 * Determines the contribution amount required from a specific PAYER 
 * for a specific RECIPIENT's round.
 * 
 * RULE: The Payer contributes the lesser of:
 * 1. Their own contribution limit (Payer Cap)
 * 2. The Recipient's contribution limit (Recipient Cap)
 */
export const getContributionForRound = (
    baseAmount: number, 
    payer: Participant, 
    recipient: Participant
): number => {
    const payerCap = payer.customContribution !== undefined ? payer.customContribution : baseAmount;
    const recipientCap = recipient.customContribution !== undefined ? recipient.customContribution : baseAmount;
    
    return Math.min(payerCap, recipientCap);
};

/**
 * Calculates the total payout a specific beneficiary will receive (GROSS POT).
 * Formula: Sum of (Min(PayerLimit, BeneficiaryLimit)) for ALL participants (including self).
 * 
 * Example (A=7k, B=7k, C=5k):
 * - If A receives: A(7k) + B(7k) + C(5k) = 19k.
 * - If C receives: A(5k) + B(5k) + C(5k) = 15k.
 */
export const calculateDynamicPot = (xitique: Xitique, beneficiary: Participant): number => {
    return xitique.participants.reduce((pot, payer) => {
        // We include the beneficiary's own contribution in the "Pot Total"
        // because the Pot represents the total accumulated value for that period.
        const contribution = getContributionForRound(xitique.amount, payer, beneficiary);
        return pot + contribution;
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
