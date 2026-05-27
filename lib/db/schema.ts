import {
  pgTable,
  text,
  timestamp,
  integer,
  jsonb,
  primaryKey,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import type { AdapterAccountType } from "next-auth/adapters";

// ============================================================================
// Auth.js v5 tables (required by @auth/drizzle-adapter)
// ============================================================================

export const users = pgTable("user", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  /** Nullable — wallet-only users don't have email. */
  email: text("email"),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
  /** Lowercased EVM address. Unique. Set when user signs in with wallet. */
  walletAddress: text("walletAddress").unique(),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
});

export const accounts = pgTable(
  "account",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => [
    primaryKey({ columns: [account.provider, account.providerAccountId] }),
  ]
);

export const sessions = pgTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (vt) => [primaryKey({ columns: [vt.identifier, vt.token] })]
);

// ============================================================================
// Lodestar application tables
// ============================================================================

/**
 * Historical record of searches a user performed. Drives the "Recent searches"
 * panel and feeds the agent's memory of the user's interests.
 */
export const searches = pgTable("search", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  query: text("query").notNull(),
  sources: text("sources").array().notNull().default([]),
  resultsCount: integer("resultsCount").notNull().default(0),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
});

/**
 * Cross-source cache of items discovered (repos, projects, products).
 * Avoids hitting upstream APIs repeatedly for the same item.
 */
export const reposCache = pgTable(
  "repos_cache",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    source: text("source").notNull(),
    sourceId: text("sourceId").notNull(),
    fullName: text("fullName").notNull(),
    data: jsonb("data").notNull(),
    fetchedAt: timestamp("fetchedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("repos_source_id_idx").on(table.source, table.sourceId)]
);

/**
 * Per-user profile of preferences, stack, and learned axes.
 * Built progressively from onboarding + behavior. Drives personalized ranking.
 */
export const profiles = pgTable("profile", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" })
    .unique(),
  axes: jsonb("axes"),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
});

/**
 * Cross-linked creator profile (GitHub handle → Farcaster → Base onchain).
 * Cached because Neynar/Basescan calls are slow and we re-encounter the same
 * creators across searches.
 */
export const creatorsCache = pgTable("creators_cache", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  githubHandle: text("githubHandle").notNull().unique(),
  farcasterFid: integer("farcasterFid"),
  farcasterUsername: text("farcasterUsername"),
  verifiedAddresses: jsonb("verifiedAddresses"),
  baseContractCount: integer("baseContractCount").default(0),
  baseTxCount: integer("baseTxCount").default(0),
  data: jsonb("data"),
  fetchedAt: timestamp("fetchedAt", { mode: "date" }).notNull().defaultNow(),
});
