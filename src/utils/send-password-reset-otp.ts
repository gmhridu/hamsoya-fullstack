import { generateOTP } from "@/lib/crypto";
import { RedisService } from "@/lib/redis";
import { sendPasswordResetEmail } from "@/lib/sendEmail";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export const sendPasswordResetOtp = async (
  email: string,
  name?: string
): Promise<{ message: string }> => {
  const redis = new RedisService();
  const userResult = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  const user = userResult.length > 0 ? userResult[0] : null;

  if (!user) {
    throw new Error("No user found for this email");
  }

  // Check rate limiting
  await checkPasswordResetRateLimit(email);

  // Generate OTP
  const otp = generateOTP();

  // Store OTP in Redis
  await redis.setPasswordResetOTP(email, otp);
  await redis.setCooldown(email, "password_reset");

  // Use name from existing user
  const userName = name || user?.name || "User";

  // Send email using Resend
  try {
    await sendPasswordResetEmail(email, userName, otp);
  } catch (error) {
    console.error("Failed to send password reset email:", error);
    throw new Error(
      "Failed to send password reset email. Please check your Resend API key configuration."
    );
  }
  return { message: "Password reset OTP sent to your email" };
};

export const checkPasswordResetRateLimit = async (email: string) => {
  const redis = new RedisService();

  // Check cooldown
  const inCooldown = await redis.checkCooldown(email, "password_reset");

  if (inCooldown) {
    throw new Error("Please wait 60 seconds before requesting another OTP");
  }

  // Check hourly limit
  const attempts = await redis.getAttempts(email, "password_reset");

  if (attempts >= 2) {
    await redis.setLock(email, 60, "password_reset"); // Lock for 1 hour
    throw new Error("Too many OTP requests. Please try again in 1 hour.");
  }

  // Check if locked
  const isLocked = await redis.checkLock(email, "password_reset");
  if (isLocked) {
    throw new Error("Account is temporarily locked. Please try again later.");
  }

  // Increment attempts
  await redis.incrementAttempts(email, "password_reset");
};
