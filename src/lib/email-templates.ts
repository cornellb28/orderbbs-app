import type { OrderSummary } from "@/lib/orders";

function getSiteUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}


export function orderConfirmationHtml(order: OrderSummary) {
  const receiptUrl = `${getSiteUrl()}/order/${order.id}?t=${order.public_token}`;

  const itemsHtml = order.items
    .map(
      (it) =>
        `<li style="margin:6px 0;">
          <strong>${it.qty}×</strong> ${escapeHtml(it.product.name)}
          — $${(it.line_total_cents / 100).toFixed(2)}
        </li>`
    )
    .join("");

  return `
  <div style="font-family: ui-sans-serif, system-ui, -apple-system; line-height:1.5;">
    <h2 style="margin:0 0 10px;">Order Confirmed ✅</h2>
    <p style="margin:0 0 14px; color:#444;">
      Order ID: <strong>${order.id}</strong>
    </p>

    <div style="padding:12px 14px; border:1px solid #eee; border-radius:10px; margin:14px 0;">
      <h3 style="margin:0 0 8px;">Pickup Details</h3>
      <p style="margin:0; color:#333;">
        <strong>${escapeHtml(order.event.title)}</strong><br/>
        ${order.event.pickup_date} · ${order.event.pickup_start}–${order.event.pickup_end}<br/>
        ${escapeHtml(order.event.location_name)}<br/>
        <span style="color:#666;">${escapeHtml(order.event.location_address)}</span>
      </p>
    </div>

    <h3 style="margin:18px 0 8px;">Items</h3>
    <ul style="padding-left:18px; margin:0 0 12px;">
      ${itemsHtml}
    </ul>

    <p style="margin:0; font-weight:700;">
      Total: $${(order.total_cents / 100).toFixed(2)}
    </p>
    <a href="${receiptUrl}"
   style="display:inline-block;margin-top:14px;padding:10px 14px;border-radius:10px;
          background:#111;color:#fff;text-decoration:none;font-weight:700;">
  View Receipt
</a>


    <p style="margin:18px 0 0; color:#666; font-size:14px;">
      Thanks for supporting Bowl & Broth Society. See you at pickup!
    </p>
  </div>
  `;
}

function escapeHtml(str: string) {
  return str
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
