// Order emails, triggered by a Supabase Database Webhook on INSERT into public.orders.
//  1. Alert to the owner (always).
//  2. Copy of the order to the customer (only if they gave a valid email). This is a
//     transactional email: it is sent because they placed the order, not as marketing.
// Env (Vercel project settings, never in code):
//   RESEND_API_KEY      Resend key for the deeday.ng domain
//   ORDER_ALERT_SECRET  shared secret, sent by the webhook as the x-webhook-secret header
import { timingSafeEqual } from "node:crypto";

const OWNER = "nwanicyriluchenna@gmail.com";
const FROM = "deeday.ng <orders@deeday.ng>";
const BUSINESS_WA = "2348063941963"; // deeday.ng WhatsApp shown to customers
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const HIDDEN = new Set(["whatsapp_message", "email", "marketing_consent", "consent_text", "consent_at", "consent_ip"]);
const LABELS = {
  hashtag: "Hashtag", ceremony_venue: "Ceremony venue", ceremony_time: "Ceremony time", reception_venue: "Reception venue",
  reception_time: "Reception time", colours: "Colours", asoebi_dealer: "Aso-ebi dealer", gift_bank: "Gift bank",
  gift_acct: "Gift account", story: "Love story",
};

function same(a, b) {
  const x = Buffer.from(String(a || "")), y = Buffer.from(String(b || ""));
  return x.length === y.length && x.length > 0 && timingSafeEqual(x, y);
}
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const waLink = (phone, text) => {
  let d = String(phone || "").replace(/\D/g, "");
  if (d.startsWith("0")) d = "234" + d.slice(1);
  return d.length >= 10 ? `https://wa.me/${d}${text ? `?text=${encodeURIComponent(text)}` : ""}` : null;
};
const fmtDate = (d) => { const x = new Date(d + "T12:00:00Z"); return isNaN(x) ? d : x.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Lagos" }); };
const fmtPhone = (p) => { const d = String(p || "").replace(/\D/g, ""); if (!d) return ""; const n = d.startsWith("0") ? "234" + d.slice(1) : d; return n.length === 13 ? `+${n.slice(0, 3)} ${n.slice(3, 6)} ${n.slice(6, 9)} ${n.slice(9)}` : p; };
const filled = (rows) => rows.filter(([, v]) => v !== null && v !== undefined && String(v).trim() !== "");

const F = "font-family:Helvetica,Arial,sans-serif;";
function button(href, label, solid) {
  const bg = solid ? "#6B0F1F" : "#FFFFFF", fg = solid ? "#FFFFFF" : "#6B0F1F";
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 10px;"><tr><td align="center" bgcolor="${bg}" style="border-radius:28px;${solid ? "" : "border:2px solid #6B0F1F;"}"><a href="${href}" target="_blank" style="${F}display:block;padding:14px 18px;font-size:15px;font-weight:bold;color:${fg};text-decoration:none;border-radius:28px;">${esc(label)}</a></td></tr></table>`;
}
function render({ preheader, eyebrow, title, intro, rows, buttons, small, footer }) {
  const rowsHtml = rows.map(([k, v], i) => `<tr><td style="${F}padding:12px 0 2px;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#8A7477;font-weight:bold;${i ? "border-top:1px solid #F0E6E3;" : ""}">${esc(k)}</td></tr><tr><td style="${F}padding:0 0 12px;font-size:16px;line-height:22px;color:#1E1214;">${esc(v).replace(/\n/g, "<br>")}</td></tr>`).join("");
  return `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"></head>
<body style="margin:0;padding:0;background:#F6EEEB;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#F6EEEB" style="background:#F6EEEB;"><tr><td align="center" style="padding:20px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;">
<tr><td bgcolor="#500310" style="background:#500310;border-radius:18px 18px 0 0;padding:18px 22px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td style="padding-right:12px;"><img src="https://deeday.ng/assets/apple-touch-icon.png" width="40" height="40" alt="deeday.ng" style="display:block;border:0;border-radius:10px;"></td>
<td style="${F}font-size:20px;font-weight:bold;color:#FFFFFF;letter-spacing:-0.5px;">deeday.ng</td></tr></table></td></tr>
<tr><td bgcolor="#FFFFFF" style="background:#FFFFFF;border-radius:0 0 18px 18px;padding:24px 22px 22px;">
<p style="${F}margin:0 0 6px;font-size:12px;letter-spacing:2px;color:#6B0F1F;font-weight:bold;">${eyebrow}</p>
<h1 style="${F}margin:0 0 ${intro ? 10 : 14}px;font-size:26px;line-height:32px;color:#1E1214;">${esc(title)}</h1>
${intro ? `<p style="${F}margin:0 0 10px;font-size:15px;line-height:22px;color:#3A2A2C;">${intro}</p>` : ""}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${rowsHtml}</table>
<div style="height:14px;line-height:14px;">&nbsp;</div>${buttons.join("")}
<p style="${F}margin:14px 0 0;font-size:12px;line-height:18px;color:#8A7477;">${small}</p>
</td></tr>
<tr><td align="center" style="${F}padding:14px 8px 0;font-size:11px;line-height:16px;color:#8A7477;">${footer}</td></tr>
</table></td></tr></table></body></html>`;
}

async function send(payload) {
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return r.ok;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ ok: false });
  const secret = process.env.ORDER_ALERT_SECRET;
  if (!secret || !same(req.headers["x-webhook-secret"], secret)) return res.status(401).json({ ok: false });
  if (!process.env.RESEND_API_KEY) return res.status(500).json({ ok: false, error: "missing RESEND_API_KEY" });

  const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
  if (body.type !== "INSERT" || body.table !== "orders" || !body.record) return res.status(200).json({ ok: true, skipped: true });
  const o = { ...body.record };
  for (const k of ["plan", "design"]) if (/^not specified$/i.test(String(o[k] || "").trim())) o[k] = "";
  const det = o.details && typeof o.details === "object" ? o.details : {};
  const custEmail = EMAIL_RE.test(String(det.email || "")) ? String(det.email).toLowerCase() : "";

  const couple = [o.bride, o.groom].filter(Boolean).join(" & ") || "New couple";
  const ref = String(o.id || "").slice(0, 8).toUpperCase();
  const date = o.wedding_date ? fmtDate(o.wedding_date) : "";
  const received = o.created_at ? new Date(o.created_at).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Africa/Lagos" }) + " WAT" : "";
  const extra = Object.entries(det).filter(([k, v]) => !HIDDEN.has(k) && v !== null && v !== "" && typeof v !== "object")
    .map(([k, v]) => [LABELS[k] || k.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase()), v]);
  const orderRows = filled([
    ["Plan", o.plan], ["Design", o.design], ["Style", o.style],
    ["Bride", o.bride], ["Groom", o.groom], ["Wedding date", date], ...extra, ["Notes", o.notes],
  ]);

  // 1. Owner alert
  const firstName = String(o.client_name || "the client").trim().split(/\s+/)[0].slice(0, 20);
  const ownerRows = filled([
    ["Client", o.client_name], ["WhatsApp", fmtPhone(o.client_phone)], ["Email", custEmail],
    ["Marketing emails", custEmail ? (det.marketing_consent === true ? "Yes, opted in" : "No") : ""],
    ...orderRows.filter(([k]) => k !== "Plan"),
  ]);
  const clientWa = waLink(o.client_phone);
  const ownerOk = await send({
    from: FROM, to: [OWNER], ...(custEmail ? { reply_to: custEmail } : {}),
    subject: `New order: ${couple}${o.plan ? ` (${o.plan})` : ""}${date ? `, ${date}` : ""}`,
    html: render({
      preheader: `${couple}${o.plan ? `, ${o.plan} plan` : ""}${date ? `, wedding ${date}` : ""}`,
      eyebrow: `NEW ORDER${o.plan ? ` &middot; ${esc(String(o.plan).toUpperCase())}` : ""}`,
      title: couple, intro: "", rows: ownerRows,
      buttons: [clientWa ? button(clientWa, `Chat with ${firstName} on WhatsApp`, true) : "", button("https://deeday.ng/admin", "Open admin dashboard", false)],
      small: `Ref ${esc(ref)}${received ? ` &middot; Received ${esc(received)}` : ""}${custEmail ? " &middot; A copy was sent to the client" : ""}`,
      footer: "Sent automatically by deeday.ng when an order is saved.",
    }),
    text: `New order: ${couple}\n\n` + ownerRows.map(([k, v]) => `${k}: ${v}`).join("\n") + (clientWa ? `\n\nWhatsApp ${firstName}: ${clientWa}` : "") + `\nAdmin: https://deeday.ng/admin\n\nRef ${ref}`,
  });

  // 2. Customer copy (transactional)
  let customerOk = null;
  if (custEmail) {
    const name = String(o.client_name || "").trim().split(/\s+/)[0] || "there";
    const bizWa = waLink(BUSINESS_WA, `Hello deeday.ng, this is about my order ${ref} (${couple}).`);
    const custRows = filled([["Your name", o.client_name], ["Your WhatsApp", fmtPhone(o.client_phone)], ...orderRows]);
    customerOk = await send({
      from: FROM, to: [custEmail], reply_to: OWNER,
      subject: `Your deeday.ng order: ${couple}`,
      html: render({
        preheader: "Here is a copy of what you sent us, and what happens next.",
        eyebrow: "ORDER RECEIVED",
        title: `Thank you, ${name}!`,
        intro: `We have your order for <b>${esc(couple)}</b>. Here is a copy of what you sent us. Next, we will message you on WhatsApp to confirm the details and ask for your photos. Your delivery time starts once we have your details, photos and payment.`,
        rows: custRows,
        buttons: [bizWa ? button(bizWa, "Message us on WhatsApp", true) : "", button("https://deeday.ng/pricing", "See what your plan includes", false)],
        small: `Order ref ${esc(ref)}${received ? ` &middot; ${esc(received)}` : ""}. Spotted a mistake? Just reply to this email or message us on WhatsApp.`,
        footer: `You received this email because you placed an order at <a href="https://deeday.ng" style="color:#8A7477;">deeday.ng</a>. <a href="https://deeday.ng/privacy" style="color:#8A7477;">Privacy Policy</a>`,
      }),
      text: `Thank you, ${name}!\n\nWe have your order for ${couple}. Here is a copy of what you sent us:\n\n` + custRows.map(([k, v]) => `${k}: ${v}`).join("\n") +
        `\n\nNext, we will message you on WhatsApp to confirm the details and ask for your photos.\n\nOrder ref ${ref}. Spotted a mistake? Reply to this email.\n\ndeeday.ng`,
    });
  }

  if (!ownerOk) return res.status(502).json({ ok: false, owner: false, customer: customerOk });
  return res.status(200).json({ ok: true, customer: customerOk });
}
