import { db } from "@/db";
import { refreshTokens, users } from "@/db/schema";
import { hashToken, verifyAccessToken } from "@/utils/auth-utils";
import { and, eq, gt } from "drizzle-orm";
import { cookies } from "next/headers";
import "server-only";

export async function getServerUser() {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get("refreshToken")?.value;
  const accessToken = cookieStore.get("accessToken")?.value;

  let userId: string | null = null;

  // First, try refresh token
  if (refreshToken) {
    const tokenHash = await hashToken(refreshToken);

    const tokenResult = await db
      .select()
      .from(refreshTokens)
      .where(
        and(
          eq(refreshTokens.tokenHash, tokenHash),
          eq(refreshTokens.isRevoked, false),
          gt(refreshTokens.expiresAt, new Date())
        )
      )
      .limit(1);

    if (tokenResult[0]) {
      userId = tokenResult[0].userId;
    }
  }

  // If no userId from refresh token, try access token
  if (!userId && accessToken) {
    const payload = verifyAccessToken(accessToken);
    if (payload) {
      userId = payload.userId;
    }
  }

  if (!userId) return null;

  const userResult = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!userResult[0]) return null;

  const user = userResult[0];

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone_number: user.phone_number,
    profile_image_url: user.profile_image_url,
    is_verified: user.is_verified,
    created_at: user.createdAt?.toISOString(),
    updated_at: user.updated_at?.toISOString(),
  };
}
