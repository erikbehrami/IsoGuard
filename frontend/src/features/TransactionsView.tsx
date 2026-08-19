import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { transactionsApi } from "@/api/transactionsApi";
import { accountsApi } from "@/api/accountsApi";
import {
  Column,
  AnomalyScoreBadge,
  DataTable,
  EmptyState,
  ErrorState,
  Pagination,
  StatusBadge,
  TableSkeleton,
  TransactionTypeBadge,
} from "@/components/data-display";
import {
  Button,
  ClearFiltersButton,
  FilterBar,
  SearchInput,
  SelectField,
} from "@/components/ui-kit";
import { Card } from "@/components/ui-kit";
import { formatDateTime, formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Transaction, TransactionFilters } from "@/types";

const TYPE_OPTIONS = [
  { value: "DEPOSIT", label: "Deposit" },
  { value: "WITHDRAWAL", label: "Withdrawal" },
  { value: "TRANSFER", label: "Transfer" },
];

const STATUS_OPTIONS = [
  { value: "COMPLETED", label: "Completed" },
  { value: "REJECTED", label: "Rejected" },
];

export function TransactionsView({
  isAdmin,
  userId,
  contained = false,
}: {
  isAdmin: boolean;
  userId?: string;
  contained?: boolean;
}) {
  const [filters, setFilters] = useState<TransactionFilters>({ page: 1, pageSize: 10 });

  const accountsQuery = useQuery({
    queryKey: ["accounts", "options", userId ?? "all"],
    queryFn: () =>
      isAdmin
        ? accountsApi.list({ pageSize: 100 }).then((r) => r.items)
        : accountsApi.listByOwner(userId ?? ""),
  });

  const query = useQuery({
    queryKey: ["transactions", { ...filters, userId, isAdmin }],
    queryFn: () =>
      isAdmin ? transactionsApi.list(filters) : transactionsApi.listForUser(userId ?? "", filters),
    retry: 1,
  });

  const accountOptions = useMemo(
    () =>
      (accountsQuery.data ?? []).map((account) => ({
        value: account.id,
        label: account.accountNumber,
      })),
    [accountsQuery.data],
  );

  const update = (patch: Partial<TransactionFilters>) =>
    setFilters((prev) => ({ ...prev, ...patch, page: patch.page ?? 1 }));
  const hasActiveFilters = Boolean(
    filters.search || filters.type || filters.status || filters.accountId || filters.suspiciousOnly,
  );

  const columns: Array<Column<Transaction>> = [
    {
      key: "reference",
      header: "Reference",
      render: (t) => (
        <Link
          to={isAdmin ? "/admin/transactions/$id" : "/transactions/$id"}
          params={{ id: t.id }}
          className="text-[var(--semantic-primary-selected)] hover:underline"
        >
          {t.referenceNumber}
        </Link>
      ),
    },
    { key: "type", header: "Type", render: (t) => <TransactionTypeBadge type={t.type} /> },
    {
      key: "source",
      header: "Source Account",
      render: (t) => t.sourceAccountNumber ?? "—",
      hideOnMobile: true,
    },
    {
      key: "destination",
      header: "Destination Account",
      render: (t) => t.destinationAccountNumber ?? "N/A",
      hideOnMobile: true,
    },
    {
      key: "amount",
      header: "Amount",
      render: (t) => (
        <span className="text-[var(--semantic-text-secondary)]">
          {formatMoney(t.amount, t.currency)}
        </span>
      ),
    },
    { key: "status", header: "Status", render: (t) => <StatusBadge status={t.status} /> },
    ...(isAdmin
      ? [
          {
            key: "anomalyScore",
            header: "Anomaly Score",
            render: (t: Transaction) =>
              t.normalizedAnomalyScore !== null && t.normalizedAnomalyScore !== undefined ? (
                <AnomalyScoreBadge
                  score={t.normalizedAnomalyScore}
                  reviewStatus={t.anomalyReviewStatus}
                />
              ) : (
                "—"
              ),
          },
        ]
      : []),
    {
      key: "createdAt",
      header: "Created At",
      render: (t) => formatDateTime(t.createdAt),
      hideOnMobile: true,
    },
  ];

  return (
    <div className={cn("flex flex-col gap-[var(--spacing-6xl)]", contained && "min-h-0 flex-1")}>
      <FilterBar>
        <SearchInput
          filterAlignment="left"
          label="Search transactions"
          placeholder="Search reference or account ID"
          value={filters.search ?? ""}
          onChange={(search) => update({ search })}
        />
        {isAdmin ? (
          <label className="flex h-[var(--button-height-medium)] self-end items-center gap-[var(--spacing-2xl)] text-sm text-[var(--semantic-text-primary)]">
            <input
              type="checkbox"
              checked={Boolean(filters.suspiciousOnly)}
              onChange={(e) => update({ suspiciousOnly: e.target.checked })}
            />
            Suspicious only
          </label>
        ) : null}
        <SelectField
          label="Type"
          placeholder="All types"
          options={TYPE_OPTIONS}
          value={filters.type ?? ""}
          onChange={(e) => update({ type: e.target.value as TransactionFilters["type"] })}
        />
        <SelectField
          label="Status"
          placeholder="All statuses"
          options={STATUS_OPTIONS}
          value={filters.status ?? ""}
          onChange={(e) => update({ status: e.target.value as TransactionFilters["status"] })}
        />
        <SelectField
          label="Account"
          placeholder="All accounts"
          options={accountOptions}
          value={filters.accountId ?? ""}
          onChange={(e) => update({ accountId: e.target.value })}
        />
        <ClearFiltersButton
          active={hasActiveFilters}
          onClear={() => setFilters({ page: 1, pageSize: 10 })}
        />
      </FilterBar>

      <Card
        className={cn(
          "!p-0",
          contained &&
            "flex min-h-0 flex-1 flex-col overflow-hidden !rounded-none !border-0 !bg-transparent",
        )}
      >
        {query.isPending ? <TableSkeleton /> : null}
        {query.isError ? <ErrorState onRetry={() => void query.refetch()} /> : null}
        {query.data && query.data.items.length === 0 ? (
          <EmptyState title="No transactions match the selected filters." />
        ) : null}
        {query.data && query.data.items.length > 0 ? (
          <>
            <DataTable
              caption="Transactions"
              columns={columns}
              rows={query.data.items}
              getRowId={(t) => t.id}
              containerClassName={
                contained ? "scrollbar-hidden min-h-0 flex-1 overflow-auto" : undefined
              }
            />
            <Pagination
              page={query.data.page}
              totalPages={query.data.totalPages}
              totalItems={query.data.totalItems}
              onPageChange={(page) => setFilters((prev) => ({ ...prev, page }))}
            />
          </>
        ) : null}
      </Card>
    </div>
  );
}
