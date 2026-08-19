import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { accountsApi } from "@/api/accountsApi";
import { transactionsApi } from "@/api/transactionsApi";
import { AppLayout } from "@/components/layout/AppLayout";
import { AdminRoute } from "@/components/guards";
import { Button, Card } from "@/components/ui-kit";
import { ConfirmationDialog } from "@/components/modals";
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
import { errorMessage, formatDateTime, formatMoney } from "@/lib/format";

export const Route = createFileRoute("/admin/accounts/$id")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Account details — Suspicious Transaction Detection System" },
      { name: "description", content: "Administrative view of an account and its activity." },
      { property: "og:title", content: "Account details" },
      {
        property: "og:description",
        content: "Administrative view of an account and its activity.",
      },
    ],
  }),
  component: () => (
    <AdminRoute>
      <AdminAccountDetailsPage />
    </AdminRoute>
  ),
});

function AdminAccountDetailsPage() {
  const { id } = Route.useParams();
  const queryClient = useQueryClient();
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);

  const accountQuery = useQuery({
    queryKey: ["account", id],
    queryFn: () => accountsApi.getById(id),
  });
  const transactionsQuery = useQuery({
    queryKey: ["transactions", "account", id],
    queryFn: () => transactionsApi.list({ accountId: id, pageSize: 10 }),
  });
  const account = accountQuery.data;
  const willUnblock = account?.status === "BLOCKED";

  const statusMutation = useMutation({
    mutationFn: () => accountsApi.setStatus(id, willUnblock ? "ACTIVE" : "BLOCKED"),
    onSuccess: async () => {
      toast.success(
        willUnblock ? "The account has been unblocked." : "The account has been blocked.",
      );
      setStatusDialogOpen(false);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["account", id] }),
        queryClient.invalidateQueries({ queryKey: ["accounts"] }),
      ]);
    },
    onError: (error) =>
      toast.error(errorMessage(error, "The account status could not be updated.")),
  });

  return (
    <AppLayout
      title={account?.accountNumber ?? "Account details"}
      description="Account information, owner and recent transactions."
      actions={
        account && account.status !== "CLOSED" ? (
          <Button
            variant={willUnblock ? "secondary" : "danger"}
            onClick={() => setStatusDialogOpen(true)}
          >
            {willUnblock ? "Unblock account" : "Block account"}
          </Button>
        ) : undefined
      }
    >
      {accountQuery.isPending ? <LoadingState label="Loading account" /> : null}
      {accountQuery.isError ? <ErrorState onRetry={() => void accountQuery.refetch()} /> : null}

      {accountQuery.data ? (
        <Card>
          <DetailRow label="Account number" separated={false}>
            {accountQuery.data.accountNumber}
          </DetailRow>
          <DetailRow label="Owner" separated={false}>
            <Link
              to="/admin/users/$id"
              params={{ id: accountQuery.data.ownerId }}
              className="text-[var(--semantic-primary-selected)] hover:underline"
            >
              {accountQuery.data.ownerName}
            </Link>
          </DetailRow>
          <DetailRow label="Balance" separated={false}>
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
          {transactionsQuery.data?.items.length === 0 ? (
            <EmptyState title="No transactions match the selected filters." />
          ) : null}
          {transactionsQuery.data && transactionsQuery.data.items.length > 0 ? (
            <DataTable
              caption="Account transactions"
              rows={transactionsQuery.data.items}
              getRowId={(t) => t.id}
              columns={[
                {
                  key: "reference",
                  header: "Reference",
                  render: (t) => (
                    <Link
                      to="/admin/transactions/$id"
                      params={{ id: t.id }}
                      className="text-[var(--semantic-primary-selected)] hover:underline"
                    >
                      {t.referenceNumber}
                    </Link>
                  ),
                },
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

      <ConfirmationDialog
        open={statusDialogOpen}
        onOpenChange={setStatusDialogOpen}
        title={willUnblock ? "Unblock account?" : "Block account?"}
        description={
          willUnblock
            ? `Transactions on ${account?.accountNumber ?? "this account"} will be allowed again.`
            : `No transactions will be possible on ${account?.accountNumber ?? "this account"} until it is unblocked.`
        }
        confirmLabel={willUnblock ? "Unblock" : "Block"}
        destructive={!willUnblock}
        loading={statusMutation.isPending}
        onConfirm={() => statusMutation.mutate()}
      />
    </AppLayout>
  );
}
