import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { authApi } from "@/api/authApi";
import { profileApi } from "@/api/profileApi";
import { AuthLayout } from "@/components/layout/AppLayout";
import { Button, PasswordField, TextField } from "@/components/ui-kit";
import { errorMessage } from "@/lib/format";

const schema = z
  .object({
    fullName: z.string().trim().min(2, "Full name is required.").max(100),
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

type Values = z.infer<typeof schema>;

export const Route = createFileRoute("/complete-account")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Complete your account — Suspicious Transaction Detection System" },
      { name: "description", content: "Set your name and password to activate your account." },
      { property: "og:title", content: "Complete your account" },
      {
        property: "og:description",
        content: "Set your name and password to activate your account.",
      },
    ],
  }),
  component: CompleteAccountPage,
});

function CompleteAccountPage() {
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { fullName: "", password: "", confirmPassword: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      await authApi.updatePassword(values.password);
      await profileApi.completeAccount({ fullName: values.fullName });
      toast.success("Your account has been activated. You can sign in now.");
      void navigate({ to: "/login" });
    } catch (error) {
      setServerError(errorMessage(error, "The account could not be activated."));
    }
  });

  return (
    <AuthLayout
      title="Complete your account"
      description="Your invitation is valid. Finish setting up your profile."
    >
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-[var(--spacing-6xl)]">
        <TextField
          label="Full Name"
          required
          error={errors.fullName?.message}
          {...register("fullName")}
        />
        <PasswordField
          label="New Password"
          required
          autoComplete="new-password"
          hint="At least 8 characters, one uppercase letter and one number."
          error={errors.password?.message}
          {...register("password")}
        />
        <PasswordField
          label="Confirm Password"
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
          Activate Account
        </Button>
      </form>
    </AuthLayout>
  );
}
