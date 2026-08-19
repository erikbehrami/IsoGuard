import {
  mockAccounts,
  mockAnomalies,
  mockInvitations,
  mockProfiles,
  mockTransactions,
} from "@/mocks/data";
import type { Account, AnomalyResult, Invitation, Profile, Transaction } from "@/types";

/**
 * In-memory mock store. Mutations performed through the API modules are
 * reflected here so the UI behaves like a real backend while
 * VITE_USE_MOCK_API is enabled.
 */
export const store = {
  profiles: [...mockProfiles] as Profile[],
  invitations: [...mockInvitations] as Invitation[],
  accounts: [...mockAccounts] as Account[],
  transactions: [...mockTransactions] as Transaction[],
  anomalies: [...mockAnomalies] as AnomalyResult[],
  transactionCounter: 25,
  accountCounter: 5,
};

export function nextReference(): string {
  store.transactionCounter += 1;
  return `TRX-2026-${String(store.transactionCounter).padStart(6, "0")}`;
}

export function nextAccountNumber(): string {
  store.accountCounter += 1;
  return `ACC-2026-${String(store.accountCounter).padStart(4, "0")}`;
}
