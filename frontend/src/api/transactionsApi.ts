import { delay, http, paginate, USE_MOCK_API } from "./client";
import { accountsApi } from "./accountsApi";
import { nextReference, store } from "@/mocks/store";
import type {
  CreateTransactionInput,
  PaginatedResponse,
  Transaction,
  TransactionFilters,
} from "@/types";

function matches(t: Transaction, filters: TransactionFilters): boolean {
  const search = (filters.search ?? "").toLowerCase();
  if (filters.type && t.type !== filters.type) return false;
  if (filters.status && t.status !== filters.status) return false;
  if (filters.userId && t.performedById !== filters.userId) return false;
  if (
    filters.accountId &&
    t.sourceAccountId !== filters.accountId &&
    t.destinationAccountId !== filters.accountId
  )
    return false;
  if (
    search &&
    !t.referenceNumber.toLowerCase().includes(search) &&
    !t.sourceAccountId?.toLowerCase().includes(search) &&
    !t.sourceAccountNumber?.toLowerCase().includes(search) &&
    !t.destinationAccountId?.toLowerCase().includes(search) &&
    !t.destinationAccountNumber?.toLowerCase().includes(search)
  )
    return false;
  if (filters.dateFrom && new Date(t.createdAt) < new Date(filters.dateFrom)) return false;
  if (filters.dateTo && new Date(t.createdAt) > new Date(`${filters.dateTo}T23:59:59Z`))
    return false;
  if (filters.suspiciousOnly) {
    const anomaly = store.anomalies.find((a) => a.transactionId === t.id);
    if (!anomaly?.isSuspicious) return false;
  }
  return true;
}

export const transactionsApi = {
  async list(filters: TransactionFilters = {}): Promise<PaginatedResponse<Transaction>> {
    if (!USE_MOCK_API) {
      const query = new URLSearchParams();
      Object.entries(filters).forEach(
        ([key, value]) => value !== undefined && value !== "" && query.set(key, String(value)),
      );
      return http<PaginatedResponse<Transaction>>(`/transactions?${query}`);
    }
    const items = store.transactions
      .filter((t) => matches(t, filters))
      .map((transaction) => ({
        ...transaction,
        normalizedAnomalyScore:
          store.anomalies.find((anomaly) => anomaly.transactionId === transaction.id)
            ?.normalizedAnomalyScore ?? null,
        anomalyReviewStatus:
          store.anomalies.find((anomaly) => anomaly.transactionId === transaction.id)
            ?.reviewStatus ?? null,
      }));
    return delay(paginate(items, filters.page ?? 1, filters.pageSize ?? 10));
  },

  async listForUser(
    userId: string,
    filters: TransactionFilters = {},
  ): Promise<PaginatedResponse<Transaction>> {
    if (!USE_MOCK_API) return transactionsApi.list(filters);
    return transactionsApi.list({ ...filters, userId });
  },

  async getById(id: string): Promise<Transaction> {
    if (!USE_MOCK_API) return http<Transaction>(`/transactions/${id}`);
    const transaction = store.transactions.find((t) => t.id === id);
    if (!transaction) throw { status: 404, message: "Transaction not found." };
    return delay(transaction);
  },

  async create(
    input: CreateTransactionInput,
    performedBy: { id: string; fullName: string },
  ): Promise<Transaction> {
    if (!USE_MOCK_API) {
      const path = input.type.toLowerCase();
      let body: Record<string, unknown> = {
        accountId: input.sourceAccountId,
        amount: input.amount,
        description: input.description,
      };
      if (input.type === "TRANSFER") {
        const destination = await accountsApi.lookup(input.destinationAccountNumber ?? "");
        body = {
          sourceAccountId: input.sourceAccountId,
          destinationAccountId: destination.id,
          amount: input.amount,
          description: input.description,
        };
      }
      const created = await http<{ id: string }>(`/transactions/${path}`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      return transactionsApi.getById(created.id);
    }
    const source = store.accounts.find((a) => a.id === input.sourceAccountId);
    if (!source) throw { status: 400, message: "Source account not found." };
    if (source.status !== "ACTIVE")
      throw { status: 400, message: "The selected account is not active." };
    if (input.amount <= 0) throw { status: 400, message: "Amount must be greater than zero." };

    let destination = null as (typeof store.accounts)[number] | null;
    if (input.type === "TRANSFER") {
      destination =
        store.accounts.find((a) => a.accountNumber === input.destinationAccountNumber) ?? null;
      if (!destination) throw { status: 400, message: "Destination account was not found." };
      if (destination.id === source.id)
        throw { status: 400, message: "Source and destination accounts must differ." };
      if (destination.status !== "ACTIVE")
        throw { status: 400, message: "The destination account is not active." };
    }

    if (input.type !== "DEPOSIT" && source.balance < input.amount)
      throw { status: 400, message: "Insufficient balance on the source account." };

    const sourceBefore = source.balance;
    source.balance =
      input.type === "DEPOSIT" ? source.balance + input.amount : source.balance - input.amount;

    const destinationBefore = destination ? destination.balance : null;
    if (destination) destination.balance += input.amount;

    const transaction: Transaction = {
      id: `transaction-${Date.now()}`,
      referenceNumber: nextReference(),
      sourceAccountId: source.id,
      sourceAccountNumber: source.accountNumber,
      destinationAccountId: destination?.id ?? null,
      destinationAccountNumber: destination?.accountNumber ?? null,
      performedBy: performedBy.fullName,
      performedById: performedBy.id,
      type: input.type,
      amount: input.amount,
      currency: source.currency,
      status: "COMPLETED",
      description: input.description ?? "",
      createdAt: new Date().toISOString(),
      sourceBalanceBefore: sourceBefore,
      sourceBalanceAfter: source.balance,
      destinationBalanceBefore: destinationBefore,
      destinationBalanceAfter: destination ? destination.balance : null,
    };

    store.transactions = [transaction, ...store.transactions];

    // The backend forwards the transaction to the Isolation Forest service,
    // which returns an anomaly result asynchronously.
    const normalized = Math.min(0.99, input.amount / 6000);
    store.anomalies = [
      {
        transactionId: transaction.id,
        referenceNumber: transaction.referenceNumber,
        userName: transaction.performedBy,
        accountNumber: source.accountNumber,
        type: transaction.type,
        amount: transaction.amount,
        currency: transaction.currency,
        transactionDate: transaction.createdAt,
        isSuspicious: normalized > 0.6,
        rawModelScore: Number((0.2 - normalized * 0.5).toFixed(4)),
        normalizedAnomalyScore: Number(normalized.toFixed(2)),
        modelName: "Isolation Forest",
        modelVersion: "1.0",
        analyzedAt: new Date().toISOString(),
      },
      ...store.anomalies,
    ];

    return delay(transaction);
  },
};
