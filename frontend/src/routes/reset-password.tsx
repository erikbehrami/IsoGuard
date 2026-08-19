import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { authApi } from "@/api/authApi";
import { AuthLayout } from "@/components/layout/AppLayout";
import { LoadingState } from "@/components/data-display";
import { Button, OtpField, PasswordField } from "@/components/ui-kit";
import { errorMessage } from "@/lib/format";

const schema = z
  .object({
    password: z
      .string()
      .min(8, "Use at least 8 characters.")
      .regex(/[A-Z]/, "Include at least one uppercase letter.")
      .regex(/[0-9]/, "Include at least one number."),
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match.",
  });

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Reset password — Suspicious Transaction Detection System" },
      { name: "description", content: "Choose a new password for your account." },
      { property: "og:title", content: "Reset password" },
      { property: "og:description", content: "Choose a new password for your account." },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);
  const [recoveryState, setRecoveryState] = useState<
    "LOADING" | "READY" | "MFA_REQUIRED" | "INVALID" | "EXPIRED"
  >("LOADING");
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState<string | null>(null);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const preparationStarted = useRef(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  useEffect(() => {
    if (preparationStarted.current) return;
    preparationStarted.current = true;
    void authApi
      .preparePasswordRecovery()
      .then((result) => {
        if (!result.valid) {
          setRecoveryState(result.expired ? "EXPIRED" : "INVALID");
        } else {
          setRecoveryState(result.mfaRequired ? "MFA_REQUIRED" : "READY");
        }
      })
      .catch((error) => {
        setServerError(errorMessage(error, "The recovery link could not be verified."));
        setRecoveryState("INVALID");
      });
  }, []);

  const verifyRecoveryMfa = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!/^\d{6}$/.test(otp)) {
      setOtpError("Enter the six-digit code from your authenticator app.");
      return;
    }
    setVerifyingOtp(true);
    setOtpError(null);
    try {
      await authApi.verifyMfa(otp);
      setRecoveryState("READY");
    } catch (error) {
      setOtpError(errorMessage(error, "The verification code is invalid."));
    } finally {
      setVerifyingOtp(false);
    }
  };

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      await authApi.updatePassword(values.password);
      toast.success("Your password has been reset.");
      void navigate({ to: "/login" });
    } catch (error) {
      setServerError(errorMessage(error, "The password could not be reset."));
    }
  });

  if (recoveryState === "LOADING") {
    return (
      <AuthLayout title="Reset password" description="Verifying your recovery link.">
        <LoadingState label="Verifying recovery link" />
      </AuthLayout>
    );
  }

  if (recoveryState === "INVALID" || recoveryState === "EXPIRED") {
    return (
      <AuthLayout
        title={recoveryState === "EXPIRED" ? "Recovery link expired" : "Invalid recovery link"}
        description={
          recoveryState === "EXPIRED"
            ? "Request a new password reset email to continue."
            : "This password recovery link could not be verified."
        }
      >
        {serverError ? (
          <p
            role="alert"
            className="mb-[var(--spacing-5xl)] text-sm text-[var(--semantic-danger-default)]"
          >
            {serverError}
          </p>
        ) : null}
        <Link to="/forgot-password">
          <Button size="large" fullWidth variant="outline">
            Request a new link
          </Button>
        </Link>
      </AuthLayout>
    );
  }

  if (recoveryState === "MFA_REQUIRED") {
    return (
      <AuthLayout
        title="Verify your identity"
        description="Enter the six-digit code from your authenticator app before changing your password."
        contentAlign="center"
      >
        <form
          onSubmit={verifyRecoveryMfa}
          className="mx-auto flex w-full max-w-[360px] flex-col gap-[var(--spacing-6xl)]"
        >
          <OtpField value={otp} onChange={setOtp} error={otpError ?? undefined} align="center" />
          <Button type="submit" size="large" fullWidth loading={verifyingOtp}>
            Verify
          </Button>
        </form>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Reset password" description="Choose a new password for your account.">
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-[var(--spacing-6xl)]">
        <PasswordField
          label="New Password"
          required
          autoComplete="new-password"
          hint="At least 8 characters, one uppercase letter and one number."
          error={errors.password?.message}
          {...register("password")}
        />
        <PasswordField
          label="Confirm New Password"
          required
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register("confirmPassword")}
        />
        {serverError ? (
          <p role="alert" className="text-sm text-[var(--semantic-danger-default)]">
            {serverError}
          </p>
        ) : null}
        <Button type="submit" size="large" fullWidth loading={isSubmitting}>
          Reset Password
        </Button>
      </form>
    </AuthLayout>
  );
}
