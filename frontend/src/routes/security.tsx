import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/layout/AppLayout";
import { ProtectedRoute } from "@/components/guards";
import { SecurityView } from "@/features/SecurityView";

export const Route = createFileRoute("/security")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Security settings — Suspicious Transaction Detection System" },
      { name: "description", content: "Manage your password and two-factor authentication." },
      { property: "og:title", content: "Security settings" },
      {
        property: "og:description",
        content: "Manage your password and two-factor authentication.",
      },
    ],
  }),
  component: () => (
    <ProtectedRoute>
      <AppLayout title="Security" description="Password and two-factor authentication settings.">
        <SecurityView />
      </AppLayout>
    </ProtectedRoute>
  ),
});
