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
