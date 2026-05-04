// Reset password using service role
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (!SERVICE_KEY || !URL) {
  console.error("Missing env vars - reading from .env.local");
  const fs = await import("fs");
  const env = fs.readFileSync(".env.local", "utf8");
  const lines = env.split("\n");
  for (const l of lines) {
    if (l.startsWith("SUPABASE_SERVICE_ROLE_KEY=")) process.env.SUPABASE_SERVICE_ROLE_KEY = l.split("=").slice(1).join("=").trim();
    if (l.startsWith("NEXT_PUBLIC_SUPABASE_URL=")) process.env.NEXT_PUBLIC_SUPABASE_URL = l.split("=").slice(1).join("=").trim();
  }
}

const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const URL2 = process.env.NEXT_PUBLIC_SUPABASE_URL;
const userId = "87ddaf7f-8f78-4b67-a915-d7e3044457a0";

const res = await fetch(`${URL2}/auth/v1/admin/users/${userId}`, {
  method: "PUT",
  headers: {
    "apikey": KEY,
    "Authorization": `Bearer ${KEY}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ password: "TaskFlow2024!" }),
});
console.log(res.status, await res.text());
