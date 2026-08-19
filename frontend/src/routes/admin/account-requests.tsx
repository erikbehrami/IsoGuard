import { useDeferredValue, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { accountRequestsApi } from "@/api/accountRequestsApi";
import { AppLayout } from "@/components/layout/AppLayout";
import { AdminRoute } from "@/components/guards";
import {
  Button,
  Card,
  ClearFiltersButton,
  FilterBar,
  SearchInput,
  SelectField,
  TextField,
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
import { errorMessage, formatDateTime } from "@/lib/format";
import type { AccountRequest, AccountRequestStatus } from "@/types";

export const Route = createFileRoute("/admin/account-requests")({
  ssr: false,
  component: () => (
    <AdminRoute>
      <AdminAccountRequestsPage />
    </AdminRoute>
  ),
});

function AdminAccountRequestsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<AccountRequestStatus | undefined>("PENDING");
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [approveTarget, setApproveTarget] = useState<AccountRequest | null>(null);
  const [rejectTarget, setRejectTarget] = useState<AccountRequest | null>(null);
  const [note, setNote] = useState("");
  const query = useQuery({
    queryKey: ["account-requests", "admin", page, status, deferredSearch],
    queryFn: () => accountRequestsApi.list(page, status, deferredSearch),
  });

  const decide = useMutation({
    mutationFn: ({
      request,
      decision,
      reason,
    }: {
      request: AccountRequest;
      decision: "APPROVED" | "REJECTED";
      reason?: string;
    }) => accountRequestsApi.decide(request.id, decision, reason),
    onSuccess: async (result) => {
      toast.success(
        result.status === "APPROVED"
          ? `An account has been created for ${result.requestedBy}.`
          : `The request from ${result.requestedBy} has been rejected.`,
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["account-requests"] }),
        queryClient.invalidateQueries({ queryKey: ["accounts"] }),
        queryClient.invalidateQueries({ queryKey: ["users"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
      ]);
      setApproveTarget(null);
      setRejectTarget(null);
      setNote("");
    },
    onError: (error) => toast.error(errorMessage(error, "The request could not be updated.")),
  });

  return (
    <AppLayout
      title="Account Requests"
      description="Review and decide financial account requests submitted by users."
      lockViewport
      compactBottomPadding
    >
      <FilterBar>
        <SearchInput
          filterAlignment="left"
          label="Search requests"
          placeholder="Search by name or email"
          value={search}
          onChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
        />
        <SelectField
          label="Status"
          placeholder="All statuses"
          options={[
            { value: "PENDING", label: "Pending" },
            { value: "APPROVED", label: "Approved" },
            { value: "REJECTED", label: "Rejected" },
          ]}
          value={status ?? ""}
          onChange={(event) => {
            setStatus((event.target.value || undefined) as AccountRequestStatus | undefined);
            setPage(1);
          }}
        />
        <ClearFiltersButton
          active={Boolean(search || status)}
          onClear={() => {
            setSearch("");
            setStatus(undefined);
            setPage(1);
          }}
        />
      </FilterBar>

      <Card className="flex min-h-0 flex-1 flex-col overflow-hidden !rounded-none !border-0 !bg-transparent !p-0">
        {query.isPending ? <TableSkeleton /> : null}
        {query.isError ? <ErrorState onRetry={() => void query.refetch()} /> : null}
        {query.data?.items.length === 0 ? (
          <EmptyState title="No account requests match the selected filters." />
        ) : null}
        {query.data && query.data.items.length > 0 ? (
          <>
            <DataTable
              caption="Account requests"
              rows={query.data.items}
              getRowId={(item) => item.id}
              containerClassName="scrollbar-hidden min-h-0 flex-1 overflow-auto"
              columns={[
                { key: "user", header: "User", render: (item) => item.requestedBy },
                { key: "email", header: "Email", render: (item) => item.email, hideOnMobile: true },
                { key: "currency", header: "Currency", render: (item) => item.currency },
                {
                  key: "status",
                  header: "Status",
                  render: (item) => <StatusBadge status={item.status} />,
                },
                {
                  key: "created",
                  header: "Requested At",
                  render: (item) => formatDateTime(item.createdAt),
                },
                {
                  key: "actions",
                  header: "Actions",
                  render: (item) =>
                    item.status === "PENDING" ? (
                      <div className="flex flex-wrap gap-[var(--spacing-2xl)]">
                        <Button size="small" onClick={() => setApproveTarget(item)}>
                          Approve
                        </Button>
                        <Button size="small" variant="danger" onClick={() => setRejectTarget(item)}>
                          Reject
                        </Button>
                      </div>
                    ) : (
                      (item.decisionNote ?? "-")
                    ),
                },
              ]}
            />
            <Pagination
              page={query.data.page}
              totalPages={query.data.totalPages}
              totalItems={query.data.totalItems}
              onPageChange={setPage}
            />
          </>
        ) : null}
      </Card>

      <ConfirmationDialog
        open={Boolean(approveTarget)}
        onOpenChange={(open) => !open && setApproveTarget(null)}
        title="Approve account request?"
        description={`A new active ${approveTarget?.currency ?? ""} account will be created for ${approveTarget?.requestedBy ?? ""}.`}
        confirmLabel="Approve and create"
        loading={decide.isPending}
        onConfirm={() =>
          approveTarget && decide.mutate({ request: approveTarget, decision: "APPROVED" })
        }
      />

      <Modal
        open={Boolean(rejectTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setRejectTarget(null);
            setNote("");
          }
        }}
        title="Reject account request"
      >
        <div className="flex flex-col gap-[var(--spacing-5xl)]">
          <TextField
            label="Reason"
            required
            placeholder="Explain why the request was rejected"
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
          <div className="flex justify-end gap-[var(--spacing-2xl)]">
            <Button variant="secondary" onClick={() => setRejectTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              disabled={!note.trim()}
              loading={decide.isPending}
              onClick={() =>
                rejectTarget &&
                decide.mutate({
                  request: rejectTarget,
                  decision: "REJECTED",
                  reason: note.trim(),
                })
              }
            >
              Reject request
            </Button>
          </div>
        </div>
      </Modal>
    </AppLayout>
  );
}
