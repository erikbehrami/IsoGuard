import type { ReactNode } from "react";
import { AlertTriangle, Inbox, Loader2, RefreshCw } from "lucide-react";
import { Button } from "./ui-kit";
import { cn } from "@/lib/utils";
import type { AnomalyReviewStatus, TransactionType } from "@/types";

type Tone = "success" | "danger" | "warn" | "neutral" | "primary";

const TONES: Record<Tone, { bg: string; fg: string }> = {
  success: { bg: "var(--palette-green-20)", fg: "var(--semantic-success-default)" },
  danger: { bg: "var(--palette-red-20)", fg: "var(--semantic-danger-default)" },
  warn: { bg: "var(--palette-yellow-20)", fg: "var(--semantic-yellow-default)" },
  neutral: { bg: "var(--semantic-bg-secondary-selected)", fg: "var(--semantic-text-selected)" },
  primary: { bg: "var(--palette-purple-20)", fg: "var(--semantic-primary-selected)" },
};

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Active",
  COMPLETED: "Completed",
  ACCEPTED: "Accepted",
  APPROVED: "Approved",
  BLOCKED: "Blocked",
  REJECTED: "Rejected",
  REVOKED: "Revoked",
  PENDING: "Pending",
  SUSPICIOUS: "Suspicious",
  INACTIVE: "Inactive",
  CLOSED: "Closed",
  EXPIRED: "Expired",
  ADMIN: "Administrator",
  USER: "User",
  DEPOSIT: "Deposit",
  WITHDRAWAL: "Withdrawal",
  TRANSFER: "Transfer",
};

export function Badge({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  const palette = TONES[tone];
  return (
    <span
      style={{
        backgroundColor: palette.bg,
        color: palette.fg,
        borderRadius: "var(--radius-round)",
        paddingInline: "var(--spacing-3xl)",
        paddingBlock: "var(--spacing-md)",
      }}
      className="inline-flex items-center whitespace-nowrap text-xs font-medium"
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className="whitespace-nowrap text-xs font-normal uppercase text-[var(--semantic-text-selected)]">
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

export function TransactionTypeBadge({ type }: { type: TransactionType }) {
  return (
    <span className="whitespace-nowrap text-xs text-[var(--semantic-text-selected)]">
      {STATUS_LABELS[type]}
    </span>
  );
}

export function AnomalyScoreBadge({
  score,
  reviewStatus,
}: {
  score: number;
  reviewStatus?: AnomalyReviewStatus | null;
}) {
  const isConfirmedSuspicious = reviewStatus === "CONFIRMED_SUSPICIOUS";
  const requiresReview = reviewStatus !== "NORMAL" && !isConfirmedSuspicious && score >= 0.6;
  const tone: Tone = requiresReview || isConfirmedSuspicious ? "danger" : "success";
  const label = isConfirmedSuspicious
    ? "Confirmed suspicious"
    : requiresReview
      ? "Requires review"
      : "Normal";
  return (
    <Badge tone={tone}>
      {label} · {score.toFixed(2)}
    </Badge>
  );
}

/* ---------------------------------- States --------------------------------- */

export function LoadingState({ label = "Loading data" }: { label?: string }) {
  return (
    <div
      role="status"
      className="flex flex-col items-center gap-[var(--spacing-4xl)] py-[var(--spacing-13xl)] text-[var(--semantic-text-primary)]"
    >
      <Loader2 aria-hidden className="size-6 animate-spin" />
      <p className="text-sm">{label}…</p>
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-[var(--spacing-2xl)] p-[var(--spacing-5xl)]">
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          style={{ borderRadius: "var(--radius-sm)" }}
          className="h-[var(--button-height-small)] animate-pulse bg-[var(--semantic-bg-secondary-selected)]"
        />
      ))}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex min-h-0 w-full flex-1 flex-col items-center justify-center gap-[var(--spacing-4xl)] py-[var(--spacing-13xl)] text-center">
      <Inbox aria-hidden className="size-6 text-[var(--semantic-text-primary)]" />
      <p className="text-sm font-medium text-[var(--semantic-text-secondary)]">{title}</p>
      {description ? (
        <p className="text-sm text-[var(--semantic-text-primary)]">{description}</p>
      ) : null}
      {action}
    </div>
  );
}

export function ErrorState({
  title = "Something went wrong",
  description = "The data could not be loaded.",
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-[var(--spacing-4xl)] py-[var(--spacing-13xl)] text-center"
    >
      <AlertTriangle aria-hidden className="size-6 text-[var(--semantic-danger-default)]" />
      <p className="text-sm font-medium text-[var(--semantic-text-secondary)]">{title}</p>
      <p className="text-sm text-[var(--semantic-text-primary)]">{description}</p>
      {onRetry ? (
        <Button size="small" variant="outline" onClick={onRetry}>
          <RefreshCw aria-hidden className="size-4" /> Retry
        </Button>
      ) : null}
    </div>
  );
}

/* ---------------------------------- Table ---------------------------------- */

export type Column<T> = {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  hideOnMobile?: boolean;
};

export function DataTable<T>({
  columns,
  rows,
  getRowId,
  caption,
  containerClassName,
}: {
  columns: Array<Column<T>>;
  rows: T[];
  getRowId: (row: T) => string;
  caption: string;
  containerClassName?: string;
}) {
  return (
    <div className={cn("w-full overflow-x-auto", containerClassName)}>
      <table className="w-full min-w-[720px] border-collapse text-[13px]">
        <caption className="sr-only">{caption}</caption>
        <thead className="sticky top-0 z-10">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={cn(
                  "h-[var(--spacing-9xl)] bg-[var(--semantic-bg-primary)] px-[var(--spacing-5xl)] text-left align-middle text-xs font-medium uppercase tracking-[0.04em] text-[var(--semantic-text-primary)] [box-shadow:inset_0_-1px_0_var(--semantic-bg-outline)] first:pl-[var(--spacing-6xl)] last:pr-[var(--spacing-6xl)]",
                  column.hideOnMobile && "hidden lg:table-cell",
                )}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={getRowId(row)}
              tabIndex={0}
              className="group transition-colors hover:bg-[color-mix(in_srgb,var(--semantic-bg-secondary-selected)_45%,transparent)] focus-visible:bg-[color-mix(in_srgb,var(--semantic-bg-secondary-selected)_45%,transparent)] focus-visible:outline-none"
            >
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={cn(
                    "h-[var(--spacing-12xl)] px-[var(--spacing-5xl)] align-middle font-normal text-[var(--semantic-text-selected)] first:pl-[var(--spacing-6xl)] last:pr-[var(--spacing-6xl)]",
                    column.hideOnMobile && "hidden lg:table-cell",
                  )}
                >
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Pagination({
  page,
  totalPages,
  totalItems,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  totalItems: number;
  onPageChange: (page: number) => void;
}) {
  return (
    <nav
      aria-label="Pagination"
      className="flex flex-wrap items-center justify-between gap-[var(--spacing-4xl)] border-t border-[var(--semantic-bg-outline)] p-[var(--spacing-4xl)]"
    >
      <p className="text-xs text-[var(--semantic-text-primary)]">
        Page {page} of {totalPages} · {totalItems} items
      </p>
      <div className="flex gap-[var(--spacing-2xl)]">
        <Button
          size="small"
          variant="secondary"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Previous
        </Button>
        <Button
          size="small"
          variant="secondary"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </Button>
      </div>
    </nav>
  );
}
