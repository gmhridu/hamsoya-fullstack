import { generateOTP } from "@/lib/crypto";
import { RedisService } from "@/lib/redis";
import { sendOTPVerificationEmail } from "@/lib/sendEmail";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export const sendVerificationOtp = async (
  email: string,
  name?: string
): Promise<{ message: string }> => {
  const redis = new RedisService();
  const registrationData = await redis.getRegistrationData(email);
  const userResult = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  const user = userResult.length > 0 ? userResult[0] : null;

  if (!registrationData && !user) {
    throw new Error("No registration data or user found for this email");
  }

  if (user && user.is_verified) {
    throw new Error("User is already verified");
  }

  //  check rate limiting
  await checkOTPRateLimit(email);

  // generate OTP
  const otp = generateOTP();

  // Store OTP in Redis
  await redis.setOTP(email, otp);
  await redis.setCooldown(email);

  // Use name from registration data or existing user
  const userName = name || registrationData?.name || user?.name || "User";

  // Send email using Resend (no SMTP fallback)
  try {
    await sendOTPVerificationEmail(email, userName, otp);
  } catch (error) {
    console.error("Failed to send OTP verification email:", error);
    throw new Error(
      "Failed to send verification email. Please check your Resend API key configuration."
    );
  }
  return { message: "Verification OTP sent to your email" };
};

export const checkOTPRateLimit = async (
  email: string,
  type: "otp" | "password_reset" = "otp"
) => {
  const redis = new RedisService();
  // Check cooldown
  const inCooldown = await new RedisService().checkCooldown(email, type);

  if (inCooldown) {
    throw new Error("Please wait 60 seconds before requesting another OTP");
  }

  // check hourly limit
  const attempts = await redis.getAttempts(email, type);

  if (attempts >= 2) {
    await redis.setLock(email, 60, type); // Lock for 1 hour
    throw new Error("Too many OTP requests. Please try again in 1 hour.");
  }

  // check if locked
  const isLocked = await redis.checkLock(email, type);
  if (isLocked) {
    throw new Error("Account is temporarily locked. Please try again later.");
  }

  // Increment attempts
  await redis.incrementAttempts(email, type);
};
