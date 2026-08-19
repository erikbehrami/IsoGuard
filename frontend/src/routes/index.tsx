import { createFileRoute, Navigate } from "@tanstack/react-router";
import { LoadingState } from "@/components/data-display";
import { useAuth } from "@/contexts/AuthContext";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "IsoGuard" },
      {
        name: "description",
        content:
          "Monitor accounts and review transactions flagged by anomaly detection, with role-based access for administrators and users.",
      },
      { property: "og:title", content: "IsoGuard" },
      {
        property: "og:description",
        content: "Monitor accounts and review transactions flagged by anomaly detection.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const { user, loading } = useAuth();

  if (loading) return <LoadingState label="Loading your session" />;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === "ADMIN" ? "/admin/dashboard" : "/dashboard"} replace />;
}
