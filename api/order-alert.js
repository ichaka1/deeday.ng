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

  const couple = [o.bride, o.groom].filter(Boolean).join(" & ") || "(no names)";
  const wa = waLink(o.client_phone);
  const rows = [
    ["Plan", o.plan], ["Design", o.design], ["Style", o.style],
    ["Client", o.client_name], ["WhatsApp", o.client_phone],
    ["Groom", o.groom], ["Bride", o.bride], ["Wedding date", o.wedding_date],
    ["Notes", o.notes], ["Source", o.source],
  ].filter(([, v]) => v !== null && v !== undefined && String(v).trim() !== "");
  if (o.details && typeof o.details === "object") {
    for (const [k, v] of Object.entries(o.details)) {
      if (v !== null && v !== "" && typeof v !== "object") rows.push([k.replace(/_/g, " "), v]);
    }
  }

  const table = rows.map(([k, v]) =>
    `<tr><td style="padding:6px 12px 6px 0;color:#6F5E60;vertical-align:top;white-space:nowrap">${esc(k)}</td><td style="padding:6px 0;color:#1E1214">${esc(v).replace(/\n/g, "<br>")}</td></tr>`).join("");
  const html = `<div style="font-family:Segoe UI,Arial,sans-serif;max-width:560px;margin:auto;padding:24px;border:1px solid #EBDFDB;border-radius:16px">
<p style="margin:0;color:#6B0F1F;font-weight:800;letter-spacing:.1em;font-size:12px">NEW ORDER</p>
<h2 style="margin:6px 0 16px;color:#1E1214">${esc(couple)}${o.plan ? ` · ${esc(o.plan)}` : ""}</h2>
<table style="border-collapse:collapse;font-size:14px">${table}</table>
<p style="margin:22px 0 0">${wa ? `<a href="${wa}" style="background:#6B0F1F;color:#fff;padding:10px 18px;border-radius:30px;text-decoration:none;font-weight:700">Message ${esc(o.client_name || "client")} on WhatsApp</a> &nbsp; ` : ""}<a href="https://deeday.ng/admin" style="color:#6B0F1F;font-weight:700">Open admin</a></p>
<p style="color:#9a8a8c;font-size:12px;margin-top:20px">Order #${esc(o.id)} · ${esc(o.created_at)}</p></div>`;
  const text = rows.map(([k, v]) => `${k}: ${v}`).join("\n") + (wa ? `\n\nWhatsApp: ${wa}` : "") + "\nAdmin: https://deeday.ng/admin";

  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM, to: [TO], subject: `New order: ${couple}${o.plan ? ` (${o.plan})` : ""}`, html, text }),
  });
  if (!r.ok) return res.status(502).json({ ok: false, resend: r.status });
  return res.status(200).json({ ok: true });
}
