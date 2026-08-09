# Bilibili + NetEase + QQ Music Embeds + Zhihu + Xiaohongshu Source Cards

A Discourse theme component that turns supported bilibili, NetEase Cloud Music, QQ Music, Zhihu, Xiaohongshu, and RedNote links into inline embeds or source cards without requiring a container rebuild.

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
- `https://music.163.com/song?id=...`
- `https://music.163.com/playlist?id=...`
- `https://music.163.com/album?id=...`
- `https://music.163.com/program?id=...`
- `https://music.163.com/djradio?id=...`
- `https://music.163.com/#/song?id=...`
- `https://music.163.com/outchain/player?...`
- `https://i.y.qq.com/n2/m/outchain/player/index.html?songid=...` (QQ Music outchain player)
- `https://i.y.qq.com/v8/playsong.html?songmid=...` (QQ Music playsong)
- optional `?p=<n>` on ordinary multi-page video URLs

Card takeover with open-on-QQ-Music fallback:

- `https://y.qq.com/n/ryqq/songDetail/...` (QQ Music song detail)
- `https://y.qq.com/n/ryqq/playlist/...` (QQ Music playlist)
- `https://y.qq.com/n/ryqq/albumDetail/...` (QQ Music album)
- `https://y.qq.com/n/ryqq/toplist/...` (QQ Music toplist)
- `https://i.y.qq.com/n2/m/share/details/taoge.html?id=...` (QQ Music shared playlist)

Zhihu source-card render:

- `https://www.zhihu.com/question/<question_id>`
- `https://www.zhihu.com/question/<question_id>/answer/<answer_id>`
- `https://www.zhihu.com/answer/<answer_id>`
- `https://zhuanlan.zhihu.com/p/<article_id>`
- `https://www.zhihu.com/p/<article_id>`

Xiaohongshu / RedNote source-card render:

- `https://www.xiaohongshu.com/explore/<24-character-note_id>?...`
- `https://www.xiaohongshu.com/discovery/item/<24-character-note_id>?...`
- `https://www.rednote.com/explore/<24-character-note_id>?...`
- `https://xhslink.com/a/<share_code>`
- `https://xhslink.com/m/<share_code>`
- `https://xhslink.com/o/<share_code>`
- `http://xhslink.cn/a|m|o/<share_code>` (normalized to HTTPS)
- schemeless `xhslink.com/...` or `xhslink.cn/...` share text, including links followed by Chinese punctuation

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

For ordinary bilibili video and bangumi embeds, the component now also exposes an inline recovery path for users who get stuck on bilibili's own "你感兴趣的视频都在B站" guide layer. Because that layer lives inside bilibili's cross-origin iframe, the theme component cannot force it closed. The implemented mitigation is:

- keep inline playback as the default
- preserve `Open on bilibili`
- expose `关闭自动播放重试` inside the loaded embed footer
- show a delayed hint pointing users to that retry path when they get stuck

For NetEase Cloud Music, the component uses the official outchain player paths. Desktop-like environments use `https://music.163.com/outchain/player`, while mobile-like environments use `https://music.163.com/m/outchain/player` directly to avoid NetEase's current mobile 302 downgrade to an insecure `http://` URL. Official NetEase source code shows the outchain player types map to playlist, album, song, DJ program, and DJ radio.

For Zhihu, current public pages and API paths do not expose a reliable public iframe or oEmbed interface. The component therefore renders supported Zhihu URLs as styled source cards using the cooked post metadata already available in Discourse, then opens the canonical Zhihu page on click.

For Xiaohongshu and RedNote, the official platform documentation reviewed on 2026-08-08 exposes no supported third-party oEmbed or embed widget. Version `0.8.1` therefore builds a content-rich preview from the title and description included in the copied share text, including auto-linkified URLs embedded in a sentence. The original cooked post text remains untouched. Clicking **展开笔记** then loads the user-supplied official note page inside the card; the footer always retains a direct source link even when the general open-link setting is disabled. Recognized links are normalized to HTTPS while their full path, query, and fragment are preserved because note access can depend on temporary share parameters. No private API, login cookie, custom signature, media download, or persisted note cache is used.

Still not supported:

- opaque non-Xiaohongshu short-link tokens that cannot be resolved client-side before Discourse oneboxes them
- non-Xiaohongshu inline links inside a sentence
- favorites, collections, channels, playlists, watch-later, and other multi-item containers

The safest input pattern is still a standalone bilibili URL on its own line, which matches how Discourse onebox-style embeds are normally triggered.

Pasted Xiaohongshu share text, with either plain or auto-linkified share URLs, is a narrow exception: the original paragraph is preserved and the content card is inserted after it, so surrounding text is never discarded.

## How it works

