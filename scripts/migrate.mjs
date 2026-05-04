// Run all migrations via Supabase Management API
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

// Set these environment variables before running:
// SUPABASE_PAT - Personal Access Token from supabase.com/dashboard/account/tokens
// SUPABASE_PROJECT_REF - Project reference ID from your project URL
const PAT = process.env.SUPABASE_PAT;
const REF = process.env.SUPABASE_PROJECT_REF;

if (!PAT || !REF) {
  console.error("Error: Set SUPABASE_PAT and SUPABASE_PROJECT_REF environment variables");
  process.exit(1);
}
const API = `https://api.supabase.com/v1/projects/${REF}/database/query`;

const migrations = [
  "supabase/migrations/0001_init_schema.sql",
  "supabase/migrations/0002_triggers.sql",
  "supabase/migrations/0003_rls.sql",
  "supabase/migrations/0004_realtime.sql",
];

async function runSQL(sql, label) {
  const res = await fetch(API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${PAT}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: sql }),
  });
  const text = await res.text();
  if (!res.ok) {
    console.error(`  ✗ ${label} FAILED (${res.status}):`, text.substring(0, 200));
    return false;
  }
  console.log(`  ✓ ${label} done`);
  return true;
}

async function main() {
  console.log("Running migrations via Supabase Management API...\n");

  for (const file of migrations) {
    const path = join(root, file);
    const sql = readFileSync(path, "utf8");
    console.log(`Running ${file}...`);
    await runSQL(sql, file);
  }

  console.log("\n✓ All migrations processed.");
}

main().catch((err) => {
  console.error("Fatal error:", err.message);
  process.exit(1);
});
