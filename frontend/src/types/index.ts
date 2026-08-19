export type Role = "ADMIN" | "USER";
export type ProfileStatus = "ACTIVE" | "INACTIVE" | "BLOCKED";
export type AccountStatus = "ACTIVE" | "BLOCKED" | "CLOSED";
export type AccountRequestStatus = "PENDING" | "APPROVED" | "REJECTED";
export type InvitationStatus = "PENDING" | "ACCEPTED" | "EXPIRED" | "REVOKED";
export type TransactionType = "DEPOSIT" | "WITHDRAWAL" | "TRANSFER";
export type TransactionStatus = "COMPLETED" | "REJECTED";
export type AnomalyReviewStatus = "PENDING" | "NORMAL" | "CONFIRMED_SUSPICIOUS";

export type AuthUser = {
  authUserId: string;
  profileId: string;
  fullName: string;
  email: string;
  role: Role;
  status: ProfileStatus;
  twoFactorEnabled: boolean;
};

export type Profile = {
  id: string;
  fullName: string;
  email: string;
  role: Role;
  status: ProfileStatus;
  twoFactorEnabled: boolean;
  accountCount: number;
  createdAt: string;
};

export type Invitation = {
  id: string;
  email: string;
  invitedRole: Role;
  invitedBy: string;
  status: InvitationStatus;
  createdAt: string;
  expiresAt: string;
};

export type Account = {
  id: string;
  accountNumber: string;
  ownerId: string;
  ownerName: string;
  balance: number;
  currency: string;
  status: AccountStatus;
  createdAt: string;
};

export type AccountRequest = {
  id: string;
  requestedById: string;
  requestedBy: string;
  email: string;
  currency: string;
  status: AccountRequestStatus;
  decidedBy: string | null;
  decisionNote: string | null;
  createdAt: string;
  decidedAt: string | null;
};

export type Transaction = {
  id: string;
  referenceNumber: string;
  sourceAccountId: string | null;
  sourceAccountNumber: string | null;
  destinationAccountId: string | null;
  destinationAccountNumber: string | null;
  performedBy: string;
  performedById: string;
  type: TransactionType;
  amount: number;
  currency: string;
  status: TransactionStatus;
  description: string;
  createdAt: string;
  sourceBalanceBefore: number | null;
  sourceBalanceAfter: number | null;
  destinationBalanceBefore: number | null;
  destinationBalanceAfter: number | null;
  normalizedAnomalyScore?: number | null;
  anomalyReviewStatus?: AnomalyReviewStatus | null;
};

export type AnomalyResult = {
  transactionId: string;
  referenceNumber: string;
  userName: string;
  accountId?: string;
  accountNumber: string;
  type: TransactionType;
  amount: number;
  currency: string;
  transactionDate: string;
  isSuspicious: boolean;
  rawModelScore: number;
  normalizedAnomalyScore: number;
  modelName: string;
  modelVersion: string;
  analyzedAt: string;
  reviewStatus?: AnomalyReviewStatus;
  reviewedAt?: string | null;
};

export type AdminDashboard = {
  totalUsers: number;
  activeUsers: number;
  blockedUsers: number;
  pendingInvitations: number;
  usersWithoutAccounts: number;
  totalAccounts: number;
  activeAccounts: number;
  totalTransactions: number;
  suspiciousTransactions: number;
};

export type UserDashboard = {
  fullName: string;
  totalBalance: number;
  currency: string;
  accounts: Array<Pick<Account, "id" | "accountNumber" | "balance" | "currency" | "status">>;
};

export type PaginatedResponse<T> = {
  items: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};

export type ApiError = {
  status: number;
  message: string;
  fieldErrors?: Record<string, string>;
};

export type TransactionFilters = {
  page?: number;
  pageSize?: number;
  type?: TransactionType | "";
  status?: TransactionStatus | "";
  accountId?: string;
  userId?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  suspiciousOnly?: boolean;
};

export type UserFilters = {
  page?: number;
  pageSize?: number;
  role?: Role | "";
  status?: ProfileStatus | "";
  twoFactor?: "true" | "false" | "";
  search?: string;
};

export type AccountFilters = {
  page?: number;
  pageSize?: number;
  status?: AccountStatus | "";
  search?: string;
};

export type AnomalyFilters = {
  page?: number;
  pageSize?: number;
  type?: TransactionType | "";
  minScore?: number;
  maxScore?: number;
  search?: string;
  user?: string;
  account?: string;
  dateFrom?: string;
  dateTo?: string;
};

export type CreateTransactionInput = {
  type: TransactionType;
  sourceAccountId: string;
  destinationAccountNumber?: string;
  amount: number;
  description?: string;
};
