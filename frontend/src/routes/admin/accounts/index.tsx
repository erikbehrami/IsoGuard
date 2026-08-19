import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { accountsApi } from "@/api/accountsApi";
import { usersApi } from "@/api/usersApi";
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
import { ConfirmationDialog, Modal } from "@/components/modals";
import {
  DataTable,
  EmptyState,
  ErrorState,
  Pagination,
  StatusBadge,
  TableSkeleton,
} from "@/components/data-display";
import { errorMessage, formatDate, formatMoney } from "@/lib/format";
import type { Account, AccountFilters } from "@/types";

const schema = z.object({
  ownerId: z.string().min(1, "Select an account owner."),
  currency: z.string().min(1, "Select a currency."),
});

export const Route = createFileRoute("/admin/accounts/")({
  ssr: false,
  validateSearch: z.object({
    ownerId: z.string().optional(),
  }),
  head: () => ({
    meta: [
      { title: "Account management — Suspicious Transaction Detection System" },
      { name: "description", content: "Create accounts and manage their status and balances." },
      { property: "og:title", content: "Account management" },
      {
        property: "og:description",
        content: "Create accounts and manage their status and balances.",
      },
    ],
  }),
  component: () => (
    <AdminRoute>
      <AdminAccountsPage />
    </AdminRoute>
  ),
});

function AdminAccountsPage() {
  const search = Route.useSearch();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<AccountFilters>({ page: 1, pageSize: 10 });
  const [createOpen, setCreateOpen] = useState(Boolean(search.ownerId));
  const [target, setTarget] = useState<Account | null>(null);

  const query = useQuery({
    queryKey: ["accounts", filters],
    queryFn: () => accountsApi.list(filters),
  });
  const ownersQuery = useQuery({
    queryKey: ["users", "options"],
    queryFn: () => usersApi.list({ pageSize: 100 }).then((r) => r.items),
  });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { ownerId: search.ownerId ?? "", currency: "EUR" },
  });
  const selectedOwnerId = watch("ownerId");
  const selectedCurrency = watch("currency");

  const createMutation = useMutation({
    mutationFn: (values: z.infer<typeof schema>) => accountsApi.create(values),
    onSuccess: async (account) => {
      toast.success(`Account ${account.accountNumber} has been created.`);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["accounts"] }),
        queryClient.invalidateQueries({ queryKey: ["users"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
      ]);
      reset();
      setCreateOpen(false);
    },
    onError: (error) => toast.error(errorMessage(error, "The account could not be created.")),
  });

  const statusMutation = useMutation({
    mutationFn: (account: Account) =>
      accountsApi.setStatus(account.id, account.status === "BLOCKED" ? "ACTIVE" : "BLOCKED"),
    onSuccess: async () => {
      toast.success("The account status has been updated.");
      await queryClient.invalidateQueries({ queryKey: ["accounts"] });
      setTarget(null);
    },
    onError: (error) => toast.error(errorMessage(error, "The account could not be updated.")),
  });

  const update = (patch: Partial<AccountFilters>) =>
    setFilters((prev) => ({ ...prev, ...patch, page: patch.page ?? 1 }));
  const hasActiveFilters = Boolean(filters.search || filters.status);

  return (
    <AppLayout
      title="Account Management"
      description="All financial accounts across the platform."
      actions={<Button onClick={() => setCreateOpen(true)}>Create account</Button>}
      lockViewport
      compactBottomPadding
    >
      <FilterBar>
        <SearchInput
          filterAlignment="left"
          label="Search accounts"
          placeholder="Search by account number or owner"
          value={filters.search ?? ""}
          onChange={(search) => update({ search })}
        />
        <SelectField
          label="Status"
          placeholder="All statuses"
          options={[
            { value: "ACTIVE", label: "Active" },
            { value: "BLOCKED", label: "Blocked" },
            { value: "CLOSED", label: "Closed" },
          ]}
          value={filters.status ?? ""}
          onChange={(e) => update({ status: e.target.value as AccountFilters["status"] })}
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
          <EmptyState title="No accounts match the selected filters." />
        ) : null}
        {query.data && query.data.items.length > 0 ? (
          <>
            <DataTable
              caption="Accounts"
              rows={query.data.items}
              getRowId={(a) => a.id}
              containerClassName="scrollbar-hidden min-h-0 flex-1 overflow-auto"
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
                { key: "owner", header: "Owner", render: (a) => a.ownerName },
                {
                  key: "balance",
                  header: "Balance",
                  render: (a) => formatMoney(a.balance, a.currency),
                },
                {
                  key: "currency",
                  header: "Currency",
                  render: (a) => a.currency,
                  hideOnMobile: true,
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
                {
                  key: "actions",
                  header: "Actions",
                  render: (a) => (
                    <Button
                      size="small"
                      variant={a.status === "BLOCKED" ? "secondary" : "danger"}
                      className="!h-[var(--spacing-8xl)] !px-[var(--spacing-4xl)] text-xs"
                      disabled={a.status === "CLOSED"}
                      onClick={() => setTarget(a)}
                    >
                      {a.status === "BLOCKED" ? "Unblock" : "Block"}
                    </Button>
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

      <Modal open={createOpen} onOpenChange={setCreateOpen} title="Create account">
        <form
          className="flex flex-col gap-[var(--spacing-6xl)]"
          noValidate
          onSubmit={handleSubmit((values) => createMutation.mutate(values))}
        >
          <SelectField
            label="Account Owner"
            required
            placeholder="Select a user"
            options={(ownersQuery.data ?? [])
              .filter((p) => p.role === "USER" && p.status === "ACTIVE")
              .map((p) => ({
                value: p.id,
                label: `${p.fullName} (${p.email})`,
              }))}
            value={selectedOwnerId}
            error={errors.ownerId?.message}
            {...register("ownerId")}
          />
          <SelectField
            label="Currency"
            required
            options={[
              { value: "EUR", label: "EUR" },
              { value: "USD", label: "USD" },
              { value: "GBP", label: "GBP" },
            ]}
            value={selectedCurrency}
            error={errors.currency?.message}
            {...register("currency")}
          />
          <div className="flex flex-wrap justify-end gap-[var(--spacing-2xl)]">
            <Button type="button" variant="secondary" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={createMutation.isPending}>
              Create account
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmationDialog
        open={Boolean(target)}
        onOpenChange={(open) => !open && setTarget(null)}
        title={target?.status === "BLOCKED" ? "Unblock account?" : "Block account?"}
        description={
          target?.status === "BLOCKED"
            ? `Transactions on ${target?.accountNumber} will be allowed again.`
            : `No transactions will be possible on ${target?.accountNumber} until it is unblocked.`
        }
        confirmLabel={target?.status === "BLOCKED" ? "Unblock" : "Block"}
        destructive={target?.status !== "BLOCKED"}
        loading={statusMutation.isPending}
        onConfirm={() => target && statusMutation.mutate(target)}
      />
    </AppLayout>
  );
}
