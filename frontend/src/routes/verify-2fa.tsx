import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AuthLayout } from "@/components/layout/AppLayout";
import { Button, OtpField } from "@/components/ui-kit";
import { useAuth } from "@/contexts/AuthContext";
import { errorMessage } from "@/lib/format";

export const Route = createFileRoute("/verify-2fa")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Two-factor verification — Suspicious Transaction Detection System" },
      { name: "description", content: "Enter your six-digit authenticator code to continue." },
      { property: "og:title", content: "Two-factor verification" },
      {
        property: "og:description",
        content: "Enter your six-digit authenticator code to continue.",
      },
    ],
  }),
  component: VerifyTwoFactorPage,
});

function VerifyTwoFactorPage() {
  const { verifyMfa, user, signOut } = useAuth();
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!/^\d{6}$/.test(code)) {
      setError("Enter the six-digit code from your authenticator app.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await verifyMfa(code);
      void navigate({ to: user?.role === "ADMIN" ? "/admin/dashboard" : "/dashboard" });
    } catch (err) {
      setError(errorMessage(err, "The verification code is invalid."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Two-factor verification"
      description="Enter the six-digit code from your authenticator app."
      contentAlign="center"
    >
      <form
        onSubmit={submit}
        className="mx-auto flex w-full max-w-[360px] flex-col gap-[var(--spacing-6xl)]"
      >
        <OtpField value={code} onChange={setCode} error={error ?? undefined} align="center" />
        <Button type="submit" size="large" fullWidth loading={loading}>
          Verify
        </Button>
        <Link
          to="/login"
          onClick={() => void signOut()}
          className="text-center text-sm text-[var(--semantic-primary-selected)] hover:underline"
        >
          Back to Login
        </Link>
      </form>
    </AuthLayout>
  );
}
