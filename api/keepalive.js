// Daily keep-alive: a request to Supabase so the free project never pauses
// (a paused project would silently drop new orders). Triggered by Vercel Cron.
export default async function handler(req, res) {
  const SB_URL = "https://otohaeukgewcnehllnsm.supabase.co";
  const SB_KEY = "sb_publishable_S4HgZAhnx0Or6C60O2CvmQ_haGzggKU";
  try {
    const r = await fetch(SB_URL + "/rest/v1/orders?select=id&limit=1", {
      headers: { apikey: SB_KEY, Authorization: "Bearer " + SB_KEY }
    });
    res.status(200).json({ ok: true, supabase_status: r.status, at: new Date().toISOString() });
  } catch (e) {
    res.status(200).json({ ok: false, error: String(e), at: new Date().toISOString() });
  }
}
