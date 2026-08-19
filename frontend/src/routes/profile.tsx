import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/layout/AppLayout";
import { ProtectedRoute } from "@/components/guards";
import { ProfileView } from "@/features/ProfileView";

export const Route = createFileRoute("/profile")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "My profile — Suspicious Transaction Detection System" },
      { name: "description", content: "View and update your personal profile details." },
      { property: "og:title", content: "My profile" },
      { property: "og:description", content: "View and update your personal profile details." },
    ],
  }),
  component: () => (
    <ProtectedRoute>
      <AppLayout title="My Profile" description="Your personal details and account role.">
        <ProfileView />
      </AppLayout>
    </ProtectedRoute>
  ),
});
