import { createFileRoute, Link } from "@tanstack/react-router";
import { AppLayout } from "@/components/layout/AppLayout";
import { UserRoute } from "@/components/guards";
import { Button } from "@/components/ui-kit";
import { TransactionsView } from "@/features/TransactionsView";
import { useAuth } from "@/contexts/AuthContext";

export const Route = createFileRoute("/transactions/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "My transactions — Suspicious Transaction Detection System" },
      { name: "description", content: "Search and filter every transaction you performed." },
      { property: "og:title", content: "My transactions" },
      {
        property: "og:description",
        content: "Search and filter every transaction you performed.",
      },
    ],
  }),
  component: () => (
    <UserRoute>
      <MyTransactionsPage />
    </UserRoute>
  ),
});

function MyTransactionsPage() {
  const { user } = useAuth();
  return (
    <AppLayout
      title="My Transactions"
      description="Every transaction performed from your accounts."
      lockViewport
      actions={
        <Link to="/transactions/new" search={{ type: undefined }}>
          <Button>New Transaction</Button>
        </Link>
      }
    >
      <TransactionsView isAdmin={false} userId={user?.profileId} contained />
    </AppLayout>
  );
}
