import { RedisService } from "@/lib/redis";
import { initTRPC, TRPCError } from "@trpc/server";
import { cache } from "react";
import superjson from "superjson";
import jwt from "jsonwebtoken";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { User } from "@/features/auth/interface/auth.interface";
import { redis } from "@/lib/utils";

interface Context {
  req: Request;
  userId: string | null;
  user: User | null;
  resHeaders: Headers;
}

export const createTRPCContext = cache(async (opts: { req: Request }) => {
  /**
   * @see: https://trpc.io/docs/server/context
   */
  const { req } = opts;
  const authHeader = req.headers.get("authorization");
  let userId: string | null = null;
  let user: User | null = null;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
     try {
      const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET!) as { userId: string };
      userId = payload.userId;

      const userResult = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      if (userResult.length) {
        const dbUser = userResult[0];
        user = {
          id: dbUser.id,
          name: dbUser.name,
          email: dbUser.email,
          role: dbUser.role,
          phone_number: dbUser.phone_number,
          profile_image_url: dbUser.profile_image_url,
          is_verified: dbUser.is_verified,
          created_at: dbUser.createdAt?.toISOString(),
          updated_at: dbUser.updated_at?.toISOString(),
        };
      }
    } catch (err) {
      console.error("JWT verification failed:", err);
    }
  }

  return { req, userId, user, resHeaders: new Headers() };
});
// Avoid exporting the entire t-object
// since it's not very descriptive.
// For instance, the use of a t variable
// is common in i18n libraries.
const t = initTRPC.context<Context>().create({
  /**
   * @see https://trpc.io/docs/server/data-transformers
   */
  transformer: superjson,
});
// Base router and procedure helpers
export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory;
export const baseProcedure = t.procedure;
export const redisProcedure = baseProcedure.use(({ ctx, next }) => {
  if (!redis) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Redis service is not available",
    });
  }

  return next({ ctx: { ...ctx, redis } });
});

export const protectedProcedure = baseProcedure.use(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Authentication required",
    });
  }

  const redis = new RedisService(process.env.REDIS_URL!);

  if (!redis) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Redis service is not available",
    });
  }

  return next({ ctx: { ...ctx, redis } });
});
