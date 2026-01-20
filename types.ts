
export enum Frequency {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
}

export enum ContributionMode {
  UNIFORM = 'UNIFORM',
  VARIABLE = 'VARIABLE',
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

// Backend: 'users' collection
export interface UserData {
  id: string;
  name: string;
  email: string;
  photoUrl?: string;
  language: 'pt' | 'en';
  lastLogin: string; // ISO timestamp
  fcmToken?: string; // For notifications
}

// Backend: 'preferences' collection
export interface UserPreferences {
  userId: string;
  contributions: boolean; // Simple boolean or could be Frequency
  payouts: boolean;
  updates: boolean;
}

// Backend: 'activity_logs' collection
export interface ActivityLog {
  id?: string;
  userId: string;
  action: 'LOGIN' | 'REGISTER' | 'UPDATE_PROFILE' | 'UPDATE_PREFS' | 'CHANGE_PASSWORD' | 'ERROR';
  details?: string;
  timestamp: string;
  status: 'SUCCESS' | 'FAILURE';
}

// Frontend: Combined Profile for UI convenience
export interface UserProfile extends UserData {
  avatarColor?: string;
  joinedAt?: number;
  notificationPreferences: {
    contributions: boolean;
    payouts: boolean;
    updates: boolean;
  };
}

export interface AuthSession {
  user: UserProfile;
  token: string;
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
