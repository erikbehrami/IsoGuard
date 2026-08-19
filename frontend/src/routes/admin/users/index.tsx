import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
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
import { ConfirmationDialog } from "@/components/modals";
import {
  DataTable,
  EmptyState,
  ErrorState,
  Pagination,
  StatusBadge,
  TableSkeleton,
} from "@/components/data-display";
import { errorMessage, formatDate } from "@/lib/format";
import type { Profile, UserFilters } from "@/types";

export const Route = createFileRoute("/admin/users/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "User management — Suspicious Transaction Detection System" },
      { name: "description", content: "Search, filter, block and unblock platform users." },
      { property: "og:title", content: "User management" },
      { property: "og:description", content: "Search, filter, block and unblock platform users." },
    ],
  }),
  component: () => (
    <AdminRoute>
      <AdminUsersPage />
    </AdminRoute>
  ),
});

function AdminUsersPage() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<UserFilters>({ page: 1, pageSize: 10 });
  const [target, setTarget] = useState<Profile | null>(null);

  const query = useQuery({
    queryKey: ["users", filters],
    queryFn: () => usersApi.list(filters),
  });

  const mutation = useMutation({
    mutationFn: (profile: Profile) =>
      usersApi.setStatus(profile.id, profile.status === "BLOCKED" ? "ACTIVE" : "BLOCKED"),
    onSuccess: async (profile) => {
      toast.success(
        profile.status === "BLOCKED"
          ? `${profile.fullName} has been blocked.`
          : `${profile.fullName} has been unblocked.`,
      );
      await queryClient.invalidateQueries({ queryKey: ["users"] });
      setTarget(null);
    },
    onError: (error) => toast.error(errorMessage(error, "The user could not be updated.")),
  });

  const update = (patch: Partial<UserFilters>) =>
    setFilters((prev) => ({ ...prev, ...patch, page: patch.page ?? 1 }));
  const hasActiveFilters = Boolean(
    filters.search || filters.role || filters.status || filters.twoFactor,
  );

  return (
    <AppLayout
      title="User Management"
      description="All registered profiles with role and status."
      lockViewport
      compactBottomPadding
      actions={
        <Link to="/admin/invitations">
          <Button>Invite user</Button>
        </Link>
      }
    >
      <FilterBar>
        <SearchInput
          filterAlignment="left"
          label="Search users"
          placeholder="Search by name or email"
          value={filters.search ?? ""}
          onChange={(search) => update({ search })}
        />
        <SelectField
          label="Role"
          placeholder="All roles"
          options={[
            { value: "ADMIN", label: "Admin" },
            { value: "USER", label: "User" },
          ]}
          value={filters.role ?? ""}
          onChange={(e) => update({ role: e.target.value as UserFilters["role"] })}
        />
        <SelectField
          label="Status"
          placeholder="All statuses"
          options={[
            { value: "ACTIVE", label: "Active" },
            { value: "INACTIVE", label: "Inactive" },
            { value: "BLOCKED", label: "Blocked" },
          ]}
          value={filters.status ?? ""}
          onChange={(e) => update({ status: e.target.value as UserFilters["status"] })}
        />
        <SelectField
          label="Two-factor"
          placeholder="Any"
          options={[
            { value: "true", label: "Enabled" },
            { value: "false", label: "Disabled" },
          ]}
          value={filters.twoFactor ?? ""}
          onChange={(e) => update({ twoFactor: e.target.value as UserFilters["twoFactor"] })}
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
          <EmptyState title="No users match the selected filters." />
        ) : null}
        {query.data && query.data.items.length > 0 ? (
          <>
            <DataTable
              caption="Users"
              rows={query.data.items}
              getRowId={(p) => p.id}
              containerClassName="scrollbar-hidden min-h-0 flex-1 overflow-auto"
              columns={[
                {
                  key: "name",
                  header: "Full Name",
                  render: (p) => (
                    <Link
                      to="/admin/users/$id"
                      params={{ id: p.id }}
                      className="text-[var(--semantic-primary-selected)] hover:underline"
                    >
                      {p.fullName}
                    </Link>
                  ),
                },
                { key: "email", header: "Email", render: (p) => p.email, hideOnMobile: true },
                { key: "role", header: "Role", render: (p) => <StatusBadge status={p.role} /> },
                {
                  key: "status",
                  header: "Status",
                  render: (p) => <StatusBadge status={p.status} />,
                },
                {
                  key: "2fa",
                  header: "2FA",
                  render: (p) => (p.twoFactorEnabled ? "Enabled" : "Disabled"),
                  hideOnMobile: true,
                },
                {
                  key: "accounts",
                  header: "Accounts",
                  render: (p) =>
                    p.role === "USER" && p.accountCount === 0 ? (
                      <StatusBadge status="Awaiting account" />
                    ) : (
                      p.accountCount
                    ),
                  hideOnMobile: true,
                },
                {
                  key: "created",
                  header: "Created At",
                  render: (p) => formatDate(p.createdAt),
                  hideOnMobile: true,
                },
                {
                  key: "actions",
                  header: "Actions",
                  render: (p) => (
                    <div className="flex flex-wrap gap-[var(--spacing-2xl)]">
                      {p.role === "USER" && p.status === "ACTIVE" && p.accountCount === 0 ? (
                        <Link to="/admin/accounts" search={{ ownerId: p.id }}>
                          <Button size="small" variant="primary">
                            Create account
                          </Button>
                        </Link>
                      ) : null}
                      <Button
                        size="small"
                        variant={p.status === "BLOCKED" ? "secondary" : "danger"}
                        onClick={() => setTarget(p)}
                      >
                        {p.status === "BLOCKED" ? "Unblock" : "Block"}
                      </Button>
                    </div>
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

      <ConfirmationDialog
        open={Boolean(target)}
        onOpenChange={(open) => !open && setTarget(null)}
        title={target?.status === "BLOCKED" ? "Unblock user?" : "Block user?"}
        description={
          target?.status === "BLOCKED"
            ? `${target?.fullName} will regain access to the platform.`
            : `${target?.fullName} will be signed out and denied access until unblocked.`
        }
        confirmLabel={target?.status === "BLOCKED" ? "Unblock" : "Block"}
        destructive={target?.status !== "BLOCKED"}
        loading={mutation.isPending}
        onConfirm={() => target && mutation.mutate(target)}
      />
    </AppLayout>
  );
}
