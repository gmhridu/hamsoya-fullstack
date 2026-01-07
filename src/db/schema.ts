import {
  boolean,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["USER", "SELLER", "ADMIN"]);

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    email: varchar("email", { length: 255 }).notNull().unique(),
    password_hash: text("password_hash"),
    role: roleEnum().default("USER"),
    phone_number: varchar("phone_number", { length: 255 }),
    profile_image_url: text("profile_image_url"),
    is_verified: boolean("is_verified").notNull().default(false),
    google_id: varchar("google_id", { length: 255 }).unique(),
    oauth_provider: varchar("oauth_provider", { length: 50 }),
    oauth_access_token: varchar("oauth_access_token"),
    oauth_refresh_token: varchar("oauth_refresh_token"),
    oauth_token_expires_at: timestamp("oauth_token_expires_at"),
    createdAt: timestamp("created_at").defaultNow(),
    updated_at: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_users_name").on(table.name),
    uniqueIndex("idx_users_email").on(table.email),
    uniqueIndex("idx_users_phone").on(table.phone_number),
  ]
);

export const refreshTokens = pgTable(
  "refresh_tokens",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
    isRevoked: boolean("is_revoked").notNull().default(false),
    familyId: uuid("family_id").defaultRandom(), // For token family to handle reuse
  },
  (table) => [
    index("idx_refresh_tokens_user_id").on(table.userId),
    index("idx_refresh_tokens_expires_at").on(table.expiresAt),
  ]
);

export const passwordResetTokens = pgTable(
  "password_reset_tokens",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
    used: boolean("used").notNull().default(false),
  },
  (table) => [
    index("idx_password_reset_tokens_user_id").on(table.userId),
    index("idx_password_reset_tokens_expires_at").on(table.expiresAt),
  ]
);


