import bcrypt from "bcrypt";
import { randomBytes, timingSafeEqual } from "crypto";
import crypto from "crypto-js";


export const generateOTP = (): string => {
  const buffer = randomBytes(4);

  const randomNumber = buffer.readUint32BE(0);

  // Ensure 6-digit OTP (100000-999999)
  const otp = (randomNumber % 900000) + 100000;
  return otp.toString();
};

const SALT_ROUNDS = 12;

// hash password
export const hashPassword = async (password: string): Promise<string> => {
  return await bcrypt.hash(password, SALT_ROUNDS);
};

// Verify password
export const verifyPassword = async (
  password: string,
  hash: string
): Promise<boolean> => {
  return await bcrypt.compare(password, hash);
};

// Constant-time OTP comparison to prevent timing attacks
export const verifyOTPSecure = (
  inputOTP: string,
  storedOTP: string
): boolean => {
  if (!inputOTP || !storedOTP || inputOTP.length !== storedOTP.length) {
    return false;
  }

  // Convert strings to buffers for constant-time comparison
  const inputBuffer = Buffer.from(inputOTP, "utf8");
  const storedBuffer = Buffer.from(storedOTP, "utf8");

  return timingSafeEqual(inputBuffer, storedBuffer);
};

// Generate secure random token
export const generateSecureToken = (length: number = 32): string => {
  return crypto.lib.WordArray.random(length).toString();
};

// Hash token for storage
export const hashToken = (token: string): string => {
  return crypto.SHA256(token).toString();
};

// Generate refresh token
export const generateRefreshTokenString = (): string => {
  return generateSecureToken(64);
};

// Validate OTP format
export const isValidOTP = (otp: string): boolean => {
  return /^\d{6}$/.test(otp);
};

// Generate password reset token
export const generatePasswordResetToken = (): string => {
  return generateSecureToken(48);
};

// Generate email verification token
export const generateEmailVerificationToken = (): string => {
  return generateSecureToken(48);
};
