import { createFileRoute } from "@tanstack/react-router";
import { AdminRoute } from "@/components/guards";
import { AppLayout } from "@/components/layout/AppLayout";
import { ProfileView } from "@/features/ProfileView";

export const Route = createFileRoute("/admin/profile")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Administrator profile — IsoGuard" },
      { name: "description", content: "View and update your administrator profile." },
    ],
  }),
  component: () => (
    <AdminRoute>
      <AppLayout title="My Profile" description="Your administrator profile and role.">
        <ProfileView />
      </AppLayout>
    </AdminRoute>
  ),
});
