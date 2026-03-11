
import { describe, it, expect } from 'vitest';
import { 
  calculateBalance, 
  calculateCyclePot, 
  getContributionForRound, 
  calculateDynamicPot,
  validateTransaction 
} from './financeLogic';
import { TransactionType, Participant, Xitique, XitiqueType, XitiqueStatus, Frequency } from '../types';

describe('financeLogic', () => {
  describe('calculateBalance', () => {
    it('should return 0 for no transactions', () => {
      expect(calculateBalance([])).toBe(0);
    });

    it('should correctly sum deposits and subtract withdrawals/payouts', () => {
      const transactions = [
        { type: TransactionType.DEPOSIT, amount: 1000 },
        { type: TransactionType.DEPOSIT, amount: 500 },
        { type: TransactionType.WITHDRAWAL, amount: 200 },
        { type: TransactionType.PAYOUT, amount: 800 },
        { type: TransactionType.PAYOUT_REVERSAL, amount: 100 }
      ] as any;
      
      // 1000 + 500 - 200 - 800 + 100 = 600
      expect(calculateBalance(transactions)).toBe(600);
    });
  });

  describe('getContributionForRound', () => {
    const payer: Participant = { id: '1', name: 'Payer', order: 0, received: false };
    const recipient: Participant = { id: '2', name: 'Recipient', order: 1, received: false };

    it('should use base amount if no custom contributions are set', () => {
      expect(getContributionForRound(1000, payer, recipient)).toBe(1000);
    });

    it('should use the minimum of payer cap and recipient cap', () => {
      const payerWithCap = { ...payer, customContribution: 500 };
      const recipientWithCap = { ...recipient, customContribution: 800 };
      
      expect(getContributionForRound(1000, payerWithCap, recipientWithCap)).toBe(500);
      
      const recipientWithLowerCap = { ...recipient, customContribution: 300 };
      expect(getContributionForRound(1000, payerWithCap, recipientWithLowerCap)).toBe(300);
    });
  });

  describe('calculateDynamicPot', () => {
    it('should calculate the correct pot for a beneficiary in a variable group', () => {
      const participants: Participant[] = [
        { id: 'A', name: 'A', order: 0, received: false, customContribution: 7000 },
        { id: 'B', name: 'B', order: 1, received: false, customContribution: 7000 },
        { id: 'C', name: 'C', order: 2, received: false, customContribution: 5000 }
      ];
      
      const xitique: Xitique = {
        id: '1',
        name: 'Test',
        amount: 7000,
        participants,
        transactions: [],
        type: XitiqueType.GROUP,
        status: XitiqueStatus.ACTIVE,
        frequency: Frequency.MONTHLY,
        startDate: new Date().toISOString(),
        createdAt: Date.now()
      };

      // If A receives: A(7k) + B(7k) + C(5k) = 19k
      expect(calculateDynamicPot(xitique, participants[0])).toBe(19000);
      
      // If C receives: A(5k) + B(5k) + C(5k) = 15k
      expect(calculateDynamicPot(xitique, participants[2])).toBe(15000);
    });
  });

  describe('calculateCyclePot', () => {
    it('should calculate the total volume of the cycle', () => {
      const participants: Participant[] = [
        { id: 'A', name: 'A', order: 0, received: false, customContribution: 7000 },
        { id: 'B', name: 'B', order: 1, received: false, customContribution: 7000 },
        { id: 'C', name: 'C', order: 2, received: false, customContribution: 5000 }
      ];

      // Pot for A: 19k
      // Pot for B: 19k
      // Pot for C: 15k
      // Total: 53k
      expect(calculateCyclePot(7000, participants)).toBe(53000);
    });
  });

  describe('validateTransaction', () => {
    const xitique: Xitique = {
      id: '1',
      name: 'Test',
      amount: 1000,
      participants: [],
      transactions: [
        { id: 'tx1', type: TransactionType.DEPOSIT, amount: 500, date: new Date().toISOString() }
      ],
      type: XitiqueType.GROUP,
      status: XitiqueStatus.ACTIVE,
      frequency: Frequency.MONTHLY,
      startDate: new Date().toISOString(),
      createdAt: Date.now()
    };

    it('should fail for non-positive amounts', () => {
      expect(validateTransaction(xitique, TransactionType.DEPOSIT, 0).valid).toBe(false);
      expect(validateTransaction(xitique, TransactionType.DEPOSIT, -10).valid).toBe(false);
    });

    it('should fail for withdrawals exceeding balance', () => {
      const result = validateTransaction(xitique, TransactionType.WITHDRAWAL, 600);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Insufficient funds.');
    });

    it('should pass for valid deposits and withdrawals', () => {
      expect(validateTransaction(xitique, TransactionType.DEPOSIT, 1000).valid).toBe(true);
      expect(validateTransaction(xitique, TransactionType.WITHDRAWAL, 400).valid).toBe(true);
    });
  });
});
