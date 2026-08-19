import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/layout/AppLayout";
import { AdminRoute } from "@/components/guards";
import { TransactionsView } from "@/features/TransactionsView";

export const Route = createFileRoute("/admin/transactions/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "All transactions — Suspicious Transaction Detection System" },
      { name: "description", content: "Browse and filter every transaction on the platform." },
      { property: "og:title", content: "All transactions" },
      {
        property: "og:description",
        content: "Browse and filter every transaction on the platform.",
      },
    ],
  }),
  component: () => (
    <AdminRoute>
      <AppLayout
        title="All Transactions"
        description="Every transaction recorded across all accounts."
        lockViewport
        compactBottomPadding
      >
        <TransactionsView isAdmin contained />
      </AppLayout>
    </AdminRoute>
  ),
});
