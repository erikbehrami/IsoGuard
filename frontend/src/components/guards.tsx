import { useEffect } from "react";
import type { ReactNode } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/contexts/AuthContext";
import { LoadingState } from "@/components/data-display";
import type { Role } from "@/types";

function Gate({ role, children }: { role?: Role; children: ReactNode }) {
  const { user, loading, mfaPending } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  useEffect(() => {
    if (loading) return;
    if (!user) {
      void navigate({ to: "/login", replace: true });
      return;
    }
    if (mfaPending) {
      void navigate({ to: "/verify-2fa", replace: true });
      return;
    }
    if (user.status === "BLOCKED") {
      void navigate({ to: "/access-denied", replace: true });
      return;
    }
    if (
      user.role === "ADMIN" &&
      !user.twoFactorEnabled &&
      pathname !== "/security" &&
      pathname !== "/admin/security"
    ) {
      void navigate({ to: "/security", replace: true });
      return;
    }
    if (role && user.role !== role) {
      void navigate({
        to: user.role === "ADMIN" ? "/admin/dashboard" : "/dashboard",
        replace: true,
      });
    }
  }, [loading, user, role, mfaPending, navigate, pathname]);

  if (loading || !user || mfaPending || user.status === "BLOCKED") {
    return <LoadingState label="Checking your session" />;
  }
  if (role && user.role !== role) return <LoadingState label="Redirecting" />;
  if (
    user.role === "ADMIN" &&
    !user.twoFactorEnabled &&
    pathname !== "/security" &&
    pathname !== "/admin/security"
  ) {
    return <LoadingState label="Two-factor authentication is required" />;
  }

  return <>{children}</>;
}

export function ProtectedRoute({ children }: { children: ReactNode }) {
  return <Gate>{children}</Gate>;
}

export function AdminRoute({ children }: { children: ReactNode }) {
  return <Gate role="ADMIN">{children}</Gate>;
}

export function UserRoute({ children }: { children: ReactNode }) {
  return <Gate role="USER">{children}</Gate>;
}
