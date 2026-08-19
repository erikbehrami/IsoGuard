import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import { Card } from "./ui-kit";
import { StatusBadge } from "./data-display";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { AccountStatus } from "@/types";

export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
}: {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  hint?: string;
}) {
  return (
    <Card className="flex flex-col gap-[var(--spacing-2xl)]">
      <div className="flex items-center justify-between gap-[var(--spacing-4xl)]">
        <p className="text-sm text-[var(--semantic-text-primary)]">{label}</p>
        {Icon ? (
          <Icon aria-hidden className="size-4 text-[var(--semantic-primary-selected)]" />
        ) : null}
      </div>
      <p className="text-2xl font-semibold text-[var(--semantic-text-secondary)]">{value}</p>
      {hint ? <p className="text-xs text-[var(--semantic-text-primary)]">{hint}</p> : null}
    </Card>
  );
}

export function AccountCard({
  accountNumber,
  balance,
  currency,
  status,
  to,
}: {
  accountNumber: string;
  balance: number;
  currency: string;
  status: AccountStatus;
  to?: { id: string };
}) {
  const content = (
    <Card className="flex h-full flex-col gap-[var(--spacing-3xl)] transition-colors hover:bg-[var(--semantic-bg-secondary-selected)]">
      <div className="flex items-center justify-between gap-[var(--spacing-4xl)]">
        <p className="text-sm text-[var(--semantic-text-primary)]">{accountNumber}</p>
        <StatusBadge status={status} />
      </div>
      <p className="text-2xl font-semibold text-[var(--semantic-text-secondary)]">
        {formatMoney(balance, currency)}
      </p>
      <p className="text-xs text-[var(--semantic-text-primary)]">Available balance</p>
    </Card>
  );

  if (!to) return content;
  return (
    <Link to="/accounts/$id" params={{ id: to.id }} className="block h-full">
      {content}
    </Link>
  );
}

export function DetailRow({
  label,
  children,
  separated = true,
}: {
  label: string;
  children: ReactNode;
  separated?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-[var(--spacing-4xl)] py-[var(--spacing-3xl)]",
        separated && "border-b border-[var(--semantic-bg-outline)] last:border-0",
      )}
    >
      <span className="text-sm text-[var(--semantic-text-primary)]">{label}</span>
      <span className="text-sm text-[var(--semantic-text-secondary)]">{children}</span>
    </div>
  );
}
