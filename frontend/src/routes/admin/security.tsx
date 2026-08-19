import { createFileRoute } from "@tanstack/react-router";
import { AdminRoute } from "@/components/guards";
import { AppLayout } from "@/components/layout/AppLayout";
import { SecurityView } from "@/features/SecurityView";

export const Route = createFileRoute("/admin/security")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Administrator security — IsoGuard" },
      {
        name: "description",
        content: "Manage your administrator password and two-factor authentication.",
      },
    ],
  }),
  component: () => (
    <AdminRoute>
      <AppLayout
        title="Security"
        description="Administrator password and mandatory two-factor authentication settings."
        compactBottomPadding
      >
        <SecurityView />
      </AppLayout>
    </AdminRoute>
  ),
});
