import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { QrCode, ShieldCheck } from "lucide-react";
import { authApi } from "@/api/authApi";
import { profileApi } from "@/api/profileApi";
import { Button, Card, OtpField, PasswordField } from "@/components/ui-kit";
import { ConfirmationDialog } from "@/components/modals";
import { DetailRow } from "@/components/domain";
import { useAuth } from "@/contexts/AuthContext";
import { errorMessage } from "@/lib/format";

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required."),
    newPassword: z
      .string()
      .min(8, "Use at least 8 characters.")
      .regex(/[A-Z]/, "Include at least one uppercase letter.")
      .regex(/[0-9]/, "Include at least one number."),
    confirmPassword: z.string(),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match.",
  });

export function SecurityView() {
  const { user, refresh } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  const [enrolling, setEnrolling] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState<string | null>(null);
  const [disableOpen, setDisableOpen] = useState(false);
  const [working, setWorking] = useState(false);
  const [enrollment, setEnrollment] = useState<{ qrCodeSvg: string; secret: string } | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  const changePassword = handleSubmit(async (values) => {
    try {
      await authApi.changePassword(values.currentPassword, values.newPassword);
      toast.success("Your password has been changed.");
      reset();
    } catch (error) {
      toast.error(errorMessage(error, "The password could not be changed."));
    }
  });

  const confirmEnrollment = async () => {
    if (!/^\d{6}$/.test(otp)) {
      setOtpError("Enter the six-digit code from your authenticator app.");
      return;
    }
    setWorking(true);
    try {
      await authApi.verifyMfa(otp);
      await refresh();
      setEnrolling(false);
      setOtp("");
      setOtpError(null);
      toast.success("Two-factor authentication is enabled.");
    } catch (error) {
      setOtpError(errorMessage(error, "The verification code is invalid."));
    } finally {
      setWorking(false);
    }
  };

  const disableTwoFactor = async () => {
    setWorking(true);
    try {
      await authApi.unenrollMfa();
      await refresh();
      toast.success("Two-factor authentication is disabled.");
      setDisableOpen(false);
    } catch (error) {
      toast.error(errorMessage(error, "Two-factor authentication could not be disabled."));
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="grid gap-[var(--spacing-6xl)] pb-[var(--spacing-5xl)] lg:grid-cols-2">
      <Card>
        <h2 className="mb-[var(--spacing-5xl)] text-lg font-semibold text-[var(--semantic-text-secondary)]">
          Change password
        </h2>
        <form
          className="flex flex-col gap-[var(--spacing-6xl)]"
          noValidate
          onSubmit={changePassword}
        >
          <PasswordField
            label="Current Password"
            required
            autoComplete="current-password"
            error={errors.currentPassword?.message}
            {...register("currentPassword")}
          />
          <PasswordField
            label="New Password"
            required
            autoComplete="new-password"
            hint="At least 8 characters, one uppercase letter and one number."
            error={errors.newPassword?.message}
            {...register("newPassword")}
          />
          <PasswordField
            label="Confirm New Password"
            required
            autoComplete="new-password"
            error={errors.confirmPassword?.message}
            {...register("confirmPassword")}
          />
          <Button type="submit" loading={isSubmitting} className="self-end">
            Change Password
          </Button>
        </form>
      </Card>

      <Card>
        <h2 className="mb-[var(--spacing-5xl)] text-lg font-semibold text-[var(--semantic-text-secondary)]">
          Two-factor authentication
        </h2>
        {isAdmin ? (
          <p className="mb-[var(--spacing-5xl)] text-sm text-[var(--semantic-yellow-default)]">
            Two-factor authentication is required for administrator accounts.
          </p>
        ) : null}

        {user?.twoFactorEnabled ? (
          <div className="flex flex-col gap-[var(--spacing-5xl)]">
            <p className="flex items-center gap-[var(--spacing-2xl)] text-sm text-[var(--semantic-success-default)]">
              <ShieldCheck aria-hidden className="size-4" /> Two-factor authentication is active.
            </p>
            <Button
              variant="danger"
              className="self-end"
              disabled={isAdmin}
              onClick={() => setDisableOpen(true)}
            >
              Disable 2FA
            </Button>
            {isAdmin ? (
              <p className="text-xs text-[var(--semantic-text-primary)]">
                Administrators must complete a verified security review before mandatory two-factor
                authentication can be removed.
              </p>
            ) : null}
          </div>
        ) : (
          <div className="flex flex-col gap-[var(--spacing-5xl)]">
            <p className="text-sm text-[var(--semantic-text-primary)]">
              Add a second verification step using a TOTP authenticator app such as Google
              Authenticator or 1Password.
            </p>
            {enrolling ? (
              <>
                <div
                  style={{ borderRadius: "var(--radius-md)", padding: "var(--spacing-6xl)" }}
                  className="flex flex-col items-center gap-[var(--spacing-3xl)] border border-[var(--semantic-bg-outline)] bg-[var(--semantic-bg-primary)]"
                >
                  {enrollment?.qrCodeSvg ? (
                    <img
                      src={enrollment.qrCodeSvg}
                      alt="TOTP enrollment QR code"
                      className="size-44"
                    />
                  ) : (
                    <QrCode aria-hidden className="size-16 text-[var(--semantic-text-secondary)]" />
                  )}
                  <p className="text-xs text-[var(--semantic-text-primary)]">
                    Scan the QR code, or enter the setup key manually:
                  </p>
                  <code className="text-sm text-[var(--semantic-text-secondary)]">
                    {enrollment?.secret}
                  </code>
                </div>
                <OtpField value={otp} onChange={setOtp} error={otpError ?? undefined} align="end" />
                <div className="flex flex-wrap justify-end gap-[var(--spacing-2xl)]">
                  <Button loading={working} onClick={confirmEnrollment}>
                    Confirm and enable
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={async () => {
                      try {
                        await authApi.cancelMfaEnrollment();
                      } finally {
                        setEnrolling(false);
                        setEnrollment(null);
                        setOtp("");
                        setOtpError(null);
                      }
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </>
            ) : (
              <Button
                className="self-end"
                onClick={async () => {
                  setWorking(true);
                  try {
                    setEnrollment(await authApi.enrollMfa());
                    setEnrolling(true);
                  } catch (error) {
                    toast.error(errorMessage(error, "Two-factor enrollment could not be started."));
                  } finally {
                    setWorking(false);
                  }
                }}
                loading={working}
              >
                Enable 2FA
              </Button>
            )}
          </div>
        )}
      </Card>

      <Card className="lg:col-span-2">
        <h2 className="mb-[var(--spacing-5xl)] text-lg font-semibold text-[var(--semantic-text-secondary)]">
          Active session
        </h2>
        <DetailRow label="Signed in as" separated={false}>
          {user?.email}
        </DetailRow>
        <DetailRow label="Role" separated={false}>
          {user?.role}
        </DetailRow>
        <DetailRow label="Session source" separated={false}>
          Supabase Auth
        </DetailRow>
      </Card>

      <ConfirmationDialog
        open={disableOpen}
        onOpenChange={setDisableOpen}
        title="Disable two-factor authentication?"
        description="Your account will be protected by a password only. You can enable it again at any time."
        confirmLabel="Disable 2FA"
        destructive
        loading={working}
        onConfirm={disableTwoFactor}
      />
    </div>
  );
}
