# Family Memories — Ideation

A private place to capture the small, real moments of family life — the funny thing a kid said at dinner, a first step, a voice, a photo — with as close to zero friction as possible, and a way for grandparents and friends to contribute too.

## The core insight: friction kills memories

The moment happens and you have about ten seconds before life moves on. If capturing requires opening an app, logging in, and filling out a form, it won't happen. Every design decision should be judged against one question: **can I save this moment in under ten seconds, one-handed, while holding a toddler?**

The second insight: **capture is only half the product.** Memories you never see again are barely better than memories you never saved. Resurfacing (digests, "one year ago today", yearbooks) is what makes the archive feel alive.

## What gets captured (moment types)

| Type | Example | Notes |
|------|---------|-------|
| Quote | "The moon is following our car" | The killer feature for young kids — pure text, fastest capture |
| Photo | From the phone camera roll | Single or batch |
| Video | First steps, dance parties | Short clips |
| Audio | Their voices — songs, giggles, mispronunciations | Underrated; voices change fast and almost nobody records them |
| Milestone | First tooth, first word, first day of school | Structured: type + date + optional media |
| Note | Funny/sad/sweet things that happened | Freeform journal-ish entries |

Every moment gets: date/time, which kid(s) it's about, who captured it, and the kid's **auto-computed age at that moment** ("Maya, 2y 4mo") — that context is what makes a quote precious later.

## Capture channels, ranked by friction

1. **Message a bot (SMS / WhatsApp / Telegram).** Text a quote, send a photo, send a voice memo — done. No app to open, works for grandparents with zero onboarding. Probably the highest-leverage MVP channel.
2. **Email-in address** (e.g. `moments@yourfamily.app`). Subject = caption, attachments = media. Great for "everyone email me your photos from the birthday party."
3. **Phone share sheet / PWA.** See a photo in your camera roll → share → tagged and saved. A PWA with a home-screen icon and 3 big buttons (Quote / Photo / Voice) gets most of the way to a native app.
4. **Siri Shortcut / widget.** "Hey Siri, remember this quote…" → dictated straight into the archive. Lock-screen widget with a one-tap voice recorder.
5. **Web app.** The full experience — browsing, editing, tagging — but not the primary capture path.

## Getting others to contribute

- **Upload-only invite links.** Send grandma a link; she can add photos/videos without an account. No login wall.
- **Event requests.** "Send me your photos from Leo's party" → generates a link/email address scoped to that event; contributions land pre-tagged.
- **The family bot group.** Add the bot to an existing family WhatsApp group — moments people already share there get archived automatically (opt-in per message via emoji react, or everything).

## Organizing & finding

- **Per-kid timelines** plus a combined family stream.
- **Age view**: "show me Maya at age 2" — often more meaningful than calendar dates.
- **Tags/moods**: funny, sweet, milestone, hard-day. Lightweight, optional.
- **Search** across quote text and captions; later, AI transcription of audio/video makes voices searchable too.

## Resurfacing (the payoff)

- **"On this day"** — a daily or weekly nudge with a memory from 1/2/3 years ago.
- **Weekly digest email** to parents (and optionally grandparents): everything captured this week, beautifully laid out.
- **Yearbook generator** — one-click printable PDF per kid per year. Quotes interleaved with photos.
- **"Letter at 18"** — a private lane of entries addressed to each kid, sealed until a future date.
- **Random memory button** for rainy days.

## Privacy stance

This is data about children, so: private by default, no social feed, no public URLs without explicit action, easy full export (you should never feel locked in), and media stored in storage you control (your own bucket, or your Google Drive). Invite-only contribution, view access separate from contribute access.

## Build vs. buy (honest note)

Apps like Tinybeans, Notabli, and Day One cover parts of this. Reasons to build anyway: full data ownership, the bot/email capture channels done exactly right, age-based views, and the yearbook/digest output tailored to your family. Also — it's a fun project.

## Possible MVP slices

**Slice A — "The quote catcher" (smallest useful thing)**
A Telegram/WhatsApp bot + a database. Text it a quote or send a photo/voice memo, prefix with the kid's name (or it asks). A simple web page shows the timeline. Weekly digest email. Ship in a weekend, start capturing immediately.

**Slice B — "The family inbox"**
Slice A + email-in ingestion + upload-only invite links, so others can contribute from day one.

**Slice C — "The full memory home"**
PWA with capture buttons, per-kid timelines and age views, milestones, search, on-this-day resurfacing, yearbook export.

The slices stack: A → B → C, and nothing captured in A is wasted.

## Rough architecture sketch (for later)

- **Backend**: single small app (e.g. Next.js or a lightweight API) + Postgres/SQLite for moments + object storage (S3-compatible or Google Drive) for media.
- **Ingestion adapters**: bot webhook, inbound email (e.g. via a mail-parse service), web upload. All normalize into one `Moment` record.
- **Data model**: `Family` → `People` (adults + kids with birthdays) → `Moments` (type, text, media refs, tagged kids, author, timestamp, tags) → `Media`.
- **Digest/resurfacing**: a daily cron job. That's it.

## Open questions

1. Which capture channel matters most day one — bot, PWA, or email?
2. Where should media live — our own storage, or your Google account (Drive/Photos)?
3. Who are the first contributors besides you — partner, grandparents?
4. Start with Slice A and grow, or design Slice C from the start?
