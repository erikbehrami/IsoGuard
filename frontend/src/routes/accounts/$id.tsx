import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { accountsApi } from "@/api/accountsApi";
import { transactionsApi } from "@/api/transactionsApi";
import { AppLayout } from "@/components/layout/AppLayout";
import { UserRoute } from "@/components/guards";
import { Card } from "@/components/ui-kit";
import { DetailRow } from "@/components/domain";
import {
  DataTable,
  EmptyState,
  ErrorState,
  LoadingState,
  StatusBadge,
  TableSkeleton,
  TransactionTypeBadge,
} from "@/components/data-display";
import { formatDateTime, formatMoney } from "@/lib/format";

export const Route = createFileRoute("/accounts/$id")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Account details — Suspicious Transaction Detection System" },
      { name: "description", content: "Balance, status and recent activity for your account." },
      { property: "og:title", content: "Account details" },
      {
        property: "og:description",
        content: "Balance, status and recent activity for your account.",
      },
    ],
  }),
  component: () => (
    <UserRoute>
      <AccountDetailsPage />
    </UserRoute>
  ),
});

function AccountDetailsPage() {
  const { id } = Route.useParams();

  const accountQuery = useQuery({
    queryKey: ["account", id],
    queryFn: () => accountsApi.getById(id),
  });

  const transactionsQuery = useQuery({
    queryKey: ["transactions", "account", id],
    queryFn: () => transactionsApi.list({ accountId: id, pageSize: 10 }),
  });

  return (
    <AppLayout
      title={accountQuery.data?.accountNumber ?? "Account details"}
      description="Account information and recent transactions."
    >
      {accountQuery.isPending ? <LoadingState label="Loading account" /> : null}
      {accountQuery.isError ? <ErrorState onRetry={() => void accountQuery.refetch()} /> : null}

      {accountQuery.data ? (
        <Card>
          <DetailRow label="Account number" separated={false}>
            {accountQuery.data.accountNumber}
          </DetailRow>
          <DetailRow label="Current balance" separated={false}>
            {formatMoney(accountQuery.data.balance, accountQuery.data.currency)}
          </DetailRow>
          <DetailRow label="Currency" separated={false}>
            {accountQuery.data.currency}
          </DetailRow>
          <DetailRow label="Status" separated={false}>
            <StatusBadge status={accountQuery.data.status} />
          </DetailRow>
          <DetailRow label="Created at" separated={false}>
            {formatDateTime(accountQuery.data.createdAt)}
          </DetailRow>
        </Card>
      ) : null}

      <section className="flex flex-col gap-[var(--spacing-5xl)]">
        <h2 className="text-lg font-semibold text-[var(--semantic-text-secondary)]">
          Recent transactions
        </h2>
        <Card className="!p-0">
          {transactionsQuery.isPending ? <TableSkeleton /> : null}
          {transactionsQuery.isError ? (
            <ErrorState onRetry={() => void transactionsQuery.refetch()} />
          ) : null}
          {transactionsQuery.data?.items.length === 0 ? (
            <EmptyState title="No transactions match the selected filters." />
          ) : null}
          {transactionsQuery.data && transactionsQuery.data.items.length > 0 ? (
            <DataTable
              caption="Account transactions"
              rows={transactionsQuery.data.items}
              getRowId={(t) => t.id}
              columns={[
                { key: "reference", header: "Reference", render: (t) => t.referenceNumber },
                {
                  key: "type",
                  header: "Type",
                  render: (t) => <TransactionTypeBadge type={t.type} />,
                },
                {
                  key: "amount",
                  header: "Amount",
                  render: (t) => formatMoney(t.amount, t.currency),
                },
                {
                  key: "status",
                  header: "Status",
                  render: (t) => <StatusBadge status={t.status} />,
                },
                {
                  key: "created",
                  header: "Created At",
                  render: (t) => formatDateTime(t.createdAt),
                  hideOnMobile: true,
                },
              ]}
            />
          ) : null}
        </Card>
      </section>
    </AppLayout>
  );
}
