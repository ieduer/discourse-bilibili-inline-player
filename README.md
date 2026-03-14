# Bilibili Inline Player

A Discourse theme component that turns supported bilibili video links into inline, click-to-play embeds without requiring a container rebuild.

This repository is intentionally implemented as a remote theme component, not a server plugin:

- installable from a Git repository in `Admin -> Customize -> Themes`
- no `app.yml` change
- no `./launcher rebuild app`
- open-source and portable across self-hosted Discourse instances

## V1 scope

Supported:

- `https://www.bilibili.com/video/BV...`
- `https://www.bilibili.com/video/av...`
- `https://m.bilibili.com/video/BV...`
- `https://m.bilibili.com/video/av...`
- optional `?p=<n>` on ordinary multi-page video URLs

Not supported in v1:

- `b23.tv` short links
- bangumi URLs such as `/bangumi/play/ep...`
- live URLs such as `live.bilibili.com/...`
- article, audio, dynamic, playlist, season, or collection URLs
- inline links inside a sentence

The safe input pattern for v1 is a standalone bilibili video URL on its own line, which matches how Discourse onebox-style embeds are normally triggered.

## How it works

1. The cooked post is scanned on the client with Discourse's `decorateCookedElement` JS API.
2. Existing bilibili oneboxes are detected first, and standalone bilibili links are handled as a fallback.
3. The original cooked block is replaced with a poster card using the data already present in the cooked post.
4. When the user clicks the card, the component resolves the correct bilibili page context, including `cid` when available.
5. If bilibili exposes a valid public embed context, the official external player iframe is inserted in place.
6. If bilibili reports that the video is unavailable in anonymous or external context, the component falls back to opening the canonical bilibili page instead of embedding the wrong content.

The component does not modify Discourse core and does not require a rebuild.

## Official endpoints used

- Player: `https://player.bilibili.com/player.html`
- Video metadata: `https://api.bilibili.com/x/web-interface/view`

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
- `button_label`

## Operational notes

- Default Discourse installs should not need `allowed_iframes` changes because this component injects the iframe after cooking, not from raw post HTML.
- If a site runs a custom reverse-proxy CSP that restricts `frame-src`, allow `https://player.bilibili.com`.
- If a site runs a strict custom script CSP that blocks dynamic third-party scripts, allow `https://api.bilibili.com` for the click-time metadata request.
- If a bilibili link cannot be parsed, the original cooked content is left untouched.

## Suggested repository name

- `discourse-bilibili-inline-player`

## License

MIT
