import { users, refreshTokens, passwordResetTokens } from "@/db/schema";
import { InferSelectModel } from "drizzle-orm";
import z from "zod";

export type Users = InferSelectModel<typeof users>;
export type RefreshToken = InferSelectModel<typeof refreshTokens>;
export type PasswordResetToken = InferSelectModel<typeof passwordResetTokens>;

export const UserRole = z.enum(["USER", "SELLER", "ADMIN"]);

/**
 * Register type schema
 */
export const RegisterSchema = z
  .object({
    name: z.string().min(3, "Name must be at least 3 characters"),
    email: z.email("Invalid email address"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        "Password must contain at least one lowercase letter, one uppercase letter, and one number"
      ),
    role: UserRole.default("USER"),
    phone_number: z.string().optional(),
    profile_image_url: z.string().optional(),
  })
  .refine(
    (data) => {
      // Phone number is required for sellers
      if (data.role === "SELLER" && !data.phone_number) {
        return false;
      }
      return true;
    },
    {
      message: "Phone number is required for sellers",
      path: ["phone_number"],
    }
  );

/**
 * Login type
 */

export const LoginSchema = z.object({
  email: z.email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

/**
 * Verify OTP type
 */

export const VerifyOTPSchema = z.object({
  email: z.email("Invalid email address"),
  otp: z.string().min(6, "OTP must be at least 6 characters"),
});

/**
 * Resend OTP type
 */

export const ResendOTPSchema = z.object({
  email: z.email("Invalid email address"),
});

/**
 * Forgot password schema
 */
export const ForgotPasswordSchema = z.object({
  email: z.email("Invalid email address"),
});

/**
 * Reset password schema
 */
export const ResetPasswordSchema = z.object({
  token: z.string().min(1, "Reset token is required"),
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      "Password must contain at least one lowercase letter, one uppercase letter, and one number"
    ),
});

/**
 * Authentication type definitions for the Next.js application
 * Provides comprehensive TypeScript support for auth-related data structures
 */

export interface User {
  id: string;
  name: string;
  email: string;
  role: "USER" | "SELLER" | "ADMIN" | null;
  phone_number: string | null;
  profile_image_url: string | null;
  is_verified: boolean;
  created_at?: string;
  updated_at: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  hydrated: boolean;
}

export interface AuthActions {
  setUser: (user: User | null) => void;
  clearUser: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  login: (user: User) => void;
  logout: () => void;
  updateProfile: (updates: Partial<User>) => void;
  setHydrated: (value: boolean) => void;
}

export interface AuthStore extends AuthState, AuthActions {
  isInitiallyGuest: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  role?: "USER" | "SELLER";
  phone_number?: string;
  profile_image_url?: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface AuthError {
  message: string;
  statusCode?: number;
  errorCode?: string;
  userFriendly?: boolean;
}

/**
 * Auth gate component props for controlling access to routes
 */
export interface AuthGateProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requireGuest?: boolean;
  redirectTo?: string;
  fallback?: React.ReactNode;
  className?: string;
}

/**
 * Auth hook return type for consistent API across components
 */
export interface UseAuthReturn {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

/**
 * Login hook return type for optimistic updates
 */
export interface UseLoginReturn {
  login: (credentials: LoginCredentials) => Promise<void>;
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
}

/**
 * Query keys for TanStack Query cache management
 */
export const AUTH_QUERY_KEYS = {
  me: ["auth", "me"] as const,
  profile: ["auth", "profile"] as const,
} as const;

/**
 * Storage keys for persistence
 */
export const AUTH_STORAGE_KEYS = {
  user: "hamsoya-auth-user",
  state: "hamsoya-auth-state",
} as const;

/**
 * Auth configuration constants
 * Optimized for persistent caching until actual user data changes
 */
export const AUTH_CONFIG = {
  staleTime: Infinity, // Never consider data stale - only invalidate on actual changes
  gcTime: 24 * 60 * 60 * 1000, // 24 hours - keep in background cache much longer
  retryAttempts: 1,
  redirectDelay: 0, // Instant redirects
  serverCacheDuration: 5 * 60 * 1000, // 5 minutes for server-side cache
  // Fallback stale time for non-critical queries
  fallbackStaleTime: 15 * 60 * 1000, // 15 minutes
} as const;

export type RegisterSchemaInput = z.infer<typeof RegisterSchema>;
export type LoginSchemaInput = z.infer<typeof LoginSchema>;
export type VerifyOTPSchemaInput = z.infer<typeof VerifyOTPSchema>;
export type ResendOTPSchemaInput = z.infer<typeof ResendOTPSchema>;
export type ForgotPasswordSchemaInput = z.infer<typeof ForgotPasswordSchema>;
export type ResetPasswordSchemaInput = z.infer<typeof ResetPasswordSchema>;
