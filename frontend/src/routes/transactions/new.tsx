import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { accountsApi } from "@/api/accountsApi";
import { transactionsApi } from "@/api/transactionsApi";
import { AppLayout } from "@/components/layout/AppLayout";
import { UserRoute } from "@/components/guards";
import { Button, Card, MoneyField, SelectField, TextField } from "@/components/ui-kit";
import { ConfirmationDialog } from "@/components/modals";
import { LoadingState } from "@/components/data-display";
import { useAuth } from "@/contexts/AuthContext";
import { errorMessage, formatMoney } from "@/lib/format";
import type { TransactionType } from "@/types";

const TYPES = ["DEPOSIT", "WITHDRAWAL", "TRANSFER"] as const;

const schema = z
  .object({
    type: z.enum(TYPES),
    sourceAccountId: z.string().min(1, "Select an account."),
    destinationAccountNumber: z.string().trim().max(34).optional(),
    amount: z
      .string()
      .min(1, "Enter an amount.")
      .refine((v) => Number(v) > 0, "Amount must be greater than zero."),
    description: z.string().trim().max(200, "Description is too long.").optional(),
  })
  .refine(
    (values) => values.type !== "TRANSFER" || Boolean(values.destinationAccountNumber?.trim()),
    { path: ["destinationAccountNumber"], message: "Enter the destination account number." },
  );

type FormValues = z.infer<typeof schema>;

export const Route = createFileRoute("/transactions/new")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>) => ({
    type: TYPES.includes(search.type as TransactionType)
      ? (search.type as TransactionType)
      : undefined,
  }),
  head: () => ({
    meta: [
      { title: "New transaction — Suspicious Transaction Detection System" },
      { name: "description", content: "Create a deposit, withdrawal or transfer." },
      { property: "og:title", content: "New transaction" },
      { property: "og:description", content: "Create a deposit, withdrawal or transfer." },
    ],
  }),
  component: () => (
    <UserRoute>
      <NewTransactionPage />
    </UserRoute>
  ),
});

function NewTransactionPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { type: presetType } = Route.useSearch();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, setPending] = useState<FormValues | null>(null);

  const accountsQuery = useQuery({
    queryKey: ["accounts", "mine", user?.profileId],
    queryFn: () => accountsApi.listByOwner(user?.profileId ?? ""),
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: presetType ?? "DEPOSIT",
      sourceAccountId: "",
      destinationAccountNumber: "",
      amount: "",
      description: "",
    },
  });

  const type = watch("type");
  const sourceAccountId = watch("sourceAccountId");
  const activeAccounts = (accountsQuery.data ?? []).filter((a) => a.status === "ACTIVE");
  const selectedAccount = activeAccounts.find((a) => a.id === sourceAccountId);

  useEffect(() => {
    if (!sourceAccountId && activeAccounts[0]) setValue("sourceAccountId", activeAccounts[0].id);
  }, [activeAccounts, setValue, sourceAccountId]);

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      transactionsApi.create(
        {
          type: values.type,
          sourceAccountId: values.sourceAccountId,
          destinationAccountNumber: values.destinationAccountNumber?.trim() || undefined,
          amount: Number(values.amount),
          description: values.description?.trim() || undefined,
        },
        { id: user?.profileId ?? "", fullName: user?.fullName ?? "" },
      ),
    onSuccess: async (transaction) => {
      toast.success(`Transaction ${transaction.referenceNumber} was created.`);
      await queryClient.invalidateQueries();
      setConfirmOpen(false);
      void navigate({ to: "/transactions/$id", params: { id: transaction.id } });
    },
    onError: (error) => {
      toast.error(errorMessage(error, "The transaction could not be created."));
      setConfirmOpen(false);
    },
  });

  if (accountsQuery.isPending) {
    return (
      <AppLayout title="New Transaction">
        <LoadingState label="Loading your accounts" />
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="New Transaction"
      description="Deposits, withdrawals and transfers are analysed for anomalies after submission."
      hidePageHeader
    >
      <div className="flex min-h-0 flex-1 items-center justify-center pb-[var(--spacing-5xl)]">
        <Card className="h-full max-h-[720px] w-full max-w-[550px]">
          <form
            className="flex h-full min-h-0 flex-col"
            noValidate
            onSubmit={handleSubmit((values) => {
              setPending(values);
              setConfirmOpen(true);
            })}
          >
            <div className="flex shrink-0 flex-col gap-[var(--spacing-lg)] pb-[var(--spacing-5xl)]">
              <h1 className="text-2xl font-semibold text-[var(--semantic-text-secondary)]">
                New Transaction
              </h1>
              <p className="text-sm text-[var(--semantic-text-primary)]">
                Deposits, withdrawals and transfers are analysed for anomalies after submission.
              </p>
            </div>

            <div className="scrollbar-hidden flex min-h-0 flex-1 flex-col gap-[var(--spacing-6xl)] overflow-y-auto overscroll-contain py-[var(--spacing-5xl)]">
              <SelectField
                label="Transaction Type"
                required
                options={[
                  { value: "DEPOSIT", label: "Deposit" },
                  { value: "WITHDRAWAL", label: "Withdrawal" },
                  { value: "TRANSFER", label: "Transfer" },
                ]}
                value={type}
                error={errors.type?.message}
                {...register("type")}
              />

              <SelectField
                label="Source Account"
                required
                placeholder="Select an account"
                options={activeAccounts.map((a) => ({
                  value: a.id,
                  label: `${a.accountNumber} - ${formatMoney(a.balance, a.currency)}`,
                }))}
                value={sourceAccountId}
                error={errors.sourceAccountId?.message}
                {...register("sourceAccountId")}
              />

              {type === "TRANSFER" ? (
                <TextField
                  label="Destination Account Number"
                  required
                  placeholder="e.g. ACC-100244"
                  error={errors.destinationAccountNumber?.message}
                  {...register("destinationAccountNumber")}
                />
              ) : null}

              <MoneyField
                label="Amount"
                required
                inputMode="decimal"
                placeholder="0.00"
                hint={
                  selectedAccount
                    ? `Available balance: ${formatMoney(selectedAccount.balance, selectedAccount.currency)}`
                    : undefined
                }
                error={errors.amount?.message}
                {...register("amount")}
              />

              <TextField
                label="Description"
                placeholder="Optional note"
                error={errors.description?.message}
                {...register("description")}
              />
            </div>

            <div className="flex shrink-0 flex-col gap-[var(--spacing-3xl)] pt-[var(--spacing-5xl)]">
              {activeAccounts.length === 0 ? (
                <p className="text-sm text-[var(--semantic-error-selected)]">
                  You have no active account available for transactions.
                </p>
              ) : null}
              <div className="flex flex-wrap justify-end gap-[var(--spacing-2xl)]">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => void navigate({ to: "/transactions" })}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={activeAccounts.length === 0}>
                  Submit Transaction
                </Button>
              </div>
            </div>
          </form>
        </Card>
      </div>

      <ConfirmationDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Confirm transaction"
        description={
          pending
            ? `${pending.type.toLowerCase()} of ${formatMoney(Number(pending.amount), selectedAccount?.currency ?? "EUR")} from ${selectedAccount?.accountNumber ?? ""}.`
            : ""
        }
        confirmLabel="Confirm"
        loading={mutation.isPending}
        onConfirm={() => pending && mutation.mutate(pending)}
      />
    </AppLayout>
  );
}
