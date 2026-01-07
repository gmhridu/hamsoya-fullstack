import { createTRPCRouter } from "@/trpc/init";
import { authRouters } from "@/features/auth/server/router";

export const appRouter = createTRPCRouter({
  auth: authRouters
});

// export type definition of API
export type AppRouter = typeof appRouter;
