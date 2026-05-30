import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type UserPayload = {
  email?: string;
  password?: string;
  full_name?: string;
  role?: string;
  leader_scope?: string;
  is_active?: boolean;
};

// Must stay aligned with BACKEND_SCOPE.md and the UI role helpers.
const ALLOWED_ROLES = new Set(["admin", "director", "leader", "assessor", "viewer"]);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return json({ error: "Missing Supabase environment variables" }, 500);
  }

  const authHeader = req.headers.get("Authorization") || "";
  if (!authHeader.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  const { data: authData, error: authError } = await userClient.auth.getUser();
  if (authError || !authData.user) return json({ error: "Unauthorized" }, 401);

  const { data: profile, error: profileError } = await adminClient
    .from("profiles")
    .select("role,is_active")
    .eq("id", authData.user.id)
    .single();
  if (profileError || !profile || profile.role !== "admin" || profile.is_active === false) {
    return json({ error: "Admin role required" }, 403);
  }

  let payload: UserPayload;
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const email = String(payload.email || "").trim().toLowerCase();
  const fullName = String(payload.full_name || "").trim();
  const role = ALLOWED_ROLES.has(String(payload.role || "")) ? String(payload.role) : "viewer";
  const leaderScope = String(payload.leader_scope || "").trim();
  const isActive = payload.is_active !== false;
  const password = String(payload.password || "");

  if (!email || !email.includes("@")) return json({ error: "Valid email is required" }, 400);
  if (password && password.length < 8) return json({ error: "Password must have at least 8 characters" }, 400);

  const authRequest = password
    ? adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName },
      })
    : adminClient.auth.admin.inviteUserByEmail(email, {
        data: { full_name: fullName },
      });

  const { data: created, error: createError } = await authRequest;
  if (createError || !created.user) {
    return json({ error: createError?.message || "Could not create user" }, 400);
  }

  const { error: upsertError } = await adminClient.from("profiles").upsert({
    id: created.user.id,
    email,
    full_name: fullName,
    role,
    leader_scope: leaderScope || null,
    is_active: isActive,
  });
  if (upsertError) return json({ error: upsertError.message }, 400);

  const { error: auditError } = await adminClient.from("admin_history").insert({
    description: `Utworzono konto: ${fullName || email} (${role})`,
    changed_by: authData.user.id,
  });
  if (auditError) {
    console.warn("admin_history write failed:", auditError.message);
  }

  return json({
    ok: true,
    user: {
      id: created.user.id,
      email,
      full_name: fullName,
      role,
      leader_scope: leaderScope || null,
      is_active: isActive,
    },
  });
});
