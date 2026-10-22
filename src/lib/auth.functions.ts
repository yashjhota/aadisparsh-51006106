import { createServerFn } from "@tanstack/react-start";
import { mobileToEmail, normalizeMobile } from "@/lib/mobile-auth";

export interface MobileSignUpResult {
  ok: boolean;
  error?: string;
}

/**
 * Public: creates a devotee account keyed by mobile number. The synthetic
 * email cannot receive mail, so the account is created pre-confirmed. Only the
 * family_user role is ever granted (by the signup trigger).
 */
export const signUpWithMobile = createServerFn({ method: "POST" })
  .inputValidator((input: { mobile: string; password: string; fullName: string }) => {
    const mobile = normalizeMobile(String(input.mobile ?? ""));
    if (!mobile) throw new Error("Enter a valid 10-digit mobile number");
    const password = String(input.password ?? "");
    if (password.length < 8 || password.length > 72) throw new Error("Password must be 8–72 characters");
    const fullName = String(input.fullName ?? "").trim().slice(0, 120);
    if (!fullName) throw new Error("Full name is required");
    return { mobile, password, fullName };
  })
  .handler(async ({ data }): Promise<MobileSignUpResult> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.createUser({
      email: mobileToEmail(data.mobile),
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.fullName, phone: `+91${data.mobile}`, signup_method: "mobile" },
    });
    if (error) {
      const msg = /already|registered|exists/i.test(error.message)
        ? "This mobile number is already registered. Please sign in."
        : error.message;
      return { ok: false, error: msg };
    }
    return { ok: true };
  });
