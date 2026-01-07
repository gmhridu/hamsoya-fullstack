import { baseProcedure, createTRPCRouter, redisProcedure, protectedProcedure } from "@/trpc/init";
import {
  RegisterSchema,
  VerifyOTPSchema,
  ResendOTPSchema,
  LoginSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
} from "@/features/auth/interface/auth.interface";
import z from "zod";
import { db } from "@/db";
import { users, refreshTokens, passwordResetTokens } from "@/db/schema";
import { eq, and, gt } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { hashPassword } from "@/lib/crypto";
import {
  verifyPassword,
  generateToken,
  hashToken,
  generateAccessToken,
  generateRefreshToken,
  storeRefreshToken,
  revokeRefreshTokens,
  storePasswordResetToken,
  updatePassword,
} from "@/utils/auth-utils";
import { sendVerificationOtp } from "@/utils/send-verification-otp";
import { successResponse } from "@/utils/response-builder";
import { OTP_LIMITS } from "@/lib/redis";

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

      // Hash the password
      const passwordHash = await hashPassword(password);

      // Store registration data in Redis temporary (instead of creating user immediately)
      const registrationData = {
        name,
        email,
        password: passwordHash,
        role,
        phone_number,
        profile_image_url,
      };

      // Store registration data in Redis with 30 min expiry
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

      // check if account is locked due too many failed attempts
      const failCount = await ctx.redis!.getOTPFailCount(email);

      if (failCount >= 5) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message:
            "Too many incorrect attempts. Account locked for 15 minutes.",
        });
      }

      // Get stored OTP
      const storedOTP = await ctx.redis.getOTP(email);

      if (!storedOTP) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "OTP expired or not found. Please request a new one.",
        });
      }

      // verify OTP using consistent attempt counting
      if (otp !== storedOTP) {
        // Increment failure count using the enhanced system
        const newFailCount = await ctx.redis!.incrementOTPFailCount(email);
        const remainingAttempts = 5 - newFailCount;

        if (remainingAttempts <= 0) {
          // Lock the account
          await ctx.redis.setLock(email, 15); // 15 minutes lock
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

      // Get registration data from Redis
      const registrationData = await ctx.redis!.getRegistrationData(email);
      if (!registrationData) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Registration data expired. Please register again.",
        });
      }

      // Check if user already exists (in case of race condition)
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

      // Create user with verified status

      await db
        .insert(users)
        .values({
          ...registrationData,
          is_verified: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      // Cleanup Redis
      await ctx.redis!.cleanup(email);
      await ctx.redis!.deleteRegistrationData(email);

      return {
        message: "Email verified successfully. Account created!",
      };
    }),
  getOTPCooldownStatus: redisProcedure
    .input(z.object({ email: z.string() }))
    .query(async ({ ctx, input }) => {
      const cooldownRemaining = await ctx.redis!.getCooldownRemaining(input.email);
      const canResend = cooldownRemaining === 0;
      return successResponse({ cooldownRemaining, canResend }, "Cooldown status retrieved");
    }),
  resendOTP: redisProcedure
    .input(ResendOTPSchema)
    .mutation(async ({ ctx, input }) => {
      const { email } = input;

      // Check if registration data exists
      const registrationData = await ctx.redis!.getRegistrationData(email);
      if (!registrationData) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No pending registration found for this email.",
        });
      }

      // Check cooldown
      const isOnCooldown = await ctx.redis!.checkCooldown(email);
      if (isOnCooldown) {
        const remaining = await ctx.redis!.getCooldownRemaining(email);
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: `Please wait ${remaining} seconds before requesting another OTP.`,
        });
      }

      // Check send count
      const sendCount = await ctx.redis!.getOTPSendCount(email);
      if (sendCount >= OTP_LIMITS.MAX_SEND_ATTEMPTS_PER_HOUR) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: "Maximum OTP requests exceeded for this hour.",
        });
      }

      // Send OTP
      await sendVerificationOtp(email, registrationData.name);

      // Set cooldown
      await ctx.redis!.setCooldown(email);

      // Increment send count
      await ctx.redis!.incrementOTPSendCount(email);

      return {
        message: "OTP resent successfully. Please check your email.",
      };
    }),
  login: baseProcedure
    .input(LoginSchema)
    .mutation(async ({ ctx, input }) => {
      const { email, password } = input;

      const userResult = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (userResult.length === 0) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid email or password",
        });
      }

      const user = userResult[0];

      if (!user.password_hash) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid email or password",
        });
      }

      const isValidPassword = await verifyPassword(password, user.password_hash);
      if (!isValidPassword) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid email or password",
        });
      }

      // Generate tokens
      const accessToken = generateAccessToken({ userId: user.id });
      const refreshToken = generateRefreshToken();

      // Store refresh token
      await storeRefreshToken(user.id, refreshToken);

      // Set refresh token in httpOnly cookie
      const cookieOptions = [
        `refreshToken=${refreshToken}`,
        "httpOnly",
        "secure",
        "sameSite=strict",
        `maxAge=${7 * 24 * 60 * 60}`, // 7 days
        "path=/",
      ].join("; ");
      ctx.resHeaders.set("set-cookie", cookieOptions);

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
  forgotPassword: baseProcedure
    .input(ForgotPasswordSchema)
    .mutation(async ({ input }) => {
      const { email } = input;

      const userResult = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (userResult.length === 0) {
        // Return success to prevent user enumeration
        return { message: "If an account with that email exists, a reset link has been sent." };
      }

      const user = userResult[0];
      const resetToken = generateToken();

      await storePasswordResetToken(user.id, resetToken);

      // Send email (implement sendResetEmail)
      // await sendResetEmail(email, resetToken);

      return { message: "If an account with that email exists, a reset link has been sent." };
    }),
  resetPassword: baseProcedure
    .input(ResetPasswordSchema)
    .mutation(async ({ input }) => {
      const { token, newPassword } = input;

      const tokenHash = await hashToken(token);
      const result = await db
        .select()
        .from(passwordResetTokens)
        .where(
          and(
            eq(passwordResetTokens.tokenHash, tokenHash),
            eq(passwordResetTokens.used, false),
            gt(passwordResetTokens.expiresAt, new Date())
          )
        )
        .limit(1);

      if (result.length === 0) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid or expired reset token",
        });
      }

      const resetRecord = result[0];

      // Mark as used
      await db
        .update(passwordResetTokens)
        .set({ used: true })
        .where(eq(passwordResetTokens.id, resetRecord.id));

      // Update password
      await updatePassword(resetRecord.userId, newPassword);

      // Revoke all refresh tokens for security
      await revokeRefreshTokens(resetRecord.userId);

      return { message: "Password reset successfully" };
    }),
  refreshToken: baseProcedure.mutation(async ({ ctx }) => {
    // Get refresh token from cookie
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

    // Find the token in DB
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

    if (result.length === 0) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Invalid refresh token",
      });
    }

    const tokenRecord = result[0];

    // Fetch user data
    const userResult = await db
      .select()
      .from(users)
      .where(eq(users.id, tokenRecord.userId))
      .limit(1);

    if (userResult.length === 0) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "User not found",
      });
    }

    const user = userResult[0];

    // Generate new tokens
    const newAccessToken = generateAccessToken({ userId: tokenRecord.userId });
    const newRefreshToken = generateRefreshToken();

    // Revoke old family
    await revokeRefreshTokens(tokenRecord.userId, tokenRecord.familyId);

    // Store new refresh token
    await storeRefreshToken(tokenRecord.userId, newRefreshToken, tokenRecord.familyId);

    // Set new cookie
    const cookieOptions = [
      `refreshToken=${newRefreshToken}`,
      "httpOnly",
      "secure",
      "sameSite=strict",
      `maxAge=${7 * 24 * 60 * 60}`,
      "path=/",
    ].join("; ");
    ctx.resHeaders.set("set-cookie", cookieOptions);

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
    // Get refresh token from cookie
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

      if (result.length > 0) {
        // Revoke family
        await revokeRefreshTokens(result[0].userId, result[0].familyId);
      }
    }

    // Clear cookie
    const clearCookie = [
      "refreshToken=",
      "httpOnly",
      "secure",
      "sameSite=strict",
      "maxAge=0",
      "path=/",
    ].join("; ");
    ctx.resHeaders.set("set-cookie", clearCookie);

    return { message: "Logged out successfully" };
  }),
  getMe: protectedProcedure.query(async ({ ctx }) => {
  return ctx.user!;
}),
  profile: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.user) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "User not found",
      });
    }
    return ctx.user;
  }),
});
