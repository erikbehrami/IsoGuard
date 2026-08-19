import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AuthLayout } from "@/components/layout/AppLayout";
import { Button, PasswordField, TextField } from "@/components/ui-kit";
import { useAuth } from "@/contexts/AuthContext";
import { errorMessage } from "@/lib/format";

const schema = z.object({
  email: z.string().trim().min(1, "Email is required.").email("Enter a valid email address."),
  password: z.string().min(1, "Password is required."),
});

type LoginValues = z.infer<typeof schema>;

export const Route = createFileRoute("/login")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign in — IsoGuard" },
      { name: "description", content: "Sign in to manage accounts, transactions and reviews." },
      { property: "og:title", content: "Sign in — IsoGuard" },
      {
        property: "og:description",
        content: "Sign in to manage accounts, transactions and reviews.",
      },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      const { mfaRequired, user } = await signIn(values.email, values.password);
      if (mfaRequired) {
        void navigate({ to: "/verify-2fa" });
        return;
      }
      void navigate({
        to:
          user?.role === "ADMIN"
            ? user.twoFactorEnabled
              ? "/admin/dashboard"
              : "/security"
            : "/dashboard",
      });
    } catch (error) {
      setServerError(errorMessage(error, "Unable to sign in."));
    }
  });

  return (
    <AuthLayout
      title="Welcome back"
      description="Sign in to securely access your accounts and transactions."
      contentAlign="center"
    >
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-[var(--spacing-5xl)]">
        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          required
          placeholder="name@example.com"
          error={errors.email?.message}
          {...register("email")}
        />
        <PasswordField
          label="Password"
          autoComplete="current-password"
          required
          error={errors.password?.message}
          {...register("password")}
        />

        <div className="flex justify-end">
          <Link
            to="/forgot-password"
            className="text-sm text-[var(--semantic-primary-selected)] hover:underline"
          >
            Forgot password?
          </Link>
        </div>

        {serverError ? (
          <p
            role="alert"
            style={{ borderRadius: "var(--radius-sm)" }}
            className="border border-[var(--semantic-danger-default)]/30 bg-[var(--palette-red-20)] p-[var(--spacing-4xl)] text-sm text-[var(--semantic-danger-default)]"
          >
            {serverError}
          </p>
        ) : null}

        <Button type="submit" size="large" fullWidth loading={isSubmitting}>
          Sign in
        </Button>
      </form>
    </AuthLayout>
  );
}