1. The cooked post is scanned on the client with Discourse's `decorateCookedElement` JS API.
2. Existing bilibili oneboxes are detected first, and standalone links, official iframe URLs, and pasted iframe code are handled as fallbacks.
3. The original cooked block is normally replaced with a poster card using the data already present in the cooked post; Xiaohongshu source paragraphs remain in place and receive a content card after them.
4. For ordinary bilibili videos, the component fetches official bilibili metadata in the background to fill in the correct title and preview image when the cooked post does not already contain them.
5. When the user clicks the card, the component resolves the correct bilibili page context, including `cid` when available.
6. If bilibili exposes a valid public embed context, the official external player iframe is inserted in place.
7. If a bilibili iframe loads but the user still gets trapped in bilibili's own guide layer, the footer offers an inline retry that reloads the player without autoplay.
8. In high-risk environments such as in-app browsers and WebViews, the component can automatically downgrade to opening bilibili instead of trapping the user in a broken third-party iframe.
9. For NetEase Cloud Music, the component converts supported URLs directly into the official outchain player iframe.
10. For QQ Music single-song cards, the component resolves the real track title on the client with QQ Music's official JSONP song-detail endpoint before the user clicks play.
11. For NetEase single-song cards, if the cooked post still only exposes a generic provider title in this no-rebuild architecture, the component falls back to loading the official no-autoplay outchain player immediately instead of showing an ID-only fake title.
12. For QQ Music, the component supports the official outchain player for songs with numeric IDs and the playsong page for songs with songmid identifiers. Playlists, albums, and toplists are rendered as styled cards with an open-on-QQ-Music fallback.
13. For Zhihu, the component upgrades supported question, answer, and article links into a unified card and falls back to opening the canonical Zhihu source page.
14. For Xiaohongshu and RedNote, the component recognizes official note paths plus known `xhslink.com` / `xhslink.cn` share forms, turns copied share text into a real title and description, and loads the official note page inline on demand while preserving the direct source link.
15. For content types without a stable official iframe path in this theme-component-only architecture, the component still upgrades the post into a unified media card and falls back to opening the canonical source page.

The component does not modify Discourse core and does not require a rebuild.

## Official endpoints used

- Player: `https://player.bilibili.com/player.html`
- Video metadata: `https://api.bilibili.com/x/web-interface/view`
- Bangumi metadata page source: `https://api.bilibili.com/pgc/view/web/season`
- Live activity player: `https://www.bilibili.com/blackboard/live/live-activity-player.html`
- NetEase Cloud Music outchain player: `https://music.163.com/outchain/player`
- QQ Music song detail JSONP: `https://i.y.qq.com/v8/fcg-bin/fcg_play_single_song.fcg`
- QQ Music outchain player: `https://i.y.qq.com/n2/m/outchain/player/index.html`
- QQ Music playsong: `https://i.y.qq.com/v8/playsong.html`
- Zhihu source pages: `https://www.zhihu.com` and `https://zhuanlan.zhihu.com`
- Xiaohongshu Share Open Platform documentation: `https://agora.xiaohongshu.com/doc`
- Xiaohongshu note source pages: `https://www.xiaohongshu.com`
- RedNote note source pages: `https://www.rednote.com`

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
- `enable_xiaohongshu_inline_page`
- `auto_open_on_high_risk_env`
- `button_label`

## Operational notes

- Default Discourse installs should not need `allowed_iframes` changes because this component injects the iframe after cooking, not from raw post HTML.
- If a site runs a custom reverse-proxy CSP that restricts `frame-src`, allow `https://player.bilibili.com`.
- If a site runs a strict custom script CSP that blocks dynamic third-party scripts, allow `https://api.bilibili.com` for the render-time bilibili metadata request.
- If experimental live embeds are enabled, allow `https://www.bilibili.com` in `frame-src`.
- If NetEase Cloud Music embeds are enabled by CSP, allow `https://music.163.com` in `frame-src`.
- If QQ Music embeds are enabled by CSP, allow `https://i.y.qq.com` in `frame-src`.
- Zhihu cards do not load Zhihu iframe or script resources; they only link to the canonical source page.
- Xiaohongshu and RedNote cards load the official user-supplied note URL in an iframe only after **展开笔记** is clicked. A strict custom `frame-src` policy must allow both the root and wildcard forms of `xiaohongshu.com`, `xhslink.com`, `xhslink.cn`, and `rednote.com` (for example, `https://xiaohongshu.com https://*.xiaohongshu.com`).
- Discourse Onebox is a separate server-side stage. The component does not require Onebox metadata; copied share text supplies the preview content, and `blocked_onebox_domains` can prevent redundant server fetches.
- If a supported media link cannot be parsed, the original cooked content is left untouched.

## Verification standard

1. Source of truth: GitHub `main` and the clean checkout at `/Users/ylsuen/Discourse/discourse-bilibili-inline-player`.
2. Health probe: `https://forum.rdfzer.com/`, `/srv/status`, and `/session/csrf` must continue returning success.
3. Contract checks: run `npm test`, validate `about.json` and `settings.yml`, confirm the intended `blocked_onebox_domains` policy, then confirm Discourse remote theme `119` reports the intended Git commit without `last_error_text`.
4. Deploy command: push a tested commit to GitHub, then update remote theme `119` through Discourse theme administration. Never add this component to `app.yml` or rebuild the container.
5. Dependency regression: verify one real cooked post for bilibili, NetEase, QQ Music, Zhihu, a full Xiaohongshu note URL, and an `xhslink.cn` short share; the Xiaohongshu card must show a real title/description and **展开笔记** must load the official page inline.
6. Backup and restore: the previous Git commit is the immutable backup; a fresh clone of the repository is the restore path.
7. Rollback: revert the release commit on GitHub and refresh remote theme `119`, then repeat health and provider regression checks.
8. Last verified release evidence is recorded in `PROJECT_STATE.md` and the forum operations report; live Discourse readback is authoritative.

## Suggested repository name

- `discourse-bilibili-inline-player`

## License

MIT
