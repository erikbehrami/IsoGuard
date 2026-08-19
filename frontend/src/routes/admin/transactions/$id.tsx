import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/layout/AppLayout";
import { AdminRoute } from "@/components/guards";
import { TransactionDetailsView } from "@/features/TransactionDetailsView";

export const Route = createFileRoute("/admin/transactions/$id")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Transaction analysis — Suspicious Transaction Detection System" },
      { name: "description", content: "Transaction details with Isolation Forest anomaly result." },
      { property: "og:title", content: "Transaction analysis" },
      {
        property: "og:description",
        content: "Transaction details with Isolation Forest anomaly result.",
      },
    ],
  }),
  component: () => (
    <AdminRoute>
      <AdminTransactionDetailsPage />
    </AdminRoute>
  ),
});

function AdminTransactionDetailsPage() {
  const { id } = Route.useParams();
  return (
    <AppLayout
      title="Transaction Details"
      description="Balances, metadata and the anomaly detection result."
    >
      <TransactionDetailsView transactionId={id} isAdmin />
    </AppLayout>
  );
}
