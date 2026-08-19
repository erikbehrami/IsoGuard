import { delay, http, paginate, USE_MOCK_API } from "./client";
import { nextAccountNumber, store } from "@/mocks/store";
import type { Account, AccountFilters, PaginatedResponse } from "@/types";

export const accountsApi = {
  async list(filters: AccountFilters = {}): Promise<PaginatedResponse<Account>> {
    if (!USE_MOCK_API) {
      const query = new URLSearchParams();
      Object.entries(filters).forEach(
        ([key, value]) => value !== undefined && value !== "" && query.set(key, String(value)),
      );
      return http<PaginatedResponse<Account>>(`/accounts?${query}`);
    }
    const search = (filters.search ?? "").toLowerCase();
    const items = store.accounts.filter((a) => {
      if (filters.status && a.status !== filters.status) return false;
      if (
        search &&
        !a.ownerName.toLowerCase().includes(search) &&
        !a.accountNumber.toLowerCase().includes(search)
      )
        return false;
      return true;
    });
    return delay(paginate(items, filters.page ?? 1, filters.pageSize ?? 10));
  },

  async listByOwner(ownerId: string): Promise<Account[]> {
    if (!USE_MOCK_API)
      return http<PaginatedResponse<Account>>(`/accounts?ownerId=${ownerId}&pageSize=100`).then(
        (x) => x.items,
      );
    return delay(store.accounts.filter((a) => a.ownerId === ownerId));
  },

  async getById(id: string): Promise<Account> {
    if (!USE_MOCK_API) return http<Account>(`/accounts/${id}`);
    const account = store.accounts.find((a) => a.id === id);
    if (!account) throw { status: 404, message: "Account not found." };
    return delay(account);
  },

  async lookup(accountNumber: string): Promise<{ id: string; accountNumber: string }> {
    if (!USE_MOCK_API)
      return http<{ id: string; accountNumber: string }>(
        `/accounts/lookup/${encodeURIComponent(accountNumber)}`,
      );
    const account = store.accounts.find((a) => a.accountNumber === accountNumber);
    if (!account) throw { status: 404, message: "Destination account was not found." };
    return delay({ id: account.id, accountNumber: account.accountNumber });
  },

  async create(input: { ownerId: string; currency: string }): Promise<Account> {
    if (!USE_MOCK_API)
      return http<Account>("/accounts", { method: "POST", body: JSON.stringify(input) });
    const owner = store.profiles.find((p) => p.id === input.ownerId);
    if (!owner) throw { status: 400, message: "Owner not found." };
    if (
      store.accounts.some(
        (account) =>
          account.ownerId === input.ownerId &&
          account.currency === input.currency &&
          account.status !== "CLOSED",
      )
    )
      throw {
        status: 409,
        message: `The user already has a non-closed ${input.currency} account.`,
      };
    const account: Account = {
      id: `account-${Date.now()}`,
      accountNumber: nextAccountNumber(),
      ownerId: owner.id,
      ownerName: owner.fullName,
      balance: 0,
      currency: input.currency,
      status: "ACTIVE",
      createdAt: new Date().toISOString(),
    };
    store.accounts = [account, ...store.accounts];
    owner.accountCount += 1;
    return delay(account);
  },

  async setStatus(id: string, status: Account["status"]): Promise<Account> {
    if (!USE_MOCK_API)
      return http<Account>(`/accounts/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
    const account = store.accounts.find((a) => a.id === id);
    if (!account) throw { status: 404, message: "Account not found." };
    account.status = status;
    return delay({ ...account });
  },
};
