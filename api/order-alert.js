// New-order email alert.
// Called by a Supabase Database Webhook on INSERT into public.orders.
// Env (Vercel project settings, never in code):
//   RESEND_API_KEY      Resend key for the deeday.ng domain
//   ORDER_ALERT_SECRET  shared secret, sent by the webhook as the x-webhook-secret header
import { timingSafeEqual } from "node:crypto";

const TO = "nwanicyriluchenna@gmail.com";
const FROM = "deeday.ng orders <orders@deeday.ng>";

function same(a, b) {
  const x = Buffer.from(String(a || "")), y = Buffer.from(String(b || ""));
  return x.length === y.length && x.length > 0 && timingSafeEqual(x, y);
}
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function waLink(phone) {
  let d = String(phone || "").replace(/\D/g, "");
  if (d.startsWith("0")) d = "234" + d.slice(1);
  return d.length >= 10 ? `https://wa.me/${d}` : null;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ ok: false });
  const secret = process.env.ORDER_ALERT_SECRET;
  if (!secret || !same(req.headers["x-webhook-secret"], secret)) return res.status(401).json({ ok: false });
  if (!process.env.RESEND_API_KEY) return res.status(500).json({ ok: false, error: "missing RESEND_API_KEY" });

  const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
  if (body.type !== "INSERT" || body.table !== "orders" || !body.record) return res.status(200).json({ ok: true, skipped: true });
  const o = body.record;

  const couple = [o.bride, o.groom].filter(Boolean).join(" & ") || "New couple";
  const wa = waLink(o.client_phone);
  const firstName = String(o.client_name || "the client").trim().split(/\s+/)[0].slice(0, 20);
  const ref = String(o.id || "").slice(0, 8).toUpperCase();
  const fmtDate = (d) => { const x = new Date(d + "T12:00:00Z"); return isNaN(x) ? d : x.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Lagos" }); };
  const received = o.created_at ? new Date(o.created_at).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Africa/Lagos" }) + " WAT" : "";
  const phoneDisplay = (() => { const d = String(o.client_phone || "").replace(/\D/g, ""); if (!d) return ""; const n = d.startsWith("0") ? "234" + d.slice(1) : d; return n.length === 13 ? `+${n.slice(0, 3)} ${n.slice(3, 6)} ${n.slice(6, 9)} ${n.slice(9)}` : o.client_phone; })();

  const rows = [
    ["Design", o.design], ["Style", o.style],
    ["Client", o.client_name], ["WhatsApp", phoneDisplay],
    ["Bride", o.bride], ["Groom", o.groom],
    ["Wedding date", o.wedding_date ? fmtDate(o.wedding_date) : ""],
    ["Notes", o.notes],
  ].filter(([, v]) => v !== null && v !== undefined && String(v).trim() !== "");
  if (o.details && typeof o.details === "object") {
    for (const [k, v] of Object.entries(o.details)) {
      if (k === "whatsapp_message") continue;
      if (v !== null && v !== "" && typeof v !== "object") rows.push([k.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase()), v]);
    }
  }

  const F = "font-family:Helvetica,Arial,sans-serif;";
  const rowsHtml = rows.map(([k, v], i) => `
<tr>
  <td style="${F}padding:12px 0 2px;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#8A7477;font-weight:bold;${i ? "border-top:1px solid #F0E6E3;" : ""}">${esc(k)}</td>
</tr>
<tr>
  <td style="${F}padding:0 0 12px;font-size:16px;line-height:22px;color:#1E1214;">${esc(v).replace(/\n/g, "<br>")}</td>
</tr>`).join("");

  const button = (href, label, bg, fg, border) => `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 10px;">
  <tr><td align="center" bgcolor="${bg}" style="border-radius:28px;${border ? `border:2px solid ${border};` : ""}">
    <a href="${href}" target="_blank" style="${F}display:block;padding:14px 18px;font-size:15px;font-weight:bold;color:${fg};text-decoration:none;border-radius:28px;">${esc(label)}</a>
  </td></tr>
</table>`;

  const html = `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"></head>
<body style="margin:0;padding:0;background:#F6EEEB;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(couple)}${o.plan ? `, ${esc(o.plan)} plan` : ""}${o.wedding_date ? `, wedding ${esc(fmtDate(o.wedding_date))}` : ""}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#F6EEEB" style="background:#F6EEEB;">
<tr><td align="center" style="padding:20px 12px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;">
    <tr><td bgcolor="#500310" style="background:#500310;border-radius:18px 18px 0 0;padding:18px 22px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
        <td style="padding-right:12px;"><img src="https://deeday.ng/assets/apple-touch-icon.png" width="40" height="40" alt="deeday.ng" style="display:block;border:0;border-radius:10px;"></td>
        <td style="${F}font-size:20px;font-weight:bold;color:#FFFFFF;letter-spacing:-0.5px;">deeday.ng</td>
      </tr></table>
    </td></tr>
    <tr><td bgcolor="#FFFFFF" style="background:#FFFFFF;border-radius:0 0 18px 18px;padding:24px 22px 22px;">
      <p style="${F}margin:0 0 6px;font-size:12px;letter-spacing:2px;color:#6B0F1F;font-weight:bold;">NEW ORDER${o.plan ? ` &middot; ${esc(String(o.plan).toUpperCase())}` : ""}</p>
      <h1 style="${F}margin:0 0 14px;font-size:26px;line-height:32px;color:#1E1214;">${esc(couple)}</h1>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${rowsHtml}</table>
      <div style="height:14px;line-height:14px;">&nbsp;</div>
      ${wa ? button(wa, `Chat with ${firstName} on WhatsApp`, "#6B0F1F", "#FFFFFF") : ""}
      ${button("https://deeday.ng/admin", "Open admin dashboard", "#FFFFFF", "#6B0F1F", "#6B0F1F")}
      <p style="${F}margin:14px 0 0;font-size:12px;line-height:18px;color:#8A7477;">Ref ${esc(ref)}${received ? ` &middot; Received ${esc(received)}` : ""}</p>
    </td></tr>
    <tr><td align="center" style="${F}padding:14px 0 0;font-size:11px;color:#8A7477;">Sent automatically by deeday.ng when an order is saved.</td></tr>
  </table>
</td></tr></table>
</body></html>`;
  const text = `New order: ${couple}\n\n` + rows.map(([k, v]) => `${k}: ${v}`).join("\n") + (wa ? `\n\nWhatsApp ${firstName}: ${wa}` : "") + "\nAdmin: https://deeday.ng/admin" + `\n\nRef ${ref}${received ? " · " + received : ""}`;

  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM, to: [TO], subject: `New order: ${couple}${o.plan ? ` (${o.plan})` : ""}${o.wedding_date ? `, ${fmtDate(o.wedding_date)}` : ""}`, html, text }),
  });
  if (!r.ok) return res.status(502).json({ ok: false, resend: r.status });
  return res.status(200).json({ ok: true });
}
