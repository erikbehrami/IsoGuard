import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowDownLeft, ArrowUpRight, Repeat, Shield, User } from "lucide-react";
import { dashboardApi } from "@/api/dashboardApi";
import { transactionsApi } from "@/api/transactionsApi";
import { AppLayout } from "@/components/layout/AppLayout";
import { UserRoute } from "@/components/guards";
import { Button, Card } from "@/components/ui-kit";
import { AccountCard, StatCard } from "@/components/domain";
import {
  DataTable,
  EmptyState,
  ErrorState,
  StatusBadge,
  TableSkeleton,
  TransactionTypeBadge,
} from "@/components/data-display";
import { useAuth } from "@/contexts/AuthContext";
import { formatDateTime, formatMoney } from "@/lib/format";

export const Route = createFileRoute("/dashboard")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Dashboard — Suspicious Transaction Detection System" },
      { name: "description", content: "Your balances, accounts and recent transactions." },
      { property: "og:title", content: "Dashboard" },
      { property: "og:description", content: "Your balances, accounts and recent transactions." },
    ],
  }),
  component: () => (
    <UserRoute>
      <UserDashboardPage />
    </UserRoute>
  ),
});

function UserDashboardPage() {
  const { user } = useAuth();
  const profileId = user?.profileId ?? "";

  const dashboardQuery = useQuery({
    queryKey: ["dashboard", "user", profileId],
    queryFn: () => dashboardApi.user(profileId, user?.fullName ?? ""),
  });

  const transactionsQuery = useQuery({
    queryKey: ["transactions", "recent", profileId],
    queryFn: () => transactionsApi.listForUser(profileId, { pageSize: 5 }),
  });
  const hasActiveAccount = Boolean(
    dashboardQuery.data?.accounts.some((account) => account.status === "ACTIVE"),
  );

  return (
    <AppLayout
      title={`Welcome back, ${user?.fullName ?? ""}`}
      description="An overview of your accounts and latest activity."
      actions={
        <>
          {hasActiveAccount ? (
            <Link to="/transactions/new" search={{ type: undefined }}>
              <Button>New Transaction</Button>
            </Link>
          ) : (
            <Button disabled>New Transaction</Button>
          )}
          <Link to="/profile">
            <Button variant="secondary" size="medium">
              <User aria-hidden className="size-4" /> Profile
            </Button>
          </Link>
          <Link to="/security">
            <Button variant="secondary" size="medium">
              <Shield aria-hidden className="size-4" /> Security
            </Button>
          </Link>
        </>
      }
    >
      {dashboardQuery.isPending ? <TableSkeleton rows={3} /> : null}
      {dashboardQuery.isError ? <ErrorState onRetry={() => void dashboardQuery.refetch()} /> : null}

      {dashboardQuery.data ? (
        <>
          <div className="grid gap-[var(--spacing-5xl)] sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Total available balance"
              value={formatMoney(dashboardQuery.data.totalBalance, dashboardQuery.data.currency)}
            />
            <StatCard label="Accounts" value={dashboardQuery.data.accounts.length} />
            <StatCard
              label="Active accounts"
              value={dashboardQuery.data.accounts.filter((a) => a.status === "ACTIVE").length}
            />
            <StatCard
              label="Two-factor authentication"
              value={user?.twoFactorEnabled ? "Enabled" : "Disabled"}
            />
          </div>

          {hasActiveAccount ? (
            <section className="flex flex-col gap-[var(--spacing-5xl)]">
              <h2 className="text-lg font-semibold text-[var(--semantic-text-secondary)]">
                Quick actions
              </h2>
              <div className="flex flex-wrap gap-[var(--spacing-2xl)]">
                <Link to="/transactions/new" search={{ type: "DEPOSIT" }}>
                  <Button variant="outline">
                    <ArrowDownLeft aria-hidden className="size-4" /> Deposit
                  </Button>
                </Link>
                <Link to="/transactions/new" search={{ type: "WITHDRAWAL" }}>
                  <Button variant="outline">
                    <ArrowUpRight aria-hidden className="size-4" /> Withdrawal
                  </Button>
                </Link>
                <Link to="/transactions/new" search={{ type: "TRANSFER" }}>
                  <Button variant="outline">
                    <Repeat aria-hidden className="size-4" /> Transfer
                  </Button>
                </Link>
              </div>
            </section>
          ) : null}

          <section className="flex flex-col gap-[var(--spacing-5xl)]">
            <h2 className="text-lg font-semibold text-[var(--semantic-text-secondary)]">
              My accounts
            </h2>
            {dashboardQuery.data.accounts.length === 0 ? (
              <Card>
                <EmptyState
                  title="No financial account is assigned yet."
                  description="Submit an account request for an administrator to review before you can make transactions."
                  action={
                    <Link to="/accounts">
                      <Button>Request an account</Button>
                    </Link>
                  }
                />
              </Card>
            ) : (
              <div className="grid gap-[var(--spacing-5xl)] sm:grid-cols-2 xl:grid-cols-3">
                {dashboardQuery.data.accounts.map((account) => (
                  <AccountCard
                    key={account.id}
                    accountNumber={account.accountNumber}
                    balance={account.balance}
                    currency={account.currency}
                    status={account.status}
                    to={{ id: account.id }}
                  />
                ))}
              </div>
            )}
          </section>
        </>
      ) : null}

      <section className="flex flex-col gap-[var(--spacing-5xl)] pb-[var(--spacing-5xl)]">
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
              caption="Recent transactions"
              rows={transactionsQuery.data.items}
              getRowId={(t) => t.id}
              columns={[
                {
                  key: "reference",
                  header: "Reference",
                  render: (t) => (
                    <Link
                      to="/transactions/$id"
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
    </AppLayout>
  );
}
