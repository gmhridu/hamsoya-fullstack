import { useCallback, useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { jwtDecode } from "jwt-decode";
import { useTRPC } from "@/trpc/client";
import { userStore, useUserActions } from "@/store/use-user-store";
import type { User } from "@/features/auth/interface/auth.interface";

/**
 * Access token is stored ONLY in memory for security
 * (never persisted to localStorage/sessionStorage)
 */
interface JWT {
  exp: number; // expiry in seconds
}

let accessToken: string | null = null;

export const getAccessToken = () => accessToken;
export const setAccessToken = (token: string | null) => {
  accessToken = token;
};

export const useLogin = () => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { login, setError } = useUserActions();

  return useMutation(
    trpc.auth.login.mutationOptions({
      onMutate: () => {
        setError(null);
      },
      onSuccess: (data) => {
        setAccessToken(data.accessToken);
        login(data.user);
        queryClient.invalidateQueries();
      },

      onError: (error: any) => {
        setError(error.message ?? "Invalid email or password");
      },
    })
  );
};

export const useLogout = () => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { logout } = useUserActions();

  return useMutation(
    trpc.auth.logout.mutationOptions({
      onSuccess: () => {
        setAccessToken(null);
        logout();
        queryClient.clear();
      },
    })
  );
};

export const useRefreshToken = () => {
  const trpc = useTRPC();

  return useMutation(
    trpc.auth.refreshToken.mutationOptions({
      onSuccess: (data) => {
        setAccessToken(data.accessToken);
        userStore.setUser(data.user);
      },

      onError: () => {
        // Don't clear user on silent refresh failure
        // This preserves Zustand persistence
        setAccessToken(null);
      },
    })
  );
};

export const useGetMe = () => {
  const trpc = useTRPC();
  const { setUser } = useUserActions();

  const query = useQuery({
    ...trpc.auth.getMe.queryOptions(),
    staleTime: 5 * 60 * 1000,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });

  const { data } = query;

  useEffect(() => {
    if (data) {
      setUser(data);
    }
  }, [data, setUser]);

  // useEffect(() => {
  //   if (isError) {
  //     clearUser();
  //     setAccessToken(null);
  //   }
  // }, [isError, clearUser]);

  return query;
};

export const useForgotPassword = () => {
  const trpc = useTRPC();
  const { setError } = useUserActions();

  return useMutation(
    trpc.auth.forgotPassword.mutationOptions({
      onMutate: () => {
        setError(null);
      },
      onError: (error: any) => {
        setError(error.message ?? "Unable to send reset email");
      },
    })
  );
};

export const useResetPassword = () => {
  const trpc = useTRPC();
  const { setError } = useUserActions();

  return useMutation(
    trpc.auth.resetPassword.mutationOptions({
      onMutate: () => {
        setError(null);
      },
      onError: (error: any) => {
        setError(error.message ?? "Password reset failed");
      },
    })
  );
};

export const useRegisterUser = () => {
  const trpc = useTRPC();
  const { setError } = useUserActions();

  return useMutation(
    trpc.auth.register.mutationOptions({
      onMutate: () => {
        setError(null);
      },
      onError: (error: any) => {
        setError(error.message ?? "Registration failed");
      },
    })
  );
};

export const useVerifyOTP = () => {
  const trpc = useTRPC();
  const { setError } = useUserActions();

  return useMutation(
    trpc.auth.verifyOTP.mutationOptions({
      onMutate: () => {
        setError(null);
      },
      onError: (error: any) => {
        setError(error.message ?? "OTP verification failed");
      },
    })
  );
};

export const useVerifyForgetPasswordOTP = () => {
  const trpc = useTRPC();
  const { setError } = useUserActions();

  return useMutation(
    trpc.auth.verifyForgetPasswordOTP.mutationOptions({
      onMutate: () => {
        setError(null);
      },
      onError: (error: any) => {
        setError(error.message ?? "Password reset OTP verification failed");
      },
    })
  );
};

export const useCheckPasswordResetVerification = (email: string) => {
  const trpc = useTRPC();

  return useQuery({
    ...trpc.auth.checkPasswordResetVerification.queryOptions({ email }),
    enabled: !!email,
  });
};

