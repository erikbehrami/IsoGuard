import type { ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { Button } from "./ui-kit";

export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-[var(--semantic-bg-overlay)]/70" />
        <Dialog.Content
          style={{ borderRadius: "var(--radius-lg)", padding: "var(--spacing-7xl)" }}
          className="fixed left-1/2 top-1/2 z-50 w-[calc(100vw-var(--spacing-8xl))] max-w-[480px] -translate-x-1/2 -translate-y-1/2 border border-[var(--semantic-bg-outline)] bg-[var(--semantic-bg-secondary)]"
        >
          <div className="flex items-start justify-between gap-[var(--spacing-4xl)]">
            <div className="flex flex-col gap-[var(--spacing-lg)]">
              <Dialog.Title className="text-lg font-semibold text-[var(--semantic-text-secondary)]">
                {title}
              </Dialog.Title>
              {description ? (
                <Dialog.Description className="text-sm text-[var(--semantic-text-primary)]">
                  {description}
                </Dialog.Description>
              ) : null}
            </div>
            <Dialog.Close asChild>
              <button
                aria-label="Close dialog"
                className="text-[var(--semantic-text-primary)] hover:text-[var(--semantic-text-secondary)]"
              >
                <X className="size-4" />
              </button>
            </Dialog.Close>
          </div>
          {children ? <div className="mt-[var(--spacing-6xl)]">{children}</div> : null}
          {footer ? (
            <div className="mt-[var(--spacing-7xl)] flex flex-wrap justify-end gap-[var(--spacing-2xl)]">
              {footer}
            </div>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function ConfirmationDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  destructive,
  loading,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
}) {
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      footer={
        <>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant={destructive ? "danger" : "primary"}
            loading={loading}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </>
      }
    />
  );
}
