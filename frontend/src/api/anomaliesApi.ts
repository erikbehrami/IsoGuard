import { delay, http, paginate, USE_MOCK_API } from "./client";
import { store } from "@/mocks/store";
import type {
  AnomalyFilters,
  AnomalyResult,
  AnomalyReviewStatus,
  PaginatedResponse,
} from "@/types";

export const anomaliesApi = {
  async listSuspicious(filters: AnomalyFilters = {}): Promise<PaginatedResponse<AnomalyResult>> {
    if (!USE_MOCK_API) {
      const rows = await http<AnomalyResult[]>("/anomalies");
      const search = (filters.search ?? "").toLowerCase();
      const user = (filters.user ?? "").toLowerCase();
      const account = (filters.account ?? "").toLowerCase();
      const items = rows.filter(
        (a) =>
          (!filters.type || a.type === filters.type) &&
          (filters.minScore === undefined || a.normalizedAnomalyScore >= filters.minScore) &&
          (filters.maxScore === undefined || a.normalizedAnomalyScore <= filters.maxScore) &&
          (!search ||
            a.userName.toLowerCase().includes(search) ||
            a.accountId?.toLowerCase().includes(search) ||
            a.accountNumber.toLowerCase().includes(search) ||
            a.referenceNumber.toLowerCase().includes(search)) &&
          (!user || a.userName.toLowerCase().includes(user)) &&
          (!account || a.accountNumber.toLowerCase().includes(account)),
      );
      return paginate(items, filters.page ?? 1, filters.pageSize ?? 10);
    }
    const search = (filters.search ?? "").toLowerCase();
    const user = (filters.user ?? "").toLowerCase();
    const account = (filters.account ?? "").toLowerCase();
    const items = store.anomalies.filter((a) => {
      if (!a.isSuspicious) return false;
      if (filters.type && a.type !== filters.type) return false;
      if (filters.minScore !== undefined && a.normalizedAnomalyScore < filters.minScore)
        return false;
      if (filters.maxScore !== undefined && a.normalizedAnomalyScore > filters.maxScore)
        return false;
      if (
        search &&
        !a.userName.toLowerCase().includes(search) &&
        !a.accountId?.toLowerCase().includes(search) &&
        !a.accountNumber.toLowerCase().includes(search) &&
        !a.referenceNumber.toLowerCase().includes(search)
      )
        return false;
      if (user && !a.userName.toLowerCase().includes(user)) return false;
      if (account && !a.accountNumber.toLowerCase().includes(account)) return false;
      if (filters.dateFrom && new Date(a.transactionDate) < new Date(filters.dateFrom))
        return false;
      if (filters.dateTo && new Date(a.transactionDate) > new Date(`${filters.dateTo}T23:59:59Z`))
        return false;
      return true;
    });
    return delay(paginate(items, filters.page ?? 1, filters.pageSize ?? 10));
  },

  /** Administrator-only: anomaly detail for a single transaction. */
  async getByTransactionId(transactionId: string): Promise<AnomalyResult | null> {
    if (!USE_MOCK_API) {
      try {
        return await http<AnomalyResult>(`/anomalies/${transactionId}`);
      } catch (error) {
        if ((error as { status?: number }).status === 404) return null;
        throw error;
      }
    }
    return delay(store.anomalies.find((a) => a.transactionId === transactionId) ?? null);
  },

  async review(
    transactionId: string,
    decision: Exclude<AnomalyReviewStatus, "PENDING">,
  ): Promise<AnomalyResult> {
    if (!USE_MOCK_API)
      return http<AnomalyResult>(`/anomalies/${transactionId}/review`, {
        method: "PATCH",
        body: JSON.stringify({ decision }),
      });

    const anomaly = store.anomalies.find((item) => item.transactionId === transactionId);
    if (!anomaly) throw { status: 404, message: "Anomaly result not found." };
    anomaly.reviewStatus = decision;
    anomaly.reviewedAt = new Date().toISOString();
    anomaly.isSuspicious = decision === "CONFIRMED_SUSPICIOUS";
    if (anomaly.isSuspicious) {
      const account = store.accounts.find((item) => item.id === anomaly.accountId);
      if (account && account.status !== "CLOSED") account.status = "BLOCKED";
    }
    return delay({ ...anomaly });
  },
};
