import { momentsSince } from "./db.js";
import { digestHtml } from "./render.js";
import { config } from "./config.js";

export function buildWeeklyDigest(): { html: string; count: number } {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const moments = momentsSince(since.toISOString().slice(0, 19) + "Z");
  return { html: digestHtml(moments, since), count: moments.length };
}

/** Sends via Resend if configured; otherwise returns the HTML for preview only. */
export async function sendWeeklyDigest(): Promise<{ sent: boolean; count: number }> {
  const { html, count } = buildWeeklyDigest();
  if (!config.resendApiKey || !config.digestFrom || config.digestTo.length === 0) {
    return { sent: false, count };
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${config.resendApiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      from: config.digestFrom,
      to: config.digestTo,
      subject: `Family memories — ${count} moment${count === 1 ? "" : "s"} this week`,
      html,
    }),
  });
  if (!res.ok) throw new Error(`Resend failed: ${res.status} ${await res.text()}`);
  return { sent: true, count };
}
