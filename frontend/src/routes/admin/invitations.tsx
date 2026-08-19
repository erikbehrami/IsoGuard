import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { invitationsApi } from "@/api/invitationsApi";
import { AppLayout } from "@/components/layout/AppLayout";
import { AdminRoute } from "@/components/guards";
import { Button, Card, TextField } from "@/components/ui-kit";
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
import type { Invitation } from "@/types";

const schema = z.object({
  email: z.string().trim().email("Enter a valid email address.").max(255),
});

export const Route = createFileRoute("/admin/invitations")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Invitations — Suspicious Transaction Detection System" },
      { name: "description", content: "Invite new users and manage pending invitations." },
      { property: "og:title", content: "Invitations" },
      { property: "og:description", content: "Invite new users and manage pending invitations." },
    ],
  }),
  component: () => (
    <AdminRoute>
      <AdminInvitationsPage />
    </AdminRoute>
  ),
});

function AdminInvitationsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<Invitation | null>(null);

  const query = useQuery({
    queryKey: ["invitations", page],
    queryFn: () => invitationsApi.list(page, 10),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["invitations"] });

  const inviteMutation = useMutation({
    mutationFn: (values: z.infer<typeof schema>) => invitationsApi.invite(values),
    onSuccess: async (invitation) => {
      toast.success(`An invitation has been sent to ${invitation.email}.`);
      await invalidate();
      reset();
      setInviteOpen(false);
    },
    onError: (error) => toast.error(errorMessage(error, "The invitation could not be sent.")),
  });

  const resendMutation = useMutation({
    mutationFn: (id: string) => invitationsApi.resend(id),
    onSuccess: async () => {
      toast.success("The invitation has been resent.");
      await invalidate();
    },
    onError: (error) => toast.error(errorMessage(error, "The invitation could not be resent.")),
  });

  const revokeMutation = useMutation({
    mutationFn: (id: string) => invitationsApi.revoke(id),
    onSuccess: async () => {
      toast.success("The invitation has been revoked.");
      await invalidate();
      setRevokeTarget(null);
    },
    onError: (error) => toast.error(errorMessage(error, "The invitation could not be revoked.")),
  });

  return (
    <AppLayout
      title="Invitations"
      description="Invite users by email and track invitation status."
      actions={<Button onClick={() => setInviteOpen(true)}>Invite user</Button>}
      lockViewport
      compactBottomPadding
    >
      <Card className="flex min-h-0 flex-1 flex-col overflow-hidden !rounded-none !border-0 !bg-transparent !p-0">
        {query.isPending ? <TableSkeleton /> : null}
        {query.isError ? <ErrorState onRetry={() => void query.refetch()} /> : null}
        {query.data?.items.length === 0 ? (
          <EmptyState
            title="No invitations have been sent yet."
            action={<Button onClick={() => setInviteOpen(true)}>Invite user</Button>}
          />
        ) : null}
        {query.data && query.data.items.length > 0 ? (
          <>
            <DataTable
              caption="Invitations"
              rows={query.data.items}
              getRowId={(i) => i.id}
              containerClassName="scrollbar-hidden min-h-0 flex-1 overflow-auto"
              columns={[
                { key: "email", header: "Email", render: (i) => i.email },
                {
                  key: "role",
                  header: "Invited Role",
                  render: (i) => <StatusBadge status={i.invitedRole} />,
                },
                {
                  key: "status",
                  header: "Status",
                  render: (i) => <StatusBadge status={i.status} />,
                },
                {
                  key: "invitedBy",
                  header: "Invited By",
                  render: (i) => i.invitedBy,
                  hideOnMobile: true,
                },
                {
                  key: "created",
                  header: "Created At",
                  render: (i) => formatDateTime(i.createdAt),
                  hideOnMobile: true,
                },
                {
                  key: "expires",
                  header: "Expires At",
                  render: (i) => formatDateTime(i.expiresAt),
                  hideOnMobile: true,
                },
                {
                  key: "actions",
                  header: "Actions",
                  render: (i) => (
                    <div className="flex flex-wrap gap-[var(--spacing-2xl)]">
                      <Button
                        size="small"
                        variant="secondary"
                        disabled={!["PENDING", "EXPIRED", "REVOKED"].includes(i.status)}
                        loading={resendMutation.isPending && resendMutation.variables === i.id}
                        onClick={() => resendMutation.mutate(i.id)}
                      >
                        Resend
                      </Button>
                      <Button
                        size="small"
                        variant="danger"
                        disabled={i.status !== "PENDING"}
                        onClick={() => setRevokeTarget(i)}
                      >
                        Revoke
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
              onPageChange={setPage}
            />
          </>
        ) : null}
      </Card>

      <Modal open={inviteOpen} onOpenChange={setInviteOpen} title="Invite a user">
        <form
          className="flex flex-col gap-[var(--spacing-6xl)]"
          noValidate
          onSubmit={handleSubmit((values) => inviteMutation.mutate(values))}
        >
          <TextField
            label="Email"
            type="email"
            required
            placeholder="name@example.com"
            error={errors.email?.message}
            {...register("email")}
          />
          <div className="flex flex-wrap justify-end gap-[var(--spacing-2xl)]">
            <Button type="button" variant="secondary" onClick={() => setInviteOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={inviteMutation.isPending}>
              Send invitation
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmationDialog
        open={Boolean(revokeTarget)}
        onOpenChange={(open) => !open && setRevokeTarget(null)}
        title="Revoke invitation?"
        description={`The invitation link sent to ${revokeTarget?.email ?? ""} will stop working.`}
        confirmLabel="Revoke"
        destructive
        loading={revokeMutation.isPending}
        onConfirm={() => revokeTarget && revokeMutation.mutate(revokeTarget.id)}
      />
    </AppLayout>
  );
}
