import { createFileRoute, Link } from "@tanstack/react-router";
import { AuthLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui-kit";
import { useAuth } from "@/contexts/AuthContext";

export const Route = createFileRoute("/access-denied")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Access denied — Suspicious Transaction Detection System" },
      { name: "description", content: "Your profile does not have access to this area." },
      { property: "og:title", content: "Access denied" },
      { property: "og:description", content: "Your profile does not have access to this area." },
    ],
  }),
  component: AccessDeniedPage,
});

function AccessDeniedPage() {
  const { signOut } = useAuth();
  return (
    <AuthLayout
      title="Access denied"
      description="This profile is blocked or does not have permission to view the requested page. Contact an administrator for assistance."
    >
      <Link to="/login" onClick={() => void signOut()}>
        <Button size="large" fullWidth variant="outline">
          Back to Login
        </Button>
      </Link>
    </AuthLayout>
  );
}
