import { pgTable, uuid, text, integer, timestamp, jsonb, index } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("user"), // 'user' | 'admin'
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sessions = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(), // 64-char random token
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)]
);

export type ScanFlag = {
  label: string;
  detail: string;
  severity: "low" | "medium" | "high" | "info";
};

export const scans = pgTable(
  "scans",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(), // 'image' | 'video' | 'audio' | 'text'
    target: text("target").notNull().default(""), // file name or text excerpt / url
    trustScore: integer("trust_score").notNull(), // 0-100
    verdict: text("verdict").notNull(), // 'authentic' | 'uncertain' | 'manipulated'
    confidence: integer("confidence").notNull().default(50), // 0-100
    flags: jsonb("flags").$type<ScanFlag[]>().notNull().default([]),
    signals: jsonb("signals").$type<Record<string, number | string | boolean>>().notNull().default({}),
    durationMs: integer("duration_ms").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("scans_user_idx").on(t.userId), index("scans_created_idx").on(t.createdAt)]
);

export const contentReports = pgTable(
  "content_reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    scanId: uuid("scan_id").references(() => scans.id, { onDelete: "set null" }),
    scanType: text("scan_type").notNull().default("image"),
    reason: text("reason").notNull(), // dropdown value
    notes: text("notes").notNull().default(""),
    contentSummary: text("content_summary").notNull().default(""),
    status: text("status").notNull().default("open"), // 'open' | 'resolved'
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("reports_user_idx").on(t.userId)]
);
