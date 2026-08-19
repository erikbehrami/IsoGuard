import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/layout/AppLayout";
import { UserRoute } from "@/components/guards";
import { TransactionDetailsView } from "@/features/TransactionDetailsView";

export const Route = createFileRoute("/transactions/$id")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Transaction details — Suspicious Transaction Detection System" },
      { name: "description", content: "Full details and balances for a single transaction." },
      { property: "og:title", content: "Transaction details" },
      {
        property: "og:description",
        content: "Full details and balances for a single transaction.",
      },
    ],
  }),
  component: () => (
    <UserRoute>
      <TransactionDetailsPage />
    </UserRoute>
  ),
});

function TransactionDetailsPage() {
  const { id } = Route.useParams();
  return (
    <AppLayout title="Transaction Details" description="Reference, amounts and balance changes.">
      <TransactionDetailsView transactionId={id} isAdmin={false} />
    </AppLayout>
  );
}
