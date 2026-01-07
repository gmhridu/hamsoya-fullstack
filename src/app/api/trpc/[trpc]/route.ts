import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { createTRPCContext } from "@/trpc/init";
import { appRouter } from "@/trpc/routers/_app";

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () => createTRPCContext({ req }),
    responseMeta: ({ ctx, paths, type, errors }) => {
      if (!ctx?.resHeaders) return {};
      return {
        headers: Object.fromEntries(ctx.resHeaders.entries()),
      };
    },
  });
export { handler as GET, handler as POST };
