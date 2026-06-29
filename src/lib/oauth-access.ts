import "server-only";

import type { User } from "@supabase/supabase-js";
import type { AuthRole } from "./auth";
import { createSupabaseAdminClient } from "./supabase-admin";

const defaultAdminEmails = ["renzomamanigalindo@gmail.com"];

type ProfileRow = {
  id: string;
  role: "admin" | "delegate" | "viewer";
  full_name: string | null;
  phone: string | null;
};

type AdminEmailRow = {
  email: string;
  full_name: string | null;
};

type DelegateTeamRow = {
  id: string;
  delegate_name: string;
  delegate_phone: string | null;
  delegate_email: string | null;
};

type OAuthAccessResult =
  | {
      ok: true;
      role: AuthRole;
      email: string;
      displayName: string;
    }
  | {
      ok: false;
      reason: "missing_email" | "not_authorized" | "not_registered";
    };

export async function resolveOAuthAccess(user: User): Promise<OAuthAccessResult> {
  const email = user.email?.trim().toLowerCase();

  if (!email) {
    return { ok: false, reason: "missing_email" };
  }

  const supabase = createSupabaseAdminClient();
  const profile = await getProfile(supabase, user.id);
  const adminEmail = await getAdminEmail(supabase, email);
  const displayName = profile?.full_name || adminEmail?.full_name || getUserDisplayName(user) || email;

  if (profile?.role === "admin" || adminEmail || isAllowedAdminEmail(email)) {
    await upsertProfile(supabase, {
      id: user.id,
      role: "admin",
      fullName: displayName,
      phone: profile?.phone ?? null
    });

    return {
      ok: true,
      role: "admin",
      email,
      displayName
    };
  }

  const team = await findDelegateTeamByEmail(supabase, email);

  if (!team) {
    if (profile?.role === "delegate") {
      return {
        ok: true,
        role: "delegate",
        email,
        displayName
      };
    }

    return { ok: false, reason: "not_registered" };
  }

  const delegateName = team.delegate_name || displayName;

  await upsertProfile(supabase, {
    id: user.id,
    role: "delegate",
    fullName: delegateName,
    phone: team.delegate_phone
  });
  await linkDelegateTeams(supabase, user.id, email);

  return {
    ok: true,
    role: "delegate",
    email,
    displayName: delegateName
  };
}

function getUserDisplayName(user: User) {
  const metadata = user.user_metadata as Record<string, unknown>;
  const fullName = metadata.full_name ?? metadata.name;
  return typeof fullName === "string" ? fullName : null;
}

async function getProfile(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  userId: string
) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, role, full_name, phone")
    .eq("id", userId)
    .maybeSingle<ProfileRow>();

  if (error) {
    throw new Error(`Could not load OAuth profile: ${error.message}`);
  }

  return data;
}

async function getAdminEmail(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  email: string
) {
  const { data, error } = await supabase
    .from("admin_emails")
    .select("email, full_name")
    .eq("email", email)
    .eq("active", true)
    .maybeSingle<AdminEmailRow>();

  if (error) {
    throw new Error(`Could not load admin email allowlist: ${error.message}`);
  }

  return data;
}

async function findDelegateTeamByEmail(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  email: string
) {
  const { data, error } = await supabase
    .from("teams")
    .select("id, delegate_name, delegate_phone, delegate_email")
    .eq("delegate_email", email)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<DelegateTeamRow>();

  if (error) {
    throw new Error(`Could not load delegate team: ${error.message}`);
  }

  return data;
}

async function upsertProfile(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  {
    id,
    role,
    fullName,
    phone
  }: {
    id: string;
    role: AuthRole;
    fullName: string;
    phone: string | null;
  }
) {
  const { error } = await supabase.from("profiles").upsert(
    {
      id,
      role,
      full_name: fullName,
      phone,
      updated_at: new Date().toISOString()
    },
    { onConflict: "id" }
  );

  if (error) {
    throw new Error(`Could not upsert OAuth profile: ${error.message}`);
  }
}

async function linkDelegateTeams(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  userId: string,
  email: string
) {
  const { error } = await supabase
    .from("teams")
    .update({
      delegate_user_id: userId,
      updated_at: new Date().toISOString()
    })
    .eq("delegate_email", email);

  if (error) {
    throw new Error(`Could not link delegate teams: ${error.message}`);
  }
}

function isAllowedAdminEmail(email: string) {
  const configuredEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((current) => current.trim().toLowerCase())
    .filter(Boolean);

  return [...defaultAdminEmails, ...configuredEmails].includes(email);
}
