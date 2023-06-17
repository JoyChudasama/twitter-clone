import { Prisma } from "@prisma/client";
import { inferAsyncReturnType } from "@trpc/server";
import { z } from "zod";
import {
  createTRPCRouter,
  publicProcedure,
  protectedProcedure,
  createTRPCContext,
} from "~/server/api/trpc";

export const tweetRouter = createTRPCRouter({
  infiniteFeed: publicProcedure
    .input(
      z.object({
        limit: z.number().optional(),
        cursor: z.object({ id: z.string(), createdAt: z.date() }).optional(),
        onlyFollowing: z.boolean().optional()
      })
    ).query(async ({ input: { limit = 10, cursor, onlyFollowing = false }, ctx }) => {

      const currentUserId = ctx.session?.user.id;

      return await getInfiniteTweets({
        limit,
        ctx,
        cursor,
        whereClause:
          currentUserId == null || !onlyFollowing
            ? undefined
            : {
              user: {
                followers: { some: { id: currentUserId } },
              },
            },
      })
    }),

  create: protectedProcedure
    .input(z.object({ content: z.string() }))
    .mutation(async ({ input: { content }, ctx }) => {
      return await ctx.prisma.tweet.create({
        data: { content, userId: ctx.session.user.id },
      })
    }),

  toggleLike: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(
      async ({ input: { id }, ctx }) => {
        const data = { tweetId: id, userId: ctx.session.user.id }
        const existingLike = await ctx.prisma.like.findUnique({
          where: { userId_tweetId: data }
        })

        if (existingLike == null) {
          await ctx.prisma.like.create({ data });
          return { addedLike: true };
        } else {
          await ctx.prisma.like.delete({ where: { userId_tweetId: data } });
          return { addedLike: false };
        }
      }),


});


type getInfiniteTweetsType = {
  whereClause?: Prisma.TweetWhereInput;
  limit: number;
  cursor: { id: string; createdAt: Date } | undefined;
  ctx: inferAsyncReturnType<typeof createTRPCContext>;
}

async function getInfiniteTweets({ whereClause, ctx, limit, cursor }: getInfiniteTweetsType) {
  const currentUserId = ctx.session?.user.id;

  const tweets = await ctx.prisma.tweet.findMany({
    take: limit + 1,
    cursor: cursor ? { createdAt_id: cursor } : undefined,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    where: whereClause,
    select: {
      id: true,
      content: true,
      createdAt: true,
      _count: { select: { likes: true } },
      user: { select: { name: true, id: true, image: true } },
      likes: currentUserId == null ? false : { where: { userId: currentUserId } }
    }
  })

  let nextCursor: typeof cursor | undefined;

  if (tweets.length > limit) {
    const nextItem = tweets.pop();
    if (nextItem != null) {
      nextCursor = { id: nextItem.id, createdAt: nextItem.createdAt }
    }
  }

  return {
    tweets: tweets.map(tweet => {
      return {
        id: tweet.id,
        content: tweet.content,
        createdAt: tweet.createdAt,
        likeCount: tweet._count.likes,
        user: tweet.user,
        likedByMe: tweet.likes?.length > 0,
      }
    }), nextCursor
  };
}