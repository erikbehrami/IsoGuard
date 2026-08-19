import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { toast } from "sonner";
import { transactionsApi } from "@/api/transactionsApi";
import { anomaliesApi } from "@/api/anomaliesApi";
import { Button, Card } from "@/components/ui-kit";
import { ConfirmationDialog } from "@/components/modals";
import { DetailRow } from "@/components/domain";
import {
  AnomalyScoreBadge,
  ErrorState,
  LoadingState,
  StatusBadge,
  TransactionTypeBadge,
} from "@/components/data-display";
import { errorMessage, formatDateTime, formatMoney } from "@/lib/format";
import type { AnomalyReviewStatus } from "@/types";

export function TransactionDetailsView({
  transactionId,
  isAdmin,
}: {
  transactionId: string;
  isAdmin: boolean;
}) {
  const queryClient = useQueryClient();
  const [reviewDecision, setReviewDecision] = useState<Exclude<
    AnomalyReviewStatus,
    "PENDING"
  > | null>(null);
  const query = useQuery({
    queryKey: ["transaction", transactionId],
    queryFn: () => transactionsApi.getById(transactionId),
  });

  const anomalyQuery = useQuery({
    queryKey: ["anomaly", transactionId],
    queryFn: () => anomaliesApi.getByTransactionId(transactionId),
    enabled: isAdmin,
  });
  const reviewMutation = useMutation({
    mutationFn: (decision: Exclude<AnomalyReviewStatus, "PENDING">) =>
      anomaliesApi.review(transactionId, decision),
    onSuccess: async (reviewed) => {
      toast.success(
        reviewed.reviewStatus === "CONFIRMED_SUSPICIOUS"
          ? "Marked suspicious and the source account was blocked."
          : "Marked normal. The source account remains active.",
      );
      setReviewDecision(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["anomaly", transactionId] }),
        queryClient.invalidateQueries({ queryKey: ["anomalies"] }),
        queryClient.invalidateQueries({ queryKey: ["account", query.data?.sourceAccountId] }),
        queryClient.invalidateQueries({ queryKey: ["accounts"] }),
      ]);
    },
    onError: (error) => toast.error(errorMessage(error, "The review decision could not be saved.")),
  });

  if (query.isPending) return <LoadingState label="Loading transaction" />;
  if (query.isError || !query.data)
    return (
      <ErrorState
        title="Transaction unavailable"
        description="This transaction could not be loaded."
        onRetry={() => void query.refetch()}
      />
    );

  const t = query.data;
  const anomaly = isAdmin ? anomalyQuery.data : null;

  return (
    <div className="grid gap-[var(--spacing-6xl)] lg:grid-cols-2">
      <Card>
        <h2 className="mb-[var(--spacing-5xl)] text-lg font-semibold text-[var(--semantic-text-secondary)]">
          Transaction
        </h2>
        <DetailRow label="Reference" separated={false}>
          {t.referenceNumber}
        </DetailRow>
        <DetailRow label="Type" separated={false}>
          <TransactionTypeBadge type={t.type} />
        </DetailRow>
        <DetailRow label="Status" separated={false}>
          <StatusBadge status={t.status} />
        </DetailRow>
        <DetailRow label="Amount" separated={false}>
          {formatMoney(t.amount, t.currency)}
        </DetailRow>
        <DetailRow label="Currency" separated={false}>
          {t.currency}
        </DetailRow>
        <DetailRow label="Source account" separated={false}>
          <span className="inline-flex items-center gap-[var(--spacing-2xl)]">
            {t.sourceAccountNumber ?? "—"}
            {isAdmin && t.sourceAccountId ? (
              <Link
                to="/admin/accounts/$id"
                params={{ id: t.sourceAccountId }}
                aria-label={`Open source account ${t.sourceAccountNumber ?? ""}`}
                className="inline-flex text-[var(--semantic-primary-selected)] transition-colors hover:text-[var(--semantic-primary-hover)]"
              >
                <ArrowUpRight aria-hidden className="size-4" />
              </Link>
            ) : null}
          </span>
        </DetailRow>
        <DetailRow label="Destination account" separated={false}>
          {t.destinationAccountNumber ?? "N/A"}
        </DetailRow>
        <DetailRow label="Performed by" separated={false}>
          {t.performedBy}
        </DetailRow>
        <DetailRow label="Description" separated={false}>
          {t.description || "-"}
        </DetailRow>
        <DetailRow label="Date and time" separated={false}>
          {formatDateTime(t.createdAt)}
        </DetailRow>
      </Card>

      <Card>
        <h2 className="mb-[var(--spacing-5xl)] text-lg font-semibold text-[var(--semantic-text-secondary)]">
          Balances
        </h2>
        <DetailRow label="Source balance before" separated={false}>
          {t.sourceBalanceBefore !== null ? formatMoney(t.sourceBalanceBefore, t.currency) : "-"}
        </DetailRow>
        <DetailRow label="Source balance after" separated={false}>
          {t.sourceBalanceAfter !== null ? formatMoney(t.sourceBalanceAfter, t.currency) : "-"}
        </DetailRow>
        {isAdmin ? (
          <>
            <DetailRow label="Destination balance before" separated={false}>
              {t.destinationBalanceBefore !== null
                ? formatMoney(t.destinationBalanceBefore, t.currency)
                : "-"}
            </DetailRow>
            <DetailRow label="Destination balance after" separated={false}>
              {t.destinationBalanceAfter !== null
                ? formatMoney(t.destinationBalanceAfter, t.currency)
                : "-"}
            </DetailRow>
          </>
        ) : null}
      </Card>

      {isAdmin ? (
        <Card className="lg:col-span-2">
          <h2 className="mb-[var(--spacing-5xl)] text-lg font-semibold text-[var(--semantic-text-secondary)]">
            Anomaly analysis
          </h2>
          {anomalyQuery.isPending ? <LoadingState label="Loading anomaly result" /> : null}
          {anomaly ? (
            <>
              <DetailRow label="Assessment" separated={false}>
                <AnomalyScoreBadge
                  score={anomaly.normalizedAnomalyScore}
                  reviewStatus={anomaly.reviewStatus}
                />
              </DetailRow>
              <DetailRow label="Raw model score" separated={false}>
                {anomaly.rawModelScore}
              </DetailRow>
              <DetailRow label="Normalized anomaly score" separated={false}>
                {anomaly.normalizedAnomalyScore.toFixed(2)}
              </DetailRow>
              <DetailRow label="Model name" separated={false}>
                {anomaly.modelName}
              </DetailRow>
              <DetailRow label="Model version" separated={false}>
                {anomaly.modelVersion}
              </DetailRow>
              <DetailRow label="Analyzed at" separated={false}>
                {formatDateTime(anomaly.analyzedAt)}
              </DetailRow>
              <DetailRow label="Review status" separated={false}>
                {(anomaly.reviewStatus ?? "PENDING").replaceAll("_", " ")}
              </DetailRow>
              {(anomaly.reviewStatus ?? "PENDING") === "PENDING" ? (
                <div className="mt-[var(--spacing-6xl)] flex flex-wrap justify-end gap-[var(--spacing-2xl)]">
                  <Button variant="secondary" onClick={() => setReviewDecision("NORMAL")}>
                    Mark as normal
                  </Button>
                  <Button
                    variant="danger"
                    onClick={() => setReviewDecision("CONFIRMED_SUSPICIOUS")}
                  >
                    Confirm suspicious & block account
                  </Button>
                </div>
              ) : null}
            </>
          ) : null}
          {!anomalyQuery.isPending && !anomaly ? (
            <p className="text-sm text-[var(--semantic-text-primary)]">
              No anomaly analysis is available for this transaction yet.
            </p>
          ) : null}
        </Card>
      ) : null}

      <ConfirmationDialog
        open={reviewDecision !== null}
        onOpenChange={(open) => !open && setReviewDecision(null)}
        title={
          reviewDecision === "CONFIRMED_SUSPICIOUS"
            ? "Confirm suspicious transaction?"
            : "Mark transaction as normal?"
        }
        description={
          reviewDecision === "CONFIRMED_SUSPICIOUS"
            ? "This confirms the review and immediately blocks the source account from further transactions."
            : "This removes the transaction from the suspicious review queue and leaves the source account active."
        }
        confirmLabel={
          reviewDecision === "CONFIRMED_SUSPICIOUS" ? "Confirm and block" : "Mark normal"
        }
        destructive={reviewDecision === "CONFIRMED_SUSPICIOUS"}
        loading={reviewMutation.isPending}
        onConfirm={() => reviewDecision && reviewMutation.mutate(reviewDecision)}
      />
    </div>
  );
}
