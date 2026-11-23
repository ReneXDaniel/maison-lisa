/** Maps a notification to the page where the reader can act on it. */
export function notificationHref(type: string, data: Record<string, string | number | null>): string {
  const conv = data.conversationId ? String(data.conversationId) : null;
  switch (type) {
    case "message_from_lisa":
    case "offer_received":
      return conv ? `/messages/${conv}` : "/messages";
    case "request_update":
      return "/account/requests";
    case "order_paid":
    case "refund_update":
      return data.orderId ? `/account/orders/${data.orderId}` : "/account/orders";
    case "product_available":
      return "/account/purchases";
    case "admin_new_message":
    case "admin_offer_response":
      return conv ? `/admin/messages/${conv}` : "/admin/messages";
    case "admin_new_request":
      return "/admin/requests";
    case "admin_new_order":
    case "admin_payment_issue":
      return data.orderId ? `/admin/orders/${data.orderId}` : "/admin/orders";
    default:
      return "/account";
  }
}