export const useResendPasswordResetOTP = () => {
  const trpc = useTRPC();
  const { setError } = useUserActions();

  return useMutation(
    trpc.auth.resendPasswordResetOTP.mutationOptions({
      onMutate: () => {
        setError(null);
      },
      onError: (error: any) => {
        setError(error.message ?? "Resend password reset OTP failed");
      },
    })
  );
};

export const useResendOTP = () => {
  const trpc = useTRPC();
  const { setError } = useUserActions();

  return useMutation(
    trpc.auth.resendOTP.mutationOptions({
      onMutate: () => {
        setError(null);
      },
      onError: (error: any) => {
        setError(error.message ?? "Resend OTP failed");
      },
    })
  );
};

export const useCooldownStatus = (
  email: string,
  options?: { enabled?: boolean }
) => {
  const trpc = useTRPC();

  return useQuery({
    ...trpc.auth.getOTPCooldownStatus.queryOptions({ email }),
    ...options,
  });
};

export const usePasswordResetCooldownStatus = (
  email: string,
  options?: { enabled?: boolean }
) => {
  const trpc = useTRPC();

  return useQuery({
    ...trpc.auth.getPasswordResetCooldownStatus.queryOptions({ email }),
    ...options,
  });
};

export const useAuth = () => {
  const queryClient = useQueryClient();

  const login = useLogin();
  const logout = useLogout();
  const refresh = useRefreshToken();
  const getMe = useGetMe();
  const forgotPassword = useForgotPassword();
  const resetPassword = useResetPassword();
  const register = useRegisterUser();
  const verifyOTP = useVerifyOTP();
  const resendOTP = useResendOTP();
  const verifyForgetPasswordOTP = useVerifyForgetPasswordOTP();
  const resendPasswordResetOTP = useResendPasswordResetOTP();
  const cooldownStatus = useCooldownStatus(
    userStore.getState().user?.email || ""
  );

  const clearError = useCallback(() => {
    userStore.clearError();
  }, []);

  /**
   * Silent refresh using setTimeout
   */

  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const scheduleTokenRefresh = useCallback(() => {
    const token = getAccessToken();
    if (!token) return;

    try {
      const decoded: JWT = jwtDecode(token);
      const now = Math.floor(Date.now() / 1000);
      const expiresIn = decoded.exp - now;

      // Refresh 60 seconds before expiry
      const refreshInMs = (expiresIn - 60) * 1000;

      if (refreshInMs <= 0) {
        // If token already near expiry, refresh immediately
        refresh
          .mutateAsync()
          .then(() => {
            queryClient.invalidateQueries({ queryKey: ["auth.getMe"] });
            scheduleTokenRefresh(); // schedule next refresh
          })
          .catch(() => {
            // Don't clear user on silent refresh failure
            // This preserves Zustand persistence
            setAccessToken(null);
          });
      } else {
        // Schedule a refresh in the future
        if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);

        refreshTimeoutRef.current = setTimeout(async () => {
          try {
            await refresh.mutateAsync();
            queryClient.invalidateQueries({ queryKey: ["auth.getMe"] });
            scheduleTokenRefresh(); // schedule next refresh
          } catch {
            // Don't clear user on silent refresh failure
            // This preserves Zustand persistence
            setAccessToken(null);
          }
        }, refreshInMs);
      }
    } catch {
      // Invalid token, clear
      setAccessToken(null);
      userStore.clearUser();
    }
  }, [refresh, queryClient]);

  // Initialize silent refresh when accessToken changes
  useEffect(() => {
    if (getAccessToken()) {
      scheduleTokenRefresh();
    }

    return () => {
      if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);
    };
  }, [scheduleTokenRefresh]);

  // Invalidate getMe on login
  useEffect(() => {
    if (login.isSuccess) {
      queryClient.invalidateQueries({ queryKey: ["auth.getMe"] });
      scheduleTokenRefresh();
    }
  }, [login.isSuccess, queryClient, scheduleTokenRefresh]);

  return {
    login,
    logout,
    refresh,
    getMe,
    forgotPassword,
    resetPassword,
    register,
    verifyOTP,
    resendOTP,
    verifyForgetPasswordOTP,
    resendPasswordResetOTP,
    cooldownStatus,
    clearError,
  };
};
