import { delay, http, paginate, USE_MOCK_API } from "./client";
import { store } from "@/mocks/store";
import type { Invitation, PaginatedResponse } from "@/types";

const DAY = 24 * 60 * 60 * 1000;

export const invitationsApi = {
  async list(page = 1, pageSize = 10): Promise<PaginatedResponse<Invitation>> {
    if (!USE_MOCK_API)
      return http<PaginatedResponse<Invitation>>(`/invitations?page=${page}&pageSize=${pageSize}`);
    return delay(paginate([...store.invitations], page, pageSize));
  },

  async invite(input: { email: string }): Promise<Invitation> {
    if (!USE_MOCK_API)
      return http<Invitation>("/invitations", {
        method: "POST",
        body: JSON.stringify({ ...input, role: "USER" }),
      });
    const now = Date.now();
    const invitation: Invitation = {
      id: `invitation-${now}`,
      email: input.email,
      invitedRole: "USER",
      invitedBy: "Administrator",
      status: "PENDING",
      createdAt: new Date(now).toISOString(),
      expiresAt: new Date(now + DAY).toISOString(),
    };
    store.invitations = [invitation, ...store.invitations];
    return delay(invitation);
  },

  async resend(id: string): Promise<Invitation> {
    if (!USE_MOCK_API) return http<Invitation>(`/invitations/${id}/resend`, { method: "POST" });
    const invitation = store.invitations.find((i) => i.id === id);
    if (!invitation) throw { status: 404, message: "Invitation not found." };
    invitation.status = "PENDING";
    invitation.createdAt = new Date().toISOString();
    invitation.expiresAt = new Date(Date.now() + DAY).toISOString();
    return delay({ ...invitation });
  },

  async revoke(id: string): Promise<Invitation> {
    if (!USE_MOCK_API) return http<Invitation>(`/invitations/${id}/revoke`, { method: "POST" });
    const invitation = store.invitations.find((i) => i.id === id);
    if (!invitation) throw { status: 404, message: "Invitation not found." };
    invitation.status = "REVOKED";
    return delay({ ...invitation });
  },
};
