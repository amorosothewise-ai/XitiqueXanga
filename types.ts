export enum Frequency {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
}

export enum XitiqueStatus {
  PLANNING = 'PLANNING', // Draft mode
  ACTIVE = 'ACTIVE',     // Financial rules locked
  COMPLETED = 'COMPLETED', // Read-only
  ARCHIVED = 'ARCHIVED', // Soft deleted
  RISK = 'RISK'          // Unequal contributions detected
}

export enum XitiqueType {
  GROUP = 'GROUP',
  INDIVIDUAL = 'INDIVIDUAL',
}

export enum PaymentMethod {
  CASH = 'CASH',
  MPESA = 'MPESA',
  EMOLA = 'EMOLA',
}

export enum TransactionType {
  DEPOSIT = 'DEPOSIT',
  WITHDRAWAL = 'WITHDRAWAL',
  PAYOUT = 'PAYOUT',
  PAYOUT_REVERSAL = 'PAYOUT_REVERSAL', // For corrections
}

export interface UserProfile {
  id: string;
  name: string;
  language: 'pt' | 'en';
  email?: string;
  phone?: string;
  avatarColor?: string;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  date: string; // ISO String
  description?: string;
  referenceId?: string; // To link reversals to original transactions
}

export interface Participant {
  id: string;
  name: string;
  payoutDate?: string; // ISO Date string
  received: boolean;
  order: number;
  customContribution?: number; // New: Allows specific contribution amount per person
}

export interface Xitique {
  id: string;
  name: string;
  type: XitiqueType;
  amount: number; // The "Base" amount
  targetAmount?: number;
  currentBalance?: number; // Deprecated, kept for compat
  method?: PaymentMethod;
  frequency: Frequency;
  startDate: string;
  participants: Participant[];
  status: XitiqueStatus;
  createdAt: number;
  transactions: Transaction[];
}

export interface SimulationResult {
  cycleDurationText: string;
  totalPot: number;
  totalContributionPerPerson: number;
  payouts: { date: string; amount: number; recipientIndex: number }[];
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  date: string;
  read: boolean;
  type: 'info' | 'warning' | 'success';
}