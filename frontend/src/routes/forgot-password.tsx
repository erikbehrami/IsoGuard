import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { authApi } from "@/api/authApi";
import { AuthLayout } from "@/components/layout/AppLayout";
import { Button, TextField } from "@/components/ui-kit";

const schema = z.object({
  email: z.string().trim().min(1, "Email is required.").email("Enter a valid email address."),
});

export const Route = createFileRoute("/forgot-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Forgot password — Suspicious Transaction Detection System" },
      { name: "description", content: "Request a password reset link for your account." },
      { property: "og:title", content: "Forgot password" },
      { property: "og:description", content: "Request a password reset link for your account." },
    ],
  }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    await authApi.requestPasswordReset(values.email);
    setSent(true);
  });

  return (
    <AuthLayout
      title="Forgot password"
      description="We will send a reset link to your email address."
    >
      {sent ? (
        <div className="flex flex-col gap-[var(--spacing-6xl)]">
          <p className="text-sm text-[var(--semantic-text-primary)]">
            If an account exists for that email address, a password reset link has been sent.
          </p>
          <Link to="/login">
            <Button size="large" fullWidth variant="outline">
              Back to Login
            </Button>
          </Link>
        </div>
      ) : (
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-[var(--spacing-6xl)]">
          <TextField
            label="Email"
            type="email"
            required
            error={errors.email?.message}
            {...register("email")}
          />
          <Button type="submit" size="large" fullWidth loading={isSubmitting}>
            Send Reset Link
          </Button>
          <Link
            to="/login"
            className="text-center text-sm text-[var(--semantic-primary-selected)] hover:underline"
          >
            Back to Login
          </Link>
        </form>
      )}
    </AuthLayout>
  );
}
