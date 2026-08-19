import { supabase } from "@/lib/supabase";
import { profileApi } from "./profileApi";
import { http } from "./client";
import type { AuthUser } from "@/types";

export type Session = { accessToken: string; email: string; mfaPending: boolean };
let pendingFactorId: string | null = null;

function fail(error: { message: string; status?: number } | null): never {
  throw { status: error?.status ?? 400, message: error?.message ?? "Authentication failed." };
}

export const authApi = {
  readSession(): Session | null {
    return null;
  },
  writeSession(_session: Session | null) {},
  async getAccessToken(): Promise<string | null> {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  },
  async signIn(email: string, password: string): Promise<Session> {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.session) return fail(error);
    const { data: assurance } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    return {
      accessToken: data.session.access_token,
      email: data.user.email ?? email,
      mfaPending: assurance?.nextLevel === "aal2" && assurance.currentLevel !== "aal2",
    };
  },
  async verifyMfa(code: string): Promise<Session> {
    let factorId = pendingFactorId;
    if (!factorId) {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) return fail(error);
      factorId = data.totp.find((factor) => factor.status === "verified")?.id ?? null;
    }
    if (!factorId) throw { status: 400, message: "No TOTP factor is available." };
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
    if (error) return fail(error);
    pendingFactorId = null;
    const { data } = await supabase.auth.getSession();
    return {
      accessToken: data.session?.access_token ?? "",
      email: data.session?.user.email ?? "",
      mfaPending: false,
    };
  },
  async signOut(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) return fail(error);
  },
  async currentUser(): Promise<AuthUser | null> {
    const { data } = await supabase.auth.getSession();
    if (!data.session) return null;
    const profile = await profileApi.me();
    const { data: factors } = await supabase.auth.mfa.listFactors();
    return {
      ...profile,
      twoFactorEnabled: factors?.totp.some((f) => f.status === "verified") ?? false,
    };
  },
  async requestPasswordReset(email: string): Promise<void> {
    await http("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  },
  async preparePasswordRecovery(): Promise<{
    valid: boolean;
    expired: boolean;
    mfaRequired: boolean;
  }> {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const query = new URLSearchParams(window.location.search);
    const callbackError =
      hash.get("error_code") ?? hash.get("error") ?? query.get("error_code") ?? query.get("error");
    if (callbackError) {
      return {
        valid: false,
        expired: callbackError.toLowerCase().includes("expired"),
        mfaRequired: false,
      };
    }

    const accessToken = hash.get("access_token");
    const refreshToken = hash.get("refresh_token");
    if (accessToken && refreshToken) {
      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (error) {
        const { data: existing } = await supabase.auth.getSession();
        if (!existing.session) {
          return {
            valid: false,
            expired: error.message.toLowerCase().includes("expired"),
            mfaRequired: false,
          };
        }
      }
    } else {
      const code = query.get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          const { data: existing } = await supabase.auth.getSession();
          if (!existing.session) {
            return {
              valid: false,
              expired: error.message.toLowerCase().includes("expired"),
              mfaRequired: false,
            };
          }
        }
      }
    }

    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      return { valid: false, expired: false, mfaRequired: false };
    }
    const { data: assurance, error: assuranceError } =
      await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (assuranceError) return fail(assuranceError);
    return {
      valid: true,
      expired: false,
      mfaRequired: assurance?.nextLevel === "aal2" && assurance.currentLevel !== "aal2",
    };
  },
  async updatePassword(newPassword: string): Promise<void> {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) return fail(error);
  },
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    const { data: userData } = await supabase.auth.getUser();
    const email = userData.user?.email;
    if (!email) throw { status: 401, message: "No authenticated user." };
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password: currentPassword,
    });
    if (signInError) return fail(signInError);
    return authApi.updatePassword(newPassword);
  },
  async validateInvitation(): Promise<"VALID" | "INVALID" | "EXPIRED"> {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const query = new URLSearchParams(window.location.search);
    const callbackError =
      hash.get("error_code") ?? hash.get("error") ?? query.get("error_code") ?? query.get("error");

    if (callbackError) {
      return callbackError.toLowerCase().includes("expired") ? "EXPIRED" : "INVALID";
    }

    const accessToken = hash.get("access_token");
    const refreshToken = hash.get("refresh_token");
    if (accessToken && refreshToken) {
      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (error) {
        const { data: existing } = await supabase.auth.getSession();
        if (existing.session) return "VALID";
        return error.message.toLowerCase().includes("expired") ? "EXPIRED" : "INVALID";
      }
    } else {
      const code = query.get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          const { data: existing } = await supabase.auth.getSession();
          if (existing.session) return "VALID";
          return error.message.toLowerCase().includes("expired") ? "EXPIRED" : "INVALID";
        }
      }
    }

    const { data, error } = await supabase.auth.getSession();
    if (error) {
      return error.message.toLowerCase().includes("expired") ? "EXPIRED" : "INVALID";
    }
    return data.session ? "VALID" : "INVALID";
  },
  async enrollMfa(): Promise<{ qrCodeSvg: string; secret: string }> {
    const { data: existing, error: listError } = await supabase.auth.mfa.listFactors();
    if (listError) return fail(listError);
    for (const factor of existing.all.filter(
      (item) => item.factor_type === "totp" && item.status === "unverified",
    )) {
      const { error: cleanupError } = await supabase.auth.mfa.unenroll({
        factorId: factor.id,
      });
      if (cleanupError) return fail(cleanupError);
    }
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: "IsoGuard",
    });
    if (error) return fail(error);
    pendingFactorId = data.id;
    return { qrCodeSvg: data.totp.qr_code, secret: data.totp.secret };
  },
  async cancelMfaEnrollment(): Promise<void> {
    if (!pendingFactorId) return;
    const { error } = await supabase.auth.mfa.unenroll({ factorId: pendingFactorId });
    if (error) return fail(error);
    pendingFactorId = null;
  },
  async unenrollMfa(): Promise<void> {
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (error) return fail(error);
    for (const factor of data.totp) {
      const result = await supabase.auth.mfa.unenroll({ factorId: factor.id });
      if (result.error) return fail(result.error);
    }
  },
};
