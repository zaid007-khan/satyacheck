// Seeds SatyaCheck base accounts — idempotent (upserts by email).
import { scryptSync, randomBytes } from "crypto";
import pg from "pg";

const DATABASE_URL = process.env.DATABASE_URL || "postgresql://postgres:postgres@127.0.0.1:5432/app_db";

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

const accounts = [
  { name: "Platform Admin", email: "admin@satyacheck.in", password: "SatyaAdmin@2026", role: "admin" },
  { name: "Aarav Sharma", email: "demo@satyacheck.in", password: "SatyaDemo@2026", role: "user" },
];

const client = new pg.Client({ connectionString: DATABASE_URL });
await client.connect();

for (const acc of accounts) {
  const existing = await client.query("select id, role from users where email = $1", [acc.email]);
  if (existing.rows.length) {
    // ensure role is correct
    if (existing.rows[0].role !== acc.role) {
      await client.query("update users set role = $1 where email = $2", [acc.role, acc.email]);
      console.log(`updated role for ${acc.email}`);
    } else {
      console.log(`exists: ${acc.email}`);
    }
    continue;
  }
  await client.query(
    "insert into users (name, email, password_hash, role) values ($1, $2, $3, $4)",
    [acc.name, acc.email, hashPassword(acc.password), acc.role]
  );
  console.log(`created: ${acc.email} (${acc.role})`);
}

await client.end();
console.log("seed complete");
