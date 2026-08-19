import { delay, http, USE_MOCK_API } from "./client";
import { store } from "@/mocks/store";
import type { AuthUser, Profile } from "@/types";

export const profileApi = {
  /** Source of truth for role and profile status (ASP.NET Core API). */
  async me(authUserId = ""): Promise<AuthUser> {
    if (!USE_MOCK_API) {
      const profile = await http<Profile & { authUserId: string }>(
        "/auth/me",
        {},
        { preserveSessionOnUnauthorized: true },
      );
      return {
        authUserId: profile.authUserId,
        profileId: profile.id,
        fullName: profile.fullName,
        email: profile.email,
        role: profile.role,
        status: profile.status,
        twoFactorEnabled: profile.twoFactorEnabled,
      };
    }
    const profile =
      store.profiles.find((p) => p.id === authUserId) ??
      store.profiles.find((p) => p.email === authUserId);
    if (!profile) throw { status: 404, message: "Profile not found." };
    return delay({
      authUserId: `auth-${profile.id}`,
      profileId: profile.id,
      fullName: profile.fullName,
      email: profile.email,
      role: profile.role,
      status: profile.status,
      twoFactorEnabled: profile.twoFactorEnabled,
    });
  },

  async getProfile(profileId: string): Promise<Profile> {
    if (!USE_MOCK_API) return http<Profile>("/profile");
    const profile = store.profiles.find((p) => p.id === profileId);
    if (!profile) throw { status: 404, message: "Profile not found." };
    return delay(profile);
  },

  async updateFullName(profileId: string, fullName: string): Promise<Profile> {
    if (!USE_MOCK_API)
      return http<Profile>("/profile", { method: "PATCH", body: JSON.stringify({ fullName }) });
    const profile = store.profiles.find((p) => p.id === profileId);
    if (!profile) throw { status: 404, message: "Profile not found." };
    profile.fullName = fullName;
    return delay({ ...profile });
  },

  async setTwoFactor(profileId: string, enabled: boolean): Promise<Profile> {
    if (!USE_MOCK_API) return profileApi.getProfile(profileId);
    const profile = store.profiles.find((p) => p.id === profileId);
    if (!profile) throw { status: 404, message: "Profile not found." };
    profile.twoFactorEnabled = enabled;
    return delay({ ...profile });
  },

  /** Called after an invited user completes their account. */
  async completeAccount(input: { email?: string; fullName: string }): Promise<Profile> {
    if (!USE_MOCK_API)
      return http<Profile>("/profile/complete", {
        method: "POST",
        body: JSON.stringify({ fullName: input.fullName }),
      });
    const existing = store.profiles.find((p) => p.email === input.email);
    if (existing) {
      existing.fullName = input.fullName;
      existing.status = "ACTIVE";
      return delay({ ...existing });
    }
    const profile: Profile = {
      id: `profile-${Date.now()}`,
      fullName: input.fullName,
      email: input.email ?? "",
      role: "USER",
      status: "ACTIVE",
      twoFactorEnabled: false,
      accountCount: 0,
      createdAt: new Date().toISOString(),
    };
    store.profiles = [...store.profiles, profile];
    return delay(profile);
  },
};
