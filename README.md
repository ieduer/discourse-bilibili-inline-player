# Bilibili Inline Player

A Discourse theme component that turns supported bilibili video links into inline, click-to-play embeds without requiring a container rebuild.

This repository is intentionally implemented as a remote theme component, not a server plugin:

- installable from a Git repository in `Admin -> Customize -> Themes`
- no `app.yml` change
- no `./launcher rebuild app`
- open-source and portable across self-hosted Discourse instances

## Support matrix

Inline playback:

- `https://www.bilibili.com/video/BV...`
- `https://www.bilibili.com/video/av...`
- `https://m.bilibili.com/video/BV...`
- `https://m.bilibili.com/video/av...`
- `https://b23.tv/BV...`
- `https://b23.tv/av...`
- `https://bili2233.cn/BV...`
- `https://bili2233.cn/av...`
- `https://player.bilibili.com/player.html?...`
- `https://www.bilibili.com/bangumi/play/ep...`
- `https://www.bilibili.com/bangumi/play/ss...`
- `https://live.bilibili.com/<room_id>`
- `https://live.bilibili.com/blanc/<room_id>`
- optional `?p=<n>` on ordinary multi-page video URLs

Card takeover with open-on-bilibili fallback:

- `https://www.bilibili.com/audio/au...`
- `https://www.bilibili.com/audio/am...`
- `https://www.bilibili.com/read/cv...`
- `https://www.bilibili.com/read/mobile?id=...`
- `https://www.bilibili.com/opus/...`
- `https://t.bilibili.com/...`

Experimental inline playback:

- bilibili live activity player iframe via `enable_experimental_live_embed`

Live embeds are enabled by default in `0.2.x`. For true room ids the component prefers bilibili's activity player with control UI. For short/activity aliases that cannot be resolved client-side in a no-rebuild theme component, it falls back to bilibili's mobile H5 player. If a specific site or browser combination misbehaves, turn off `enable_experimental_live_embed` to fall back to opening bilibili.

Still not supported:

- opaque short-link tokens that cannot be resolved client-side before Discourse oneboxes them
- inline links inside a sentence
- favorites, collections, channels, playlists, watch-later, and other multi-item containers

The safest input pattern is still a standalone bilibili URL on its own line, which matches how Discourse onebox-style embeds are normally triggered.

## How it works

1. The cooked post is scanned on the client with Discourse's `decorateCookedElement` JS API.
2. Existing bilibili oneboxes are detected first, and standalone links, official iframe URLs, and pasted iframe code are handled as fallbacks.
3. The original cooked block is replaced with a poster card using the data already present in the cooked post.
4. For ordinary videos, the component fetches official bilibili metadata in the background to fill in the correct title and preview image when the cooked post does not already contain them.
5. When the user clicks the card, the component resolves the correct bilibili page context, including `cid` when available.
6. If bilibili exposes a valid public embed context, the official external player iframe is inserted in place.
7. In high-risk environments such as in-app browsers and WebViews, the component can automatically downgrade to opening bilibili instead of trapping the user in a broken third-party iframe.
8. For content types without a stable official iframe path in this theme-component-only architecture, the component still upgrades the post into a unified bilibili card and falls back to opening the canonical bilibili page.

The component does not modify Discourse core and does not require a rebuild.

## Official endpoints used

- Player: `https://player.bilibili.com/player.html`
- Video metadata: `https://api.bilibili.com/x/web-interface/view`
- Bangumi metadata page source: `https://api.bilibili.com/pgc/view/web/season`
- Live activity player: `https://www.bilibili.com/blackboard/live/live-activity-player.html`

## Installation

1. Push this repository to GitHub.
2. In Discourse admin, open `Customize -> Themes`.
3. Choose `Install -> From a git repository`.
4. Paste the repository URL, for example:

   `https://github.com/ieduer/discourse-bilibili-inline-player`
5. Mark it as a theme component and attach it to an active theme.

No rebuild is required.

## Settings

- `enabled`
- `autoplay_on_click`
- `max_embeds_per_post`
- `show_open_link`
- `enable_experimental_live_embed`
- `enable_live_danmaku`
- `auto_open_on_high_risk_env`
- `button_label`

## Operational notes

- Default Discourse installs should not need `allowed_iframes` changes because this component injects the iframe after cooking, not from raw post HTML.
- If a site runs a custom reverse-proxy CSP that restricts `frame-src`, allow `https://player.bilibili.com`.
- If a site runs a strict custom script CSP that blocks dynamic third-party scripts, allow `https://api.bilibili.com` for the click-time metadata request.
- If experimental live embeds are enabled, allow `https://www.bilibili.com` in `frame-src`.
- If a bilibili link cannot be parsed, the original cooked content is left untouched.

## Suggested repository name

- `discourse-bilibili-inline-player`

## License

MIT
