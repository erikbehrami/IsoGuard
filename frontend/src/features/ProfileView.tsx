import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { profileApi } from "@/api/profileApi";
import { Button, Card, TextField } from "@/components/ui-kit";
import { DetailRow } from "@/components/domain";
import { ErrorState, LoadingState, StatusBadge } from "@/components/data-display";
import { useAuth } from "@/contexts/AuthContext";
import { errorMessage, formatDate } from "@/lib/format";

const schema = z.object({
  fullName: z.string().trim().min(2, "Full name is required.").max(100, "Name is too long."),
});

export function ProfileView() {
  const { user, refresh } = useAuth();
  const queryClient = useQueryClient();
  const profileId = user?.profileId ?? "";

  const query = useQuery({
    queryKey: ["profile", profileId],
    queryFn: () => profileApi.getProfile(profileId),
    enabled: Boolean(user && profileId),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { fullName: "" },
  });

  useEffect(() => {
    if (query.data) reset({ fullName: query.data.fullName });
  }, [query.data, reset]);

  const mutation = useMutation({
    mutationFn: (fullName: string) => profileApi.updateFullName(profileId, fullName),
    onSuccess: async () => {
      toast.success("Your profile has been updated.");
      await queryClient.invalidateQueries({ queryKey: ["profile", profileId] });
      await refresh();
    },
    onError: (error) => toast.error(errorMessage(error, "The profile could not be updated.")),
  });

  if (!user) return <LoadingState label="Loading profile" />;
  if (!profileId) {
    return <ErrorState title="Your profile could not be loaded." onRetry={() => void refresh()} />;
  }
  if (query.isPending) return <LoadingState label="Loading profile" />;
  if (query.isError || !query.data) return <ErrorState onRetry={() => void query.refetch()} />;

  const profile = query.data;

  return (
    <div className="grid gap-[var(--spacing-6xl)] lg:grid-cols-2">
      <Card>
        <h2 className="mb-[var(--spacing-5xl)] text-lg font-semibold text-[var(--semantic-text-secondary)]">
          Profile details
        </h2>
        <DetailRow label="Full name" separated={false}>
          {profile.fullName}
        </DetailRow>
        <DetailRow label="Email" separated={false}>
          {profile.email}
        </DetailRow>
        <DetailRow label="Role" separated={false}>
          {profile.role}
        </DetailRow>
        <DetailRow label="Profile status" separated={false}>
          <StatusBadge status={profile.status} />
        </DetailRow>
        <DetailRow label="Two-factor authentication" separated={false}>
          {user.twoFactorEnabled ? "Enabled" : "Disabled"}
        </DetailRow>
        <DetailRow label="Created at" separated={false}>
          {formatDate(profile.createdAt)}
        </DetailRow>
      </Card>

      <Card>
        <h2 className="mb-[var(--spacing-5xl)] text-lg font-semibold text-[var(--semantic-text-secondary)]">
          Edit profile
        </h2>
        <form
          className="flex flex-col gap-[var(--spacing-6xl)]"
          noValidate
          onSubmit={handleSubmit((values) => mutation.mutateAsync(values.fullName))}
        >
          <TextField
            label="Full Name"
            required
            error={errors.fullName?.message}
            {...register("fullName")}
          />
          <p className="text-xs text-[var(--semantic-text-primary)]">
            Role and email address can only be changed by an administrator.
          </p>
          <Button type="submit" loading={isSubmitting || mutation.isPending} className="self-end">
            Save
          </Button>
        </form>
      </Card>
    </div>
  );
}
