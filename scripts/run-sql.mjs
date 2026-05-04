import { readFileSync } from "fs";
const PAT = process.env.SUPABASE_PAT;
const REF = process.env.SUPABASE_PROJECT_REF;
if (!PAT || !REF) {
  console.error("Set SUPABASE_PAT and SUPABASE_PROJECT_REF env vars");
  process.exit(1);
}
const file = process.argv[2];
const sql = readFileSync(file, "utf8");
const res = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
  method: "POST",
  headers: { Authorization: `Bearer ${PAT}`, "Content-Type": "application/json" },
  body: JSON.stringify({ query: sql }),
});
const text = await res.text();
console.log(res.status, text.substring(0, 500));
