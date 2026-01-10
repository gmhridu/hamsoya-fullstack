import bcrypt from "bcrypt";
import crypto, { createHash } from "crypto";
import jwt from "jsonwebtoken";
import { db } from "@/db";
import { refreshTokens, passwordResetTokens, users } from "@/db/schema";
import { eq, and, lt } from "drizzle-orm";
import { getServerUser } from "@/lib/server-auth";
import { redirect } from "next/navigation";

export const JWT_SECRET = process.env.JWT_ACCESS_SECRET!;
export const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET! || JWT_SECRET;
export const ACCESS_TOKEN_EXPIRY = "15m"; // 15 minutes
export const REFRESH_TOKEN_EXPIRY = 30 * 24 * 60 * 60; // 30 days in seconds

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export async function hashToken(token: string): Promise<string> {
  return createHash("sha256").update(token).digest("hex");
  // or "sha512" if you want to be extra sure
}
export function generateAccessToken(payload: { userId: string }): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
}

export function generateRefreshToken(): string {
  return crypto.randomBytes(64).toString("hex");
}

export function verifyAccessToken(token: string): { userId: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string };
  } catch {
    return null;
  }
}

export async function verifyRefreshToken(
  token: string,
  userId: string
): Promise<boolean> {
  const tokenHash = await hashToken(token);
  const result = await db
    .select()
    .from(refreshTokens)
    .where(
      and(
        eq(refreshTokens.userId, userId),
        eq(refreshTokens.tokenHash, tokenHash),
        eq(refreshTokens.isRevoked, false),
        lt(refreshTokens.expiresAt, new Date())
      )
    )
    .limit(1);

  return result.length > 0;
}

export async function storeRefreshToken(
  userId: string,
  token: string,
  familyId?: string | null
): Promise<void> {
  const tokenHash = await hashToken(token);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY);

  await db.insert(refreshTokens).values({
    userId,
    tokenHash,
    expiresAt,
    familyId: familyId || crypto.randomUUID(),
  });
}

export async function revokeRefreshTokens(
  userId: string,
  familyId?: string | null
): Promise<void> {
  if (familyId) {
    await db
      .update(refreshTokens)
      .set({ isRevoked: true })
      .where(
        and(
          eq(refreshTokens.userId, userId),
          eq(refreshTokens.familyId, familyId)
        )
      );
  } else {
    await db
      .update(refreshTokens)
      .set({ isRevoked: true })
      .where(eq(refreshTokens.userId, userId));
  }
}

export async function storePasswordResetToken(
  userId: string,
  token: string
): Promise<void> {
  const tokenHash = await hashToken(token);
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

  await db.insert(passwordResetTokens).values({
    userId,
    tokenHash,
    expiresAt,
  });
}

export async function verifyPasswordResetToken(
  token: string,
  userId: string
): Promise<boolean> {
  const tokenHash = await hashToken(token);
  const result = await db
    .select()
    .from(passwordResetTokens)
    .where(
      and(
        eq(passwordResetTokens.userId, userId),
        eq(passwordResetTokens.tokenHash, tokenHash),
        eq(passwordResetTokens.used, false),
        lt(passwordResetTokens.expiresAt, new Date())
      )
    )
    .limit(1);

  if (result.length > 0) {
    // Mark as used
    await db
      .update(passwordResetTokens)
      .set({ used: true })
      .where(eq(passwordResetTokens.id, result[0].id));
    return true;
  }
  return false;
}

export async function updatePassword(
  userId: string,
  newPassword: string
): Promise<void> {
  const passwordHash = await hashPassword(newPassword);
  await db
    .update(users)
    .set({ password_hash: passwordHash, updated_at: new Date() })
    .where(eq(users.id, userId));
}

export async function requiredAuth() {
  const user = await getServerUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

export async function requiredUnauth() {
  const user = await getServerUser();

  if (user) {
    redirect("/");
  }

  return null;
}
