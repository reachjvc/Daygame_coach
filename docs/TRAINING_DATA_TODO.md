# Training Data TODO (Open Questions)

## YouTube downloads (yt-dlp)

- Cookies/auth: Where should the “source of truth” login come from?
  - Option A: `YOUTUBE_COOKIES_FILE` points to a manually exported Netscape cookies file that includes `LOGIN_INFO`
  - Option B: `YOUTUBE_COOKIES_FROM_BROWSER` uses a local browser profile (e.g. `chrome`, `firefox`, `chromium`, `brave`)
- If we choose browser cookies: which browser/profile/container should be used by default on this machine?
- Age-restricted/private videos: should the pipeline **fail the whole channel** if any are blocked, or **continue and log** them (current behavior)?

## “Unavailable videos are hidden”

- Do we want a follow-up step that enumerates playlist entries and writes a separate “unavailable/hidden” report, or is logging the warning count enough?

## Format selection warning

- Do we want **audio-only** downloads (current: `bestaudio/best`) or do we ever need to keep video for anything downstream?

## Logging

- Is `training-data/download-<channel>.log` + `training-data/download-<channel>-issues.tsv` the right long-term location and format, or should logs live under `docs/` instead?

## Challenge solving / EJS warnings (defer for now)

- If “challenge solving failed” starts appearing again: do we want to pin yt-dlp versions, install additional JS/challenge components, or accept occasional missing formats?

