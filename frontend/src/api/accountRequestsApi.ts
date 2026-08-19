import { http } from "./client";
import type { AccountRequest, AccountRequestStatus, PaginatedResponse } from "@/types";

export const accountRequestsApi = {
  mine(page = 1): Promise<PaginatedResponse<AccountRequest>> {
    return http(`/account-requests/mine?page=${page}&pageSize=10`);
  },

  submit(currency: string): Promise<AccountRequest> {
    return http("/account-requests", {
      method: "POST",
      body: JSON.stringify({ currency }),
    });
  },

  list(
    page = 1,
    status?: AccountRequestStatus,
    search?: string,
  ): Promise<PaginatedResponse<AccountRequest>> {
    const query = new URLSearchParams({ page: String(page), pageSize: "10" });
    if (status) query.set("status", status);
    if (search?.trim()) query.set("search", search.trim());
    return http(`/account-requests?${query}`);
  },

  decide(
    id: string,
    decision: Exclude<AccountRequestStatus, "PENDING">,
    note?: string,
  ): Promise<AccountRequest> {
    return http(`/account-requests/${id}/decision`, {
      method: "PATCH",
      body: JSON.stringify({ decision, note }),
    });
  },
};
