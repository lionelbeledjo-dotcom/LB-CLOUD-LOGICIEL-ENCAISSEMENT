import { createClient } from "@supabase/supabase-js";
const url = process.env.SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const admin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

const email = "lionelbrown2728@yahoo.fr";
const password = "Artiste200..";

// Try create; if already exists, fetch
let userId: string | null = null;
const { data, error } = await admin.auth.admin.createUser({
  email, password, email_confirm: true,
  user_metadata: { full_name: "Super Admin Lb Cloud" },
});
if (error) {
  console.log("create error:", error.message);
  const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  const found = list.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (found) {
    userId = found.id;
    // Reset password to requested one
    await admin.auth.admin.updateUserById(found.id, { password, email_confirm: true });
    console.log("existing user updated:", userId);
  } else {
    throw new Error("Failed to create or find user");
  }
} else {
  userId = data.user!.id;
  console.log("created:", userId);
}

// Add to super_admins
const { error: e2 } = await admin.from("super_admins").upsert({ user_id: userId }, { onConflict: "user_id" });
if (e2) console.log("super_admins upsert:", e2.message);
else console.log("super_admins OK");

// Ensure profile
await admin.from("profiles").upsert({ user_id: userId, full_name: "Super Admin Lb Cloud" }, { onConflict: "user_id" });
console.log("DONE", userId);
