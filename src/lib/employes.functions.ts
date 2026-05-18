import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const ROLES = ["admin_entreprise", "caissier", "comptable", "employe"] as const;

async function assertAdmin(supabase: any, companyId: string, userId: string) {
  const { data, error } = await supabase
    .from("company_members")
    .select("role")
    .eq("company_id", companyId)
    .eq("user_id", userId)
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data || data.role !== "admin_entreprise") {
    // also allow super_admin
    const { data: sa } = await supabase
      .from("super_admins")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();
    if (!sa) throw new Error("Réservé aux administrateurs de l'entreprise");
  }
}

export const listEmployes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { companyId: string }) =>
    z.object({ companyId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, data.companyId, userId);

    const { data: members, error } = await supabase
      .from("company_members")
      .select("id, user_id, role, is_active, created_at")
      .eq("company_id", data.companyId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);

    const ids = (members ?? []).map((m: any) => m.user_id);
    if (ids.length === 0) return [];

    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name, phone, avatar_url")
      .in("user_id", ids);

    // Emails via admin (best effort)
    const emails = new Map<string, string>();
    await Promise.all(
      ids.map(async (uid) => {
        const { data: u } = await supabaseAdmin.auth.admin.getUserById(uid);
        if (u?.user?.email) emails.set(uid, u.user.email);
      }),
    );

    return (members ?? []).map((m: any) => ({
      ...m,
      full_name: profiles?.find((p: any) => p.user_id === m.user_id)?.full_name ?? null,
      phone: profiles?.find((p: any) => p.user_id === m.user_id)?.phone ?? null,
      email: emails.get(m.user_id) ?? null,
    }));
  });

export const inviteEmploye = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    companyId: string;
    email: string;
    fullName: string;
    role: (typeof ROLES)[number];
    password?: string;
  }) =>
    z.object({
      companyId: z.string().uuid(),
      email: z.string().email().max(255),
      fullName: z.string().min(1).max(120),
      role: z.enum(ROLES),
      password: z.string().min(8).max(72).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, data.companyId, userId);

    // Create or reuse auth user
    let newUserId: string | null = null;
    const { data: created, error: createErr } =
      await supabaseAdmin.auth.admin.createUser({
        email: data.email,
        password: data.password ?? `Lb${crypto.randomUUID().slice(0, 12)}!`,
        email_confirm: true,
        user_metadata: { full_name: data.fullName },
      });
    if (createErr) {
      // If already exists, find existing user
      const { data: list } = await supabaseAdmin.auth.admin.listUsers({ perPage: 200 });
      const existing = list?.users.find((u: any) => u.email?.toLowerCase() === data.email.toLowerCase());
      if (!existing) throw new Error(createErr.message);
      newUserId = existing.id;
    } else {
      newUserId = created.user!.id;
    }

    // Upsert profile
    await supabaseAdmin
      .from("profiles")
      .upsert({ user_id: newUserId!, full_name: data.fullName }, { onConflict: "user_id" });

    // Insert membership
    const { error: memberErr } = await supabaseAdmin
      .from("company_members")
      .insert({
        company_id: data.companyId,
        user_id: newUserId!,
        role: data.role,
        invited_by: userId,
        is_active: true,
      });
    if (memberErr && !/duplicate/i.test(memberErr.message)) {
      throw new Error(memberErr.message);
    }

    return { ok: true, user_id: newUserId };
  });

export const updateEmployeRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { companyId: string; memberId: string; role: (typeof ROLES)[number] }) =>
    z.object({
      companyId: z.string().uuid(),
      memberId: z.string().uuid(),
      role: z.enum(ROLES),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, data.companyId, userId);
    const { error } = await supabase
      .from("company_members")
      .update({ role: data.role })
      .eq("id", data.memberId)
      .eq("company_id", data.companyId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setEmployeActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { companyId: string; memberId: string; isActive: boolean }) =>
    z.object({
      companyId: z.string().uuid(),
      memberId: z.string().uuid(),
      isActive: z.boolean(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, data.companyId, userId);
    const { error } = await supabase
      .from("company_members")
      .update({ is_active: data.isActive })
      .eq("id", data.memberId)
      .eq("company_id", data.companyId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
