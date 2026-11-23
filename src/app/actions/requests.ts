"use server";
import { getLocale } from "next-intl/server";
import { z } from "zod";
import { db } from "@/db";
import { customRequests } from "@/db/schema";
import { requireAction, run, ActionError } from "@/lib/auth/guards";
import { latestOrNewConversation, postMessage } from "@/lib/chat";
import { sanitizeSelections } from "@/lib/catalog-options";
import { notifyAdmins } from "@/lib/notifications";
import { rateLimit, LIMITS } from "@/lib/rate-limit";
import { sendMail, absoluteUrl } from "@/lib/mail";
import { serverTranslator } from "@/lib/i18n-server";
import { env } from "@/lib/env";
import { brand } from "@/config/brand";

/**
 * "Send My Request to Lisa": validates the verified customer, saves the
 * request, creates or reuses the private conversation, inserts the request
 * card into it and notifies Lisa. Returns the conversation to open.
 */
export async function submitRequestAction(input: { selections: unknown; notes: string }) {
  return run(async () => {
    const user = await requireAction("adult");
    if (user.isAdmin) throw new ActionError("forbidden");
    if (!(await rateLimit(`request:${user.id}`, LIMITS.request.limit, LIMITS.request.window))) throw new ActionError("rate_limited");
    const selections = sanitizeSelections(input.selections);
    const notes = z.string().max(2000).parse(input.notes ?? "").trim();
    if (!Object.keys(selections).length && !notes) throw new ActionError("invalid");

    const locale = await getLocale();
    const t = await serverTranslator(locale, "requests");
    const conversation = await latestOrNewConversation(user, t("metaTitle"));
    const [request] = await db
      .insert(customRequests)
      .values({ customerId: user.id, conversationId: conversation.id, status: "submitted", selections, notes: notes || null })
      .returning();
    // The greeting is stored in the customer's own language — conversations are never auto-translated.
    await postMessage(user, conversation, { kind: "request", body: t("greeting", { creator: brand.creatorName }), requestId: request!.id });
    await notifyAdmins("admin_new_request", { number: request!.number, conversationId: conversation.id, requestId: request!.id });
    const to = env().ADMIN_NOTIFY_EMAIL;
    if (to) await sendMail(to, "adminNewRequest", "de", { number: request!.number, customer: user.displayName }, absoluteUrl(`/de/admin/messages/${conversation.id}`));
    return { conversationId: conversation.id, number: request!.number };
  });
}
