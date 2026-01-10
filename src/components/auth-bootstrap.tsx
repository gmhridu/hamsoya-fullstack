"use client";

import { useEffect, useRef } from "react";
import { setAccessToken, useAuth } from "@/features/auth/hooks/use-auth";

export const AuthBootstrap = () => {
  const { refresh } = useAuth();
  const hasBootstrapped = useRef(false);

  useEffect(() => {
    if (hasBootstrapped.current) return;
    hasBootstrapped.current = true;

    refresh.mutate(undefined, {
      onError: () => {
        // Don't clear user on silent refresh failure
        // This preserves Zustand persistence
        setAccessToken(null);
      },
    });
  }, [refresh]);

  return null;
};
