# Family Memories

A private, zero-friction place to capture your family's everyday moments — kid quotes, photos, voice memos, videos, notes — by messaging a Telegram bot **or from the phone-first capture app**. Moments land in a timeline that tags each kid with their **age at that moment** ("Maya, 2y 4mo"), and a weekly digest email keeps everyone caught up.

This covers **Slice A** (the quote catcher) plus the **PWA capture app** from the plan in [IDEAS.md](IDEAS.md).

## The capture app (PWA)

Open `/capture` on your phone — big one-tap buttons for **Quote / Photo / Video / Voice**:

- **Quote/note**: type it, tap a kid chip, save. The response confirms the kid's age at that moment.
- **Photo & video**: opens the native camera or photo library.
- **Voice**: records in the browser (MediaRecorder) with live timer and playback preview before saving.
- The timeline at `/` has per-kid filter chips and a Capture button.

Install it like an app: in Safari (iOS) or Chrome (Android), open the site → Share → **Add to Home Screen**. It launches straight into the capture screen with the family-memories icon.

## How it works

```
you (or grandma) ──text/photo/voice──▶ Telegram bot ──webhook──▶ this app
                                                                   │
                                              SQLite (moments) + ./data/media (files)
                                                                   │
                                          timeline page  +  weekly digest email
```

Send the bot:

- `Maya: the moon is following our car` → saved as a **quote**, tagged Maya with her age
- a **photo / voice memo / video**, optionally captioned `Maya: ...` to tag
- any other text → saved as a **note**
- `#maya` anywhere in a message also tags

Commands: `/addkid Maya 2023-04-12`, `/kids`, `/help`

## Setup

1. **Create the bot**: message [@BotFather](https://t.me/BotFather) on Telegram → `/newbot` → copy the token.
2. **Install & run**:

   ```bash
   npm install
   TELEGRAM_BOT_TOKEN=123:abc WEBHOOK_SECRET=$(openssl rand -hex 16) SITE_PASSWORD=yourpassword npm start
   ```

3. **Point Telegram at your server** (needs a public HTTPS URL — see Deploying):

   ```bash
   curl "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook?url=https://your.domain/webhook/$WEBHOOK_SECRET"
   ```

4. Message your bot `/addkid Maya 2023-04-12`, then start capturing.

The timeline is at `/` (HTTP Basic auth, user `family`, password `SITE_PASSWORD`).

## Environment variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `TELEGRAM_BOT_TOKEN` | yes | From BotFather |
| `WEBHOOK_SECRET` | yes | Random string; gates the webhook and digest-send URLs |
| `SITE_PASSWORD` | yes (in production) | Protects the timeline and media |
| `PORT` | no | Default 3000 |
| `DATA_DIR` | no | Where SQLite + media live; default `./data` |
| `RESEND_API_KEY`, `DIGEST_FROM`, `DIGEST_TO` | no | Enables the weekly digest email (comma-separated recipients) |

## Weekly digest

- Preview anytime at `/digest/preview`.
- To send: `POST /digest/send/$WEBHOOK_SECRET` — schedule it weekly with any cron (e.g. `fly machines`, GitHub Actions schedule, or cron on the host).
- Emails send via [Resend](https://resend.com) when configured; otherwise the endpoint reports the count without sending.

## Deploying

Any host with a persistent disk works (SQLite + media files live in `DATA_DIR`). A small [Fly.io](https://fly.io) machine with a volume mounted at `/data` (`DATA_DIR=/data`) is a good fit and gives you the public HTTPS URL Telegram needs.

## Development

```bash
npm install
npm test        # age + parsing unit tests
npm run dev     # watch mode
```

PWA icons are checked in under `public/icons/`; regenerate with `node scripts/gen-icons.mjs`.

## What's next (Slices B & C)

Email-in ingestion, upload-only invite links for grandparents, milestones, search, "on this day" resurfacing, and a yearbook PDF generator — see [IDEAS.md](IDEAS.md).
