import {
  baseProcedure,
  createTRPCRouter,
  redisProcedure,
  protectedProcedure,
} from "@/trpc/init";
import {
  RegisterSchema,
  VerifyOTPSchema,
  ResendOTPSchema,
  LoginSchema,
  ForgotPasswordSchema,
} from "@/features/auth/interface/auth.interface";
import z from "zod";
import { db } from "@/db";
import { users, refreshTokens } from "@/db/schema";
import { eq, and, gt } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { hashPassword } from "@/lib/crypto";
import {
  verifyPassword,
  hashToken,
  generateAccessToken,
  generateRefreshToken,
  storeRefreshToken,
  revokeRefreshTokens,
} from "@/utils/auth-utils";
import { sendVerificationOtp } from "@/utils/send-verification-otp";
import { successResponse } from "@/utils/response-builder";
import { OTP_LIMITS } from "@/lib/redis";
import { isProd } from "@/lib/utils";

// Helper function for updating password safely
async function updatePassword(userId: string, newPassword: string) {
  const hashedPassword = await hashPassword(newPassword);
  await db
    .update(users)
    .set({ password_hash: hashedPassword, updated_at: new Date() })
    .where(eq(users.id, userId));
}

export const authRouters = createTRPCRouter({
  register: redisProcedure
    .input(RegisterSchema)
    .mutation(async ({ ctx, input }) => {
      const { name, email, password, role, phone_number, profile_image_url } =
        input;

      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (existingUser.length > 0) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "User already exists",
        });
      }

      const passwordHash = await hashPassword(password);

      const registrationData = {
        name,
        email,
        password_hash: passwordHash,
        role,
        phone_number,
        profile_image_url,
      };

      await ctx.redis!.setRegistrationData(email, registrationData);
      await sendVerificationOtp(email, name);

      return {
        message:
          "Registration initiated. Please check your email for verification OTP.",
      };
    }),

  getUserByEmail: baseProcedure
    .input(z.object({ email: z.string() }))
    .query(async ({ input }) => {
      const userResult = await db
        .select()
        .from(users)
        .where(eq(users.email, input.email))
        .limit(1);

      return userResult.length > 0 ? userResult[0] : null;
    }),

  verifyOTP: redisProcedure
    .input(VerifyOTPSchema)
    .mutation(async ({ ctx, input }) => {
      const { email, otp } = input;

      const failCount = await ctx.redis!.getOTPFailCount(email);
      if (failCount >= 5) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message:
            "Too many incorrect attempts. Account locked for 15 minutes.",
        });
      }

      const storedOTP = await ctx.redis.getOTP(email);
      if (!storedOTP) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "OTP expired or not found. Please request a new one.",
        });
      }

      if (otp !== storedOTP) {
        const newFailCount = await ctx.redis!.incrementOTPFailCount(email);
        const remainingAttempts = 5 - newFailCount;

        if (remainingAttempts <= 0) {
          await ctx.redis.setLock(email, 15);
          await ctx.redis.cleanup(email);
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message:
              "Too many incorrect attempts. Account locked for 15 minutes.",
          });
        }

        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: `Incorrect OTP. ${remainingAttempts} attempts remaining.`,
        });
      }

      const registrationData = await ctx.redis!.getRegistrationData(email);
      if (!registrationData) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Registration data expired. Please register again.",
        });
      }

      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (existingUser.length > 0) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "User already exists",
        });
      }

      await db.insert(users).values({
        ...registrationData,
        is_verified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await ctx.redis!.cleanup(email);
      await ctx.redis!.deleteRegistrationData(email);

      return {
        message: "Email verified successfully. Account created!",
      };
    }),

  getOTPCooldownStatus: redisProcedure
    .input(z.object({ email: z.string() }))
    .query(async ({ ctx, input }) => {
      const cooldownRemaining = await ctx.redis!.getCooldownRemaining(
        input.email
      );
      return successResponse(
        { cooldownRemaining, canResend: cooldownRemaining === 0 },
        "Cooldown status retrieved"
      );
    }),

  getPasswordResetCooldownStatus: redisProcedure
    .input(z.object({ email: z.string() }))
    .query(async ({ ctx, input }) => {
      const cooldownRemaining = await ctx.redis!.getCooldownRemaining(
        input.email,
        "password_reset"
      );
      return successResponse(
        { cooldownRemaining, canResend: cooldownRemaining === 0 },
        "Password reset cooldown status retrieved"
      );
    }),

  resendOTP: redisProcedure
    .input(ResendOTPSchema)
    .mutation(async ({ ctx, input }) => {
      const { email } = input;
      const registrationData = await ctx.redis!.getRegistrationData(email);
      if (!registrationData) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No pending registration found for this email.",
        });
      }

      if (await ctx.redis!.checkCooldown(email)) {
        const remaining = await ctx.redis!.getCooldownRemaining(email);
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: `Please wait ${remaining} seconds before requesting another OTP.`,
        });
      }

      const sendCount = await ctx.redis!.getOTPSendCount(email);
      if (sendCount >= OTP_LIMITS.MAX_SEND_ATTEMPTS_PER_HOUR) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: "Maximum OTP requests exceeded for this hour.",
        });
      }

      await sendVerificationOtp(email, registrationData.name);
      await ctx.redis!.setCooldown(email);
      await ctx.redis!.incrementOTPSendCount(email);

      return { message: "OTP resent successfully. Please check your email." };
    }),

  login: baseProcedure.input(LoginSchema).mutation(async ({ ctx, input }) => {
    const { email, password } = input;

    const userResult = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!userResult[0]) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Invalid email or password",
      });
    }

    const user = userResult[0];

    if (!user.is_verified) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Please verify your email before logging in",
      });
    }

    const isValidPassword = await verifyPassword(password, user.password_hash!);
    if (!isValidPassword) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Invalid email or password",
      });
    }

    const accessToken = generateAccessToken({ userId: user.id });
    const refreshToken = generateRefreshToken();

    await storeRefreshToken(user.id, refreshToken);

    ctx.resHeaders.set(
      "set-cookie",
      [
        `refreshToken=${refreshToken}`,
        "HttpOnly",
        "Secure",
        "SameSite=Strict",
        `Max-Age=${30 * 24 * 60 * 60}`,
        "Path=/",
      ].join("; ")
    );

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone_number: user.phone_number,
        profile_image_url: user.profile_image_url,
        is_verified: user.is_verified,
        created_at: user.createdAt?.toISOString(),
        updated_at: user.updated_at?.toISOString(),
      },
      accessToken,
    };
  }),

  forgotPassword: redisProcedure
    .input(ForgotPasswordSchema)
    .mutation(async ({ ctx, input }) => {
      const { email } = input;
      const userResult = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (!userResult[0]) {
        return {
          message:
            "If an account with that email exists, a reset link has been sent.",
        };
      }

      const user = userResult[0];

      // Generate and send password reset OTP
      const { sendPasswordResetOtp } = await import("@/utils/send-password-reset-otp");
      await sendPasswordResetOtp(email, user.name);

      return {
        message:
          "If an account with that email exists, a reset link has been sent.",
      };
    }),

  verifyForgetPasswordOTP: redisProcedure
    .input(VerifyOTPSchema)
    .mutation(async ({ ctx, input }) => {
      const { email, otp } = input;

      // Check if user exists
      const userResult = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (!userResult[0]) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No user found with this email",
        });
      }

      // Check fail count
      const failCount = await ctx.redis!.getAttempts(email, "password_reset");
      if (failCount >= 5) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message:
            "Too many incorrect attempts. Account locked for 15 minutes.",
        });
      }

      // Get stored OTP from Redis
      const storedOTP = await ctx.redis!.getPasswordResetOTP(email);
      if (!storedOTP) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "OTP expired or not found. Please request a new one.",
        });
      }

      // Verify OTP
      if (otp !== storedOTP) {
        const newFailCount = await ctx.redis!.incrementAttempts(
          email,
          "password_reset"
        );
        const remainingAttempts = 5 - newFailCount;

        if (remainingAttempts <= 0) {
          await ctx.redis!.setLock(email, 15, "password_reset");
          await ctx.redis!.cleanup(email, "password_reset");
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message:
              "Too many incorrect attempts. Account locked for 15 minutes.",
          });
        }

        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: `Incorrect OTP. ${remainingAttempts} attempts remaining.`,
        });
      }

      // Mark as verified
      await ctx.redis!.setPasswordResetVerified(email);

      return {
        message: "Password reset OTP verified successfully",
      };
    }),

  checkPasswordResetVerification: redisProcedure
    .input(z.object({ email: z.email() }))
    .query(async ({ ctx, input }) => {
      const { email } = input;

      // Check if password reset has been verified
      const isVerified = await ctx.redis!.checkPasswordResetVerified(email);

      return successResponse(
        { isVerified },
        "Password reset verification status retrieved"
      );
    }),

  resendPasswordResetOTP: redisProcedure
    .input(z.object({ email: z.email() }))
    .mutation(async ({ ctx, input }) => {
      const { email } = input;

      // Check if user exists
      const userResult = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (!userResult[0]) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No user found with this email",
        });
      }

      const user = userResult[0];

      if (await ctx.redis!.checkCooldown(email, "password_reset")) {
        const remaining = await ctx.redis!.getCooldownRemaining(email, "password_reset");
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: `Please wait ${remaining} seconds before requesting another OTP.`,
        });
      }

      const sendCount = await ctx.redis!.getAttempts(email, "password_reset");
      if (sendCount >= 2) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: "Maximum OTP requests exceeded. Please try again later.",
        });
      }

      // Send password reset OTP
      const { sendPasswordResetOtp } = await import("@/utils/send-password-reset-otp");
      await sendPasswordResetOtp(email, user.name);

      await ctx.redis!.setCooldown(email, "password_reset");
      await ctx.redis!.incrementAttempts(email, "password_reset");

      return { message: "Password reset OTP resent successfully. Please check your email." };
    }),

  resetPassword: redisProcedure
    .input(
      z.object({
        email: z.email(),
        newPassword: z
          .string()
          .min(8, "Password must be at least 8 characters")
          .regex(
            /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
            "Password must contain at least one lowercase letter, one uppercase letter, and one number"
          ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { email, newPassword } = input;

      // Check if password reset has been verified
      const isVerified = await ctx.redis!.checkPasswordResetVerified(email);
      if (!isVerified) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Password reset not verified. Please verify the OTP first.",
        });
      }

      // Get user by email
      const userResult = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (!userResult[0]) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      const user = userResult[0];

      // Update password
      await updatePassword(user.id, newPassword);
      await revokeRefreshTokens(user.id);

      // Clean up Redis data
      await ctx.redis!.cleanup(email, "password_reset");

      return { message: "Password reset successfully" };
    }),

  refreshToken: baseProcedure.mutation(async ({ ctx }) => {
    const cookies = ctx.req.headers.get("cookie") || "";
    const refreshTokenCookie = cookies
      .split(";")
      .find((c) => c.trim().startsWith("refreshToken="));

    if (!refreshTokenCookie) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "No refresh token",
      });
    }

    const refreshToken = refreshTokenCookie.split("=")[1];
    const tokenHash = await hashToken(refreshToken);

    const result = await db
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

    if (!result[0]) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Invalid refresh token",
      });
    }

    const tokenRecord = result[0];

    const userResult = await db
      .select()
      .from(users)
      .where(eq(users.id, tokenRecord.userId))
      .limit(1);

    if (!userResult[0]) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "User not found" });
    }

    const user = userResult[0];
    const newAccessToken = generateAccessToken({ userId: tokenRecord.userId });
    const newRefreshToken = generateRefreshToken();

    await revokeRefreshTokens(tokenRecord.userId, tokenRecord.familyId);
    await storeRefreshToken(
      tokenRecord.userId,
      newRefreshToken,
      tokenRecord.familyId
    );

    ctx.resHeaders.set(
      "set-cookie",
      [
        `refreshToken=${newRefreshToken}`,
        "HttpOnly",
        isProd ? "Secure" : "",
        "SameSite=Strict",
        `Max-Age=${30 * 24 * 60 * 60}`,
        "Path=/",
      ].join("; ")
    );

    return {
      accessToken: newAccessToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone_number: user.phone_number,
        profile_image_url: user.profile_image_url,
        is_verified: user.is_verified,
        created_at: user.createdAt?.toISOString(),
        updated_at: user.updated_at?.toISOString(),
      },
    };
  }),

  logout: baseProcedure.mutation(async ({ ctx }) => {
    const cookies = ctx.req.headers.get("cookie") || "";
    const refreshTokenCookie = cookies
      .split(";")
      .find((c) => c.trim().startsWith("refreshToken="));

    if (refreshTokenCookie) {
      const refreshToken = refreshTokenCookie.split("=")[1];
      const tokenHash = await hashToken(refreshToken);
      const result = await db
        .select()
        .from(refreshTokens)
        .where(eq(refreshTokens.tokenHash, tokenHash))
        .limit(1);

      if (result[0]) {
        await revokeRefreshTokens(result[0].userId, result[0].familyId);
      }
    }

    ctx.resHeaders.set(
      "set-cookie",
      [
        "refreshToken=",
        "HttpOnly",
        isProd ? "Secure" : "",
        "SameSite=Strict",
        "Max-Age=0",
        "Path=/",
      ].join("; ")
    );

    return { message: "Logged out successfully" };
  }),

  getMe: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.user?.id) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "User not found" });
    }

    const userResult = await db
      .select()
      .from(users)
      .where(eq(users.id, ctx.user.id))
      .limit(1);

    if (!userResult[0]) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "User not found" });
    }

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
  }),

  profile: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.user)
      throw new TRPCError({ code: "UNAUTHORIZED", message: "User not found" });
    return ctx.user;
  }),
});
