import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { anomaliesApi } from "@/api/anomaliesApi";
import { AppLayout } from "@/components/layout/AppLayout";
import { AdminRoute } from "@/components/guards";
import {
  Button,
  Card,
  ClearFiltersButton,
  FilterBar,
  SearchInput,
  SelectField,
} from "@/components/ui-kit";
import {
  AnomalyScoreBadge,
  DataTable,
  EmptyState,
  ErrorState,
  Pagination,
  TableSkeleton,
  TransactionTypeBadge,
} from "@/components/data-display";
import { formatDateTime, formatMoney } from "@/lib/format";
import type { AnomalyFilters } from "@/types";

export const Route = createFileRoute("/admin/suspicious-transactions")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Suspicious transactions — Suspicious Transaction Detection System" },
      {
        name: "description",
        content: "Review queue of transactions flagged by the anomaly detection model.",
      },
      { property: "og:title", content: "Suspicious transactions" },
      {
        property: "og:description",
        content: "Review queue of transactions flagged by the anomaly detection model.",
      },
    ],
  }),
  component: () => (
    <AdminRoute>
      <SuspiciousTransactionsPage />
    </AdminRoute>
  ),
});

function SuspiciousTransactionsPage() {
  const [filters, setFilters] = useState<AnomalyFilters>({ page: 1, pageSize: 10 });

  const query = useQuery({
    queryKey: ["anomalies", filters],
    queryFn: () => anomaliesApi.listSuspicious(filters),
  });

  const update = (patch: Partial<AnomalyFilters>) =>
    setFilters((prev) => ({ ...prev, ...patch, page: patch.page ?? 1 }));
  const hasActiveFilters = Boolean(
    filters.search || filters.type || filters.minScore !== undefined,
  );

  return (
    <AppLayout
      title="Suspicious Transactions"
      description="Transactions flagged by the Isolation Forest model, highest risk first."
      lockViewport
      compactBottomPadding
    >
      <FilterBar className="2xl:flex-nowrap">
        <SearchInput
          filterAlignment="left"
          label="Search"
          placeholder="Search user, account ID or reference"
          value={filters.search ?? ""}
          onChange={(search) => update({ search })}
        />
        <SelectField
          label="Type"
          placeholder="All types"
          options={[
            { value: "DEPOSIT", label: "Deposit" },
            { value: "WITHDRAWAL", label: "Withdrawal" },
            { value: "TRANSFER", label: "Transfer" },
          ]}
          value={filters.type ?? ""}
          onChange={(e) => update({ type: e.target.value as AnomalyFilters["type"] })}
        />
        <SelectField
          label="Minimum anomaly score"
          placeholder="Any score"
          options={[
            { value: "0.6", label: "0.60 and above" },
            { value: "0.75", label: "0.75 and above" },
            { value: "0.9", label: "0.90 and above" },
          ]}
          value={filters.minScore !== undefined ? String(filters.minScore) : ""}
          onChange={(e) =>
            update({ minScore: e.target.value ? Number(e.target.value) : undefined })
          }
        />
        <ClearFiltersButton
          active={hasActiveFilters}
          onClear={() => setFilters({ page: 1, pageSize: 10 })}
        />
      </FilterBar>

      <Card className="flex min-h-0 flex-1 flex-col overflow-hidden !rounded-none !border-0 !bg-transparent !p-0">
        {query.isPending ? <TableSkeleton /> : null}
        {query.isError ? <ErrorState onRetry={() => void query.refetch()} /> : null}
        {query.data?.items.length === 0 ? (
          <EmptyState title="No suspicious transactions match the selected filters." />
        ) : null}
        {query.data && query.data.items.length > 0 ? (
          <>
            <DataTable
              caption="Suspicious transactions"
              rows={query.data.items}
              getRowId={(a) => a.transactionId}
              containerClassName="scrollbar-hidden min-h-0 flex-1 overflow-auto"
              columns={[
                {
                  key: "reference",
                  header: "Reference",
                  render: (a) => (
                    <Link
                      to="/admin/transactions/$id"
                      params={{ id: a.transactionId }}
                      className="text-[var(--semantic-primary-selected)] hover:underline"
                    >
                      {a.referenceNumber}
                    </Link>
                  ),
                },
                { key: "user", header: "User", render: (a) => a.userName },
                {
                  key: "account",
                  header: "Account",
                  render: (a) => a.accountNumber,
                  hideOnMobile: true,
                },
                {
                  key: "type",
                  header: "Type",
                  render: (a) => <TransactionTypeBadge type={a.type} />,
                },
                {
                  key: "amount",
                  header: "Amount",
                  render: (a) => formatMoney(a.amount, a.currency),
                },
                {
                  key: "score",
                  header: "Anomaly Score",
                  render: (a) => <AnomalyScoreBadge score={a.normalizedAnomalyScore} />,
                },
                {
                  key: "date",
                  header: "Date",
                  render: (a) => formatDateTime(a.transactionDate),
                  hideOnMobile: true,
                },
                {
                  key: "actions",
                  header: "Actions",
                  render: (a) => (
                    <Link to="/admin/transactions/$id" params={{ id: a.transactionId }}>
                      <Button size="small" variant="secondary">
                        Review
                      </Button>
                    </Link>
                  ),
                },
              ]}
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
    </AppLayout>
  );
}
