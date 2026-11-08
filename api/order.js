// Order intake: verifies the Cloudflare Turnstile token, then saves the order with a server-only key.
// Env (Vercel project settings, never in code):
//   TURNSTILE_SECRET_KEY  secret for the "deeday.ng order form" Turnstile widget
//   SUPABASE_SECRET_KEY   Supabase secret key (server only) so orders can be inserted after anon insert is revoked
const SB_URL = "https://otohaeukgewcnehllnsm.supabase.co";
const HOSTS = new Set(["deeday.ng", "www.deeday.ng"]);

const str = (v, max) => (typeof v === "string" ? v.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, max) : "");
const DETAIL_KEYS = {
  hashtag: 40, ceremony_venue: 160, ceremony_time: 40, reception_venue: 160, reception_time: 40, colours: 120,
  asoebi_dealer: 20, gift_bank: 60, gift_acct: 20, story: 600, whatsapp_message: 4000,
  email: 120, consent_text: 300, consent_at: 40,
};
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ ok: false });
  const { TURNSTILE_SECRET_KEY, SUPABASE_SECRET_KEY } = process.env;
  if (!TURNSTILE_SECRET_KEY || !SUPABASE_SECRET_KEY) return res.status(503).json({ ok: false, error: "not configured" });

  let body = req.body;
  try { if (typeof body === "string") body = JSON.parse(body || "{}"); } catch { return res.status(400).json({ ok: false }); }
  const token = str(body && body.token, 2048);
  const o = (body && body.order) || {};
  if (!token) return res.status(403).json({ ok: false, error: "missing check" });

  // 1. Turnstile
  const form = new URLSearchParams({ secret: TURNSTILE_SECRET_KEY, response: token });
  const ip = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
  if (ip) form.set("remoteip", ip);
  const v = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body: form }).then((r) => r.json()).catch(() => null);
  if (!v || !v.success || (v.hostname && !HOSTS.has(v.hostname))) return res.status(403).json({ ok: false, error: "check failed" });

  // 2. Validate
  const row = {
    plan: str(o.plan, 40), design: str(o.design, 80), style: str(o.style, 300),
    client_name: str(o.client_name, 80), client_phone: str(o.client_phone, 20),
    groom: str(o.groom, 60), bride: str(o.bride, 60),
    wedding_date: /^\d{4}-\d{2}-\d{2}$/.test(o.wedding_date || "") ? o.wedding_date : null,
    notes: str(o.notes, 400), source: "website", details: {},
  };
  if (!row.client_name || !row.client_phone || !row.groom || !row.bride) return res.status(400).json({ ok: false, error: "missing fields" });
  const d = o.details && typeof o.details === "object" ? o.details : {};
  for (const [k, max] of Object.entries(DETAIL_KEYS)) { const s = str(d[k], max); if (s) row.details[k] = s; }
  if (row.details.email && !EMAIL_RE.test(row.details.email)) delete row.details.email;
  // marketing consent only counts with a valid email, the exact wording and a timestamp
  if (d.marketing_consent === true && row.details.email && row.details.consent_text) {
    row.details.marketing_consent = true;
    row.details.consent_at = new Date().toISOString();
    row.details.consent_ip = ip || "";
  } else { delete row.details.consent_text; delete row.details.consent_at; }

  // 3. Save (the Supabase webhook then sends the email alert)
  const r = await fetch(`${SB_URL}/rest/v1/orders`, {
    method: "POST",
    headers: { apikey: SUPABASE_SECRET_KEY, "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify(row),
  });
  if (!r.ok) return res.status(502).json({ ok: false, error: "save failed" });
  return res.status(201).json({ ok: true });
}
