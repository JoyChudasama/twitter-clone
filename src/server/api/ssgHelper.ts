import { createServerSideHelpers } from "@trpc/react-query/server"
import { appRouter } from "./root"
import SuperJSON from "superjson"
import { createInnerTRPCContext } from "./trpc"

export function ssgHelper() {
    return createServerSideHelpers({
        router: appRouter,
        ctx: createInnerTRPCContext({ session: null }),
        transformer: SuperJSON
    });
}