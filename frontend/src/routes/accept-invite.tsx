import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { authApi } from "@/api/authApi";
import { AuthLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui-kit";
import { LoadingState } from "@/components/data-display";

export const Route = createFileRoute("/accept-invite")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Accept invitation — Suspicious Transaction Detection System" },
      { name: "description", content: "Validate your invitation and activate your account." },
      { property: "og:title", content: "Accept invitation" },
      {
        property: "og:description",
        content: "Validate your invitation and activate your account.",
      },
    ],
  }),
  component: AcceptInvitePage,
});

function AcceptInvitePage() {
  const navigate = useNavigate();
  const [state, setState] = useState<"LOADING" | "VALID" | "INVALID" | "EXPIRED">("LOADING");
  const validationStarted = useRef(false);

  useEffect(() => {
    if (validationStarted.current) return;
    validationStarted.current = true;
    void authApi.validateInvitation().then(setState);
  }, []);

  if (state === "LOADING") {
    return (
      <AuthLayout title="Accept invitation" description="Validating your invitation link.">
        <LoadingState label="Validating invitation" />
      </AuthLayout>
    );
  }

  if (state !== "VALID") {
    return (
      <AuthLayout
        title={state === "EXPIRED" ? "Invitation expired" : "Invalid invitation"}
        description={
          state === "EXPIRED"
            ? "This invitation is no longer valid. Ask an administrator to resend it."
            : "This invitation link could not be verified."
        }
      >
        <Link to="/login">
          <Button size="large" fullWidth variant="outline">
            Back to login
          </Button>
        </Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Invitation verified"
      description="Continue to set your full name and password."
    >
      <Button size="large" fullWidth onClick={() => navigate({ to: "/complete-account" })}>
        Continue to account completion
      </Button>
    </AuthLayout>
  );
}
