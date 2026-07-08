import path from "node:path";

export const config = {
  port: Number(process.env.PORT ?? 3000),
  dataDir: process.env.DATA_DIR ?? path.resolve("data"),
  telegramToken: process.env.TELEGRAM_BOT_TOKEN ?? "",
  // Shared secret in the webhook URL so only Telegram can post updates.
  webhookSecret: process.env.WEBHOOK_SECRET ?? "",
  // Password for viewing the timeline (HTTP Basic, user "family").
  sitePassword: process.env.SITE_PASSWORD ?? "",
  // Optional: Resend API key + recipients for the weekly digest email.
  resendApiKey: process.env.RESEND_API_KEY ?? "",
  digestFrom: process.env.DIGEST_FROM ?? "",
  digestTo: (process.env.DIGEST_TO ?? "").split(",").map((s) => s.trim()).filter(Boolean),
};

export const mediaDir = () => path.join(config.dataDir, "media");
