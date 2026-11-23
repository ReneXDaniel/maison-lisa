"use server";
import { and, count, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { lookPollOptions, lookPolls, lookVotes } from "@/db/schema";
import { requireAction, run, ActionError } from "@/lib/auth/guards";
import { rateLimit, LIMITS } from "@/lib/rate-limit";

export async function pollResults(pollId: string) {
  const rows = await db.select({ optionId: lookVotes.optionId, n: count() }).from(lookVotes).where(eq(lookVotes.pollId, pollId)).groupBy(lookVotes.optionId);
  return Object.fromEntries(rows.map((r) => [r.optionId, Number(r.n)]));
}

/**
 * One vote per verified customer per poll (enforced by a unique index);
 * voting again changes the existing vote instead of adding another.
 */
export async function voteAction(pollId: string, optionId: string) {
  return run(async () => {
    const user = await requireAction("adult");
    if (!(await rateLimit(`vote:${user.id}`, LIMITS.vote.limit, LIMITS.vote.window))) throw new ActionError("rate_limited");
    const pid = z.uuid().parse(pollId);
    const oid = z.uuid().parse(optionId);
    const [poll] = await db.select().from(lookPolls).where(eq(lookPolls.id, pid));
    if (!poll || !poll.active || (poll.endsAt && poll.endsAt < new Date())) throw new ActionError("vote_closed");
    const [opt] = await db.select().from(lookPollOptions).where(and(eq(lookPollOptions.id, oid), eq(lookPollOptions.pollId, pid)));
    if (!opt) throw new ActionError("not_found");
    await db
      .insert(lookVotes)
      .values({ pollId: pid, optionId: oid, userId: user.id })
      .onConflictDoUpdate({ target: [lookVotes.pollId, lookVotes.userId], set: { optionId: oid, updatedAt: new Date() } });
    return { results: await pollResults(pid), mine: oid };
  });
}
