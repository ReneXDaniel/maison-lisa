import { getUserFromRequest } from "@/lib/auth/session";
import { subscribe } from "@/lib/realtime/bus";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Server-Sent Events stream for the signed-in user. Each instance forwards
 * only events addressed to this user (or to admins, for Lisa). Payloads hold
 * identifiers; content is fetched through authorised endpoints.
 */
export async function GET(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return new Response("Unauthorized", { status: 401 });
  if (user.blocked) return new Response("Forbidden", { status: 403 });

  const encoder = new TextEncoder();
  let cleanup: (() => void) | null = null;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (chunk: string) => {
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          cleanup?.();
        }
      };
      send(`retry: 4000\n\n`);
      const unsubscribe = await subscribe({ userId: user.id, isAdmin: user.isAdmin }, (e) => {
        send(`event: rt\ndata: ${JSON.stringify({ type: e.type, data: e.data })}\n\n`);
      });
      const heartbeat = setInterval(() => send(`: ping\n\n`), 25_000);
      cleanup = () => {
        clearInterval(heartbeat);
        unsubscribe();
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      };
      req.signal.addEventListener("abort", () => cleanup?.());
    },
    cancel() {
      cleanup?.();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
