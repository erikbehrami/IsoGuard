import { delay, http, USE_MOCK_API } from "./client";
import { store } from "@/mocks/store";
import type { AdminDashboard, UserDashboard } from "@/types";

export const dashboardApi = {
  async admin(): Promise<AdminDashboard> {
    if (!USE_MOCK_API) return http<AdminDashboard>("/admin/dashboard");
    return delay({
      totalUsers: store.profiles.length,
      activeUsers: store.profiles.filter((p) => p.status === "ACTIVE").length,
      blockedUsers: store.profiles.filter((p) => p.status === "BLOCKED").length,
      pendingInvitations: store.invitations.filter((i) => i.status === "PENDING").length,
      usersWithoutAccounts: store.profiles.filter(
        (p) =>
          p.role === "USER" &&
          p.status === "ACTIVE" &&
          !store.accounts.some((a) => a.ownerId === p.id),
      ).length,
      totalAccounts: store.accounts.length,
      activeAccounts: store.accounts.filter((a) => a.status === "ACTIVE").length,
      totalTransactions: store.transactions.length,
      suspiciousTransactions: store.anomalies.filter((a) => a.isSuspicious).length,
    });
  },

  async user(profileId: string, fullName: string): Promise<UserDashboard> {
    if (!USE_MOCK_API) return http<UserDashboard>("/user/dashboard");
    const accounts = store.accounts.filter((a) => a.ownerId === profileId);
    return delay({
      fullName,
      totalBalance: accounts
        .filter((a) => a.status === "ACTIVE")
        .reduce((sum, a) => sum + a.balance, 0),
      currency: accounts[0]?.currency ?? "EUR",
      accounts: accounts.map((a) => ({
        id: a.id,
        accountNumber: a.accountNumber,
        balance: a.balance,
        currency: a.currency,
        status: a.status,
      })),
    });
  },
};
