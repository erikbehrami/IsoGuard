import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { usersApi } from "@/api/usersApi";
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
import { errorMessage, formatDate, formatDateTime, formatMoney } from "@/lib/format";

export const Route = createFileRoute("/admin/users/$id")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "User details — Suspicious Transaction Detection System" },
      { name: "description", content: "Profile, accounts and transaction history for a user." },
      { property: "og:title", content: "User details" },
      {
        property: "og:description",
        content: "Profile, accounts and transaction history for a user.",
      },
    ],
  }),
  component: () => (
    <AdminRoute>
      <AdminUserDetailsPage />
    </AdminRoute>
  ),
});

function AdminUserDetailsPage() {
  const { id } = Route.useParams();
  const queryClient = useQueryClient();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const userQuery = useQuery({ queryKey: ["user", id], queryFn: () => usersApi.getById(id) });
  const accountsQuery = useQuery({
    queryKey: ["accounts", "owner", id],
    queryFn: () => accountsApi.listByOwner(id),
  });
  const transactionsQuery = useQuery({
    queryKey: ["transactions", "user", id],
    queryFn: () => transactionsApi.list({ userId: id, pageSize: 10 }),
  });

  const mutation = useMutation({
    mutationFn: () =>
      usersApi.setStatus(id, userQuery.data?.status === "BLOCKED" ? "ACTIVE" : "BLOCKED"),
    onSuccess: async () => {
      toast.success("The user status has been updated.");
      await queryClient.invalidateQueries();
      setConfirmOpen(false);
    },
    onError: (error) => toast.error(errorMessage(error, "The user could not be updated.")),
  });

  if (userQuery.isPending)
    return (
      <AppLayout title="User details">
        <LoadingState label="Loading user" />
      </AppLayout>
    );

  if (userQuery.isError || !userQuery.data)
    return (
      <AppLayout title="User details">
        <ErrorState
          title="User unavailable"
          description="This user could not be loaded."
          onRetry={() => void userQuery.refetch()}
        />
      </AppLayout>
    );

  const profile = userQuery.data;

  return (
    <AppLayout
      title={profile.fullName}
      description="Profile details, linked accounts and transaction history."
      actions={
        <Button
          variant={profile.status === "BLOCKED" ? "secondary" : "danger"}
          onClick={() => setConfirmOpen(true)}
        >
          {profile.status === "BLOCKED" ? "Unblock user" : "Block user"}
        </Button>
      }
    >
      <Card>
        <DetailRow label="Full name" separated={false}>
          {profile.fullName}
        </DetailRow>
        <DetailRow label="Email" separated={false}>
          {profile.email}
        </DetailRow>
        <DetailRow label="Role" separated={false}>
          <StatusBadge status={profile.role} />
        </DetailRow>
        <DetailRow label="Status" separated={false}>
          <StatusBadge status={profile.status} />
        </DetailRow>
        <DetailRow label="Two-factor authentication" separated={false}>
          {profile.twoFactorEnabled ? "Enabled" : "Disabled"}
        </DetailRow>
        <DetailRow label="Created at" separated={false}>
          {formatDate(profile.createdAt)}
        </DetailRow>
      </Card>

      <section className="flex flex-col gap-[var(--spacing-5xl)]">
        <h2 className="text-lg font-semibold text-[var(--semantic-text-secondary)]">Accounts</h2>
        <Card className="!rounded-none !border-0 !bg-transparent !p-0">
          {accountsQuery.isPending ? <TableSkeleton rows={3} /> : null}
          {accountsQuery.data?.length === 0 ? (
            <EmptyState title="This user has no accounts yet." />
          ) : null}
          {accountsQuery.data && accountsQuery.data.length > 0 ? (
            <DataTable
              caption="User accounts"
              rows={accountsQuery.data}
              getRowId={(a) => a.id}
              columns={[
                {
                  key: "number",
                  header: "Account Number",
                  render: (a) => (
                    <Link
                      to="/admin/accounts/$id"
                      params={{ id: a.id }}
                      className="text-[var(--semantic-primary-selected)] hover:underline"
                    >
                      {a.accountNumber}
                    </Link>
                  ),
                },
                {
                  key: "balance",
                  header: "Balance",
                  render: (a) => formatMoney(a.balance, a.currency),
                },
                {
                  key: "status",
                  header: "Status",
                  render: (a) => <StatusBadge status={a.status} />,
                },
                {
                  key: "created",
                  header: "Created At",
                  render: (a) => formatDate(a.createdAt),
                  hideOnMobile: true,
                },
              ]}
            />
          ) : null}
        </Card>
      </section>

      <section className="flex flex-col gap-[var(--spacing-5xl)]">
        <h2 className="text-lg font-semibold text-[var(--semantic-text-secondary)]">
          Recent transactions
        </h2>
        <Card className="!rounded-none !border-0 !bg-transparent !p-0">
          {transactionsQuery.isPending ? <TableSkeleton /> : null}
          {transactionsQuery.data?.items.length === 0 ? (
            <EmptyState title="No transactions match the selected filters." />
          ) : null}
          {transactionsQuery.data && transactionsQuery.data.items.length > 0 ? (
            <DataTable
              caption="User transactions"
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
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={profile.status === "BLOCKED" ? "Unblock user?" : "Block user?"}
        description={
          profile.status === "BLOCKED"
            ? `${profile.fullName} will regain access to the platform.`
            : `${profile.fullName} will be denied access until unblocked.`
        }
        confirmLabel={profile.status === "BLOCKED" ? "Unblock" : "Block"}
        destructive={profile.status !== "BLOCKED"}
        loading={mutation.isPending}
        onConfirm={() => mutation.mutate()}
      />
    </AppLayout>
  );
}
