import { delay, http, paginate, USE_MOCK_API } from "./client";
import { store } from "@/mocks/store";
import type { PaginatedResponse, Profile, UserFilters } from "@/types";

export const usersApi = {
  async list(filters: UserFilters = {}): Promise<PaginatedResponse<Profile>> {
    if (!USE_MOCK_API) {
      const query = new URLSearchParams();
      Object.entries(filters).forEach(
        ([key, value]) =>
          value !== undefined &&
          value !== "" &&
          key !== "twoFactor" &&
          query.set(key, String(value)),
      );
      return http<PaginatedResponse<Profile>>(`/users?${query}`);
    }
    const search = (filters.search ?? "").toLowerCase();
    const items = store.profiles.filter((p) => {
      if (filters.role && p.role !== filters.role) return false;
      if (filters.status && p.status !== filters.status) return false;
      if (filters.twoFactor === "true" && !p.twoFactorEnabled) return false;
      if (filters.twoFactor === "false" && p.twoFactorEnabled) return false;
      if (
        search &&
        !p.fullName.toLowerCase().includes(search) &&
        !p.email.toLowerCase().includes(search)
      )
        return false;
      return true;
    });
    return delay(paginate(items, filters.page ?? 1, filters.pageSize ?? 10));
  },

  async getById(id: string): Promise<Profile> {
    if (!USE_MOCK_API) return http<Profile>(`/users/${id}`);
    const profile = store.profiles.find((p) => p.id === id);
    if (!profile) throw { status: 404, message: "User not found." };
    return delay(profile);
  },

  async setStatus(id: string, status: Profile["status"]): Promise<Profile> {
    if (!USE_MOCK_API)
      return http<Profile>(`/users/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
    const profile = store.profiles.find((p) => p.id === id);
    if (!profile) throw { status: 404, message: "User not found." };
    profile.status = status;
    return delay({ ...profile });
  },
};
