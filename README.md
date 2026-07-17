# Family Memories

A private, zero-friction place to capture your family's everyday moments — kid quotes, photos, voice memos, videos, notes — by messaging a Telegram bot **or from the phone-first capture app**. Moments land in a timeline that tags each kid with their **age at that moment** ("Maya, 2y 4mo"), and a weekly digest email keeps everyone caught up.

This covers **Slice A** (the quote catcher) plus the **PWA capture app** from the plan in [IDEAS.md](IDEAS.md).

## The capture app (PWA)

Open `/capture` on your phone — big one-tap buttons for **Quote / Photo / Video / Voice**:

- **Quote/note**: type it, tap one or more kid chips (sibling moments tag everyone involved), save. The response confirms each kid's age at that moment.
- **Photo & video**: opens the native camera or photo library.
- **Voice**: records in the browser (MediaRecorder) with live timer and playback preview before saving.
- The timeline at `/` has per-kid filter chips and a Capture button.

Install it like an app: in Safari (iOS) or Chrome (Android), open the site → Share → **Add to Home Screen**. It launches straight into the capture screen with the family-memories icon.

## Invite links (grandparents & friends)

Open `/invites` to create **upload-only share links** — no account, no password needed by the recipient:

- Each link gets a label ("Grandma", "Leo's birthday party") and an optional expiry (7/30 days or never).
- Recipients see a friendly share screen — photo, video, voice, or story — with the kids' name chips for tagging. Their name (or the invite label) shows as "added by".
- Links can be revoked anytime; dead links get a gentle "ask for a fresh link" page.
- Contributors can **never see the timeline** — the link only accepts uploads.

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
- `Maya + Leo: built a pillow fort` → tags **both kids** (also works with `and`, `&`, or commas)
- a **photo / voice memo / video**, optionally captioned `Maya: ...` to tag
- any other text → saved as a **note**
- `#maya #leo` anywhere in a message also tags any number of kids

Commands: `/addkid Maya 2023-04-12`, `/kids`, `/help`

## Kids

Add each child at **`/kids`** (name + birthday) — or via the bot with `/addkid Maya 2023-04-12`. Every moment gets tagged with the child's exact age at capture time; names show as tag chips on the capture and contribute screens, and as filters on the timeline. Birthdays and names can be edited later from the same page.

## Deploy on Fly.io (recommended first launch)

The Telegram bot is optional — the web app alone is fully usable, so you can ship this in ~10 minutes and add the bot later.

```bash
# 1. Install flyctl and sign up (once): https://fly.io/docs/flyctl/install/
fly launch --copy-config --no-deploy   # pick an app name + region; keep the volume config

# 2. Secrets (the only required one is the site password)
fly secrets set SITE_PASSWORD=pick-a-password WEBHOOK_SECRET=$(openssl rand -hex 16)

# 3. Ship it
fly deploy
```

Open `https://<your-app>.fly.dev/kids`, add your kids, and start capturing at `/capture` (login: user `family` + your password). Add it to your phone's home screen, and create invite links at `/invites` for the grandparents.

**Optional — Telegram bot** (capture by texting): message [@BotFather](https://t.me/BotFather) → `/newbot` → then:

```bash
fly secrets set TELEGRAM_BOT_TOKEN=123:abc
curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://<your-app>.fly.dev/webhook/<WEBHOOK_SECRET>"
```

**Optional — weekly digest email**: set `RESEND_API_KEY`, `DIGEST_FROM`, `DIGEST_TO` secrets and schedule `curl -X POST https://<your-app>.fly.dev/digest/send/<WEBHOOK_SECRET>` weekly (GitHub Actions cron works fine).

## Run locally

```bash
npm install
SITE_PASSWORD=yourpassword WEBHOOK_SECRET=$(openssl rand -hex 16) npm start
```

The timeline is at `/` (HTTP Basic auth, user `family`, password `SITE_PASSWORD`).

## Environment variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `SITE_PASSWORD` | yes (in production) | Protects the timeline, capture, and media |
| `WEBHOOK_SECRET` | yes | Random string; gates the Telegram webhook and digest-send URLs |
| `TELEGRAM_BOT_TOKEN` | no | From BotFather; enables capture-by-texting |
| `PORT` | no | Default 3000 |
| `DATA_DIR` | no | Where SQLite + media live; default `./data` |
| `RESEND_API_KEY`, `DIGEST_FROM`, `DIGEST_TO` | no | Enables the weekly digest email (comma-separated recipients) |

## Weekly digest

- Preview anytime at `/digest/preview`.
- To send: `POST /digest/send/$WEBHOOK_SECRET` — schedule it weekly with any cron (e.g. `fly machines`, GitHub Actions schedule, or cron on the host).
- Emails send via [Resend](https://resend.com) when configured; otherwise the endpoint reports the count without sending.

## Deploying elsewhere

Any host that can run the `Dockerfile` with a persistent disk works — SQLite and media files live in `DATA_DIR`, so mount a volume there and set the secrets from the table above.

## Development

```bash
npm install
npm test        # age + parsing unit tests
npm run dev     # watch mode
```

PWA icons are checked in under `public/icons/`; regenerate with `node scripts/gen-icons.mjs`.

## What's next

Email-in ingestion, milestones, search, "on this day" resurfacing, and a yearbook PDF generator — see [IDEAS.md](IDEAS.md).
