import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { accountsApi } from "@/api/accountsApi";
import { accountRequestsApi } from "@/api/accountRequestsApi";
import { AppLayout } from "@/components/layout/AppLayout";
import { UserRoute } from "@/components/guards";
import { AccountCard } from "@/components/domain";
import { Button, Card, SelectField } from "@/components/ui-kit";
import {
  DataTable,
  EmptyState,
  ErrorState,
  StatusBadge,
  TableSkeleton,
} from "@/components/data-display";
import { useAuth } from "@/contexts/AuthContext";
import { errorMessage, formatDateTime } from "@/lib/format";

const CURRENCIES = ["EUR", "USD", "GBP"] as const;

export const Route = createFileRoute("/accounts/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "My accounts — Suspicious Transaction Detection System" },
      { name: "description", content: "Review your financial accounts and balances." },
      { property: "og:title", content: "My accounts" },
      { property: "og:description", content: "Review your financial accounts and balances." },
    ],
  }),
  component: () => (
    <UserRoute>
      <MyAccountsPage />
    </UserRoute>
  ),
});

function MyAccountsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [currency, setCurrency] = useState("EUR");
  const accountsQuery = useQuery({
    queryKey: ["accounts", "mine", user?.profileId],
    queryFn: () => accountsApi.listByOwner(user?.profileId ?? ""),
  });
  const requestsQuery = useQuery({
    queryKey: ["account-requests", "mine"],
    queryFn: () => accountRequestsApi.mine(),
  });
  const hasPending =
    requestsQuery.data?.items.some((request) => request.status === "PENDING") ?? false;
  const unavailableCurrencies = new Set(
    (accountsQuery.data ?? [])
      .filter((account) => account.status !== "CLOSED")
      .map((account) => account.currency),
  );
  const availableCurrencies = CURRENCIES.filter(
    (candidate) => !unavailableCurrencies.has(candidate),
  );

  useEffect(() => {
    if (!availableCurrencies.includes(currency as (typeof CURRENCIES)[number])) {
      setCurrency(availableCurrencies[0] ?? "");
    }
  }, [availableCurrencies, currency]);

  const requestMutation = useMutation({
    mutationFn: () => accountRequestsApi.submit(currency),
    onSuccess: async () => {
      toast.success("Your account request has been submitted.");
      await queryClient.invalidateQueries({ queryKey: ["account-requests"] });
    },
    onError: (error) =>
      toast.error(errorMessage(error, "The account request could not be submitted.")),
  });

  return (
    <AppLayout
      title="My Accounts"
      description="View your accounts and request another supported currency."
    >
      <section className="flex flex-col gap-[var(--spacing-5xl)]">
        <h2 className="text-lg font-semibold text-[var(--semantic-text-secondary)]">
          Assigned accounts
        </h2>
        {accountsQuery.isPending ? <TableSkeleton rows={3} /> : null}
        {accountsQuery.isError ? <ErrorState onRetry={() => void accountsQuery.refetch()} /> : null}
        {accountsQuery.data?.length === 0 ? (
          <Card>
            <EmptyState
              title="No accounts are available."
              description="Use the request form below to ask an administrator for an account."
            />
          </Card>
        ) : null}
        {accountsQuery.data && accountsQuery.data.length > 0 ? (
          <div className="grid gap-[var(--spacing-5xl)] sm:grid-cols-2 xl:grid-cols-3">
            {accountsQuery.data.map((account) => (
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
        ) : null}
      </section>

      <section className="grid gap-[var(--spacing-5xl)] pb-[var(--spacing-5xl)] xl:grid-cols-[minmax(280px,420px)_1fr]">
        <div className="flex flex-col gap-[var(--spacing-5xl)]">
          <h2 className="text-lg font-semibold text-[var(--semantic-text-secondary)]">
            Request an account
          </h2>
          <Card>
            {hasPending ? (
              <p className="text-sm text-[var(--semantic-text-primary)]">
                You already have a request awaiting administrator review.
              </p>
            ) : (
              <div className="flex flex-col gap-[var(--spacing-5xl)]">
                <SelectField
                  label="Preferred Currency"
                  options={availableCurrencies.map((value) => ({ value, label: value }))}
                  placeholder={
                    accountsQuery.isPending ? "Loading currencies" : "No currencies available"
                  }
                  value={currency}
                  disabled={accountsQuery.isPending || availableCurrencies.length === 0}
                  onChange={(event) => setCurrency(event.target.value)}
                />
                <p className="text-sm text-[var(--semantic-text-primary)]">
                  You may hold one non-closed account per currency and one pending request at a
                  time.
                </p>
                <Button
                  className="self-end"
                  loading={requestMutation.isPending}
                  disabled={accountsQuery.isPending || availableCurrencies.length === 0}
                  onClick={() => requestMutation.mutate()}
                >
                  Submit request
                </Button>
              </div>
            )}
          </Card>
        </div>

        <div className="flex min-w-0 flex-col gap-[var(--spacing-5xl)]">
          <h2 className="text-lg font-semibold text-[var(--semantic-text-secondary)]">
            Request history
          </h2>
          <Card className="!p-0">
            {requestsQuery.isPending ? <TableSkeleton /> : null}
            {requestsQuery.isError ? (
              <ErrorState onRetry={() => void requestsQuery.refetch()} />
            ) : null}
            {requestsQuery.data?.items.length === 0 ? (
              <EmptyState title="No account requests yet." />
            ) : null}
            {requestsQuery.data && requestsQuery.data.items.length > 0 ? (
              <DataTable
                caption="My account requests"
                rows={requestsQuery.data.items}
                getRowId={(request) => request.id}
                columns={[
                  {
                    key: "currency",
                    header: "Currency",
                    render: (request) => request.currency,
                  },
                  {
                    key: "status",
                    header: "Status",
                    render: (request) => <StatusBadge status={request.status} />,
                  },
                  {
                    key: "created",
                    header: "Requested At",
                    render: (request) => formatDateTime(request.createdAt),
                  },
                  {
                    key: "note",
                    header: "Decision Note",
                    render: (request) => request.decisionNote ?? "N/A",
                  },
                ]}
              />
            ) : null}
          </Card>
        </div>
      </section>
    </AppLayout>
  );
}
