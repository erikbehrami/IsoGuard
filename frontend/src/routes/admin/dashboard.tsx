import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  CreditCard,
  Mail,
  ShieldAlert,
  UserCheck,
  UserX,
  Users,
  Wallet,
} from "lucide-react";
import { dashboardApi } from "@/api/dashboardApi";
import { anomaliesApi } from "@/api/anomaliesApi";
import { AppLayout } from "@/components/layout/AppLayout";
import { AdminRoute } from "@/components/guards";
import { Button, Card } from "@/components/ui-kit";
import { StatCard } from "@/components/domain";
import {
  AnomalyScoreBadge,
  DataTable,
  EmptyState,
  ErrorState,
  TableSkeleton,
  TransactionTypeBadge,
} from "@/components/data-display";
import { formatDateTime, formatMoney } from "@/lib/format";

export const Route = createFileRoute("/admin/dashboard")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Admin dashboard — Suspicious Transaction Detection System" },
      { name: "description", content: "Platform-wide users, accounts and anomaly statistics." },
      { property: "og:title", content: "Admin dashboard" },
      {
        property: "og:description",
        content: "Platform-wide users, accounts and anomaly statistics.",
      },
    ],
  }),
  component: () => (
    <AdminRoute>
      <AdminDashboardPage />
    </AdminRoute>
  ),
});

function AdminDashboardPage() {
  const statsQuery = useQuery({ queryKey: ["dashboard", "admin"], queryFn: dashboardApi.admin });
  const suspiciousQuery = useQuery({
    queryKey: ["anomalies", "recent"],
    queryFn: () => anomaliesApi.listSuspicious({ pageSize: 5 }),
  });

  return (
    <AppLayout
      title="Admin Dashboard"
      description="Overview of users, accounts and suspicious activity."
      actions={
        <>
          <Link to="/admin/invitations">
            <Button>
              <Mail aria-hidden className="size-4" /> Invite user
            </Button>
          </Link>
          <Link to="/admin/suspicious-transactions">
            <Button variant="outline">
              <ShieldAlert aria-hidden className="size-4" /> Review queue
            </Button>
          </Link>
        </>
      }
    >
      {statsQuery.isPending ? <TableSkeleton rows={4} /> : null}
      {statsQuery.isError ? <ErrorState onRetry={() => void statsQuery.refetch()} /> : null}

      {statsQuery.data ? (
        <div className="grid gap-[var(--spacing-5xl)] sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total users" value={statsQuery.data.totalUsers} icon={Users} />
          <StatCard label="Active users" value={statsQuery.data.activeUsers} icon={UserCheck} />
          <StatCard label="Blocked users" value={statsQuery.data.blockedUsers} icon={UserX} />
          <StatCard
            label="Pending invitations"
            value={statsQuery.data.pendingInvitations}
            icon={Mail}
          />
          <StatCard
            label="Users awaiting accounts"
            value={statsQuery.data.usersWithoutAccounts}
            icon={Wallet}
          />
          <StatCard label="Total accounts" value={statsQuery.data.totalAccounts} icon={Wallet} />
          <StatCard
            label="Active accounts"
            value={statsQuery.data.activeAccounts}
            icon={CreditCard}
          />
          <StatCard
            label="Total transactions"
            value={statsQuery.data.totalTransactions}
            icon={CreditCard}
          />
          <StatCard
            label="Suspicious transactions"
            value={statsQuery.data.suspiciousTransactions}
            icon={AlertTriangle}
            hint="Flagged by the Isolation Forest model."
          />
        </div>
      ) : null}

      <section className="flex flex-col gap-[var(--spacing-5xl)]">
        <h2 className="text-lg font-semibold text-[var(--semantic-text-secondary)]">
          Latest suspicious transactions
        </h2>
        <Card className="!p-0">
          {suspiciousQuery.isPending ? <TableSkeleton /> : null}
          {suspiciousQuery.isError ? (
            <ErrorState onRetry={() => void suspiciousQuery.refetch()} />
          ) : null}
          {suspiciousQuery.data?.items.length === 0 ? (
            <EmptyState title="No suspicious transactions have been detected." />
          ) : null}
          {suspiciousQuery.data && suspiciousQuery.data.items.length > 0 ? (
            <DataTable
              caption="Latest suspicious transactions"
              rows={suspiciousQuery.data.items}
              getRowId={(a) => a.transactionId}
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
                { key: "user", header: "User", render: (a) => a.userName, hideOnMobile: true },
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
              ]}
            />
          ) : null}
        </Card>
      </section>
    </AppLayout>
  );
}
