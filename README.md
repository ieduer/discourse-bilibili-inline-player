# Extended Preview & Embed Suite for Discourse

A Discourse theme component that fills preview and embed gaps left by Discourse core and official Discourse components. It currently adds bilibili, NetEase Cloud Music, QQ Music, WeChat public articles, BDFZ posts, Zhihu, Xiaohongshu/RedNote, plus inline EPUB, MOBI, and AZW3 reading without requiring a container rebuild.

## Ownership boundary

This repository is the supplemental layer for content that Discourse does not preview natively. It must not take over a format once Discourse core or an official Discourse component provides the required preview.

- Images and supported audio/video remain owned by Discourse core.
- PDF remains owned by the official [`discourse-pdf-previews`](https://github.com/discourse/discourse-pdf-previews) component and is deliberately rejected by this component's ebook parser.
- Unsupported attachments always retain a direct download fallback.
- Future providers and formats must pass the same official-support audit before being added here.

This repository is intentionally implemented as a remote theme component, not a server plugin:

- installable from a Git repository in `Admin -> Customize -> Themes`
- no `app.yml` change
- no `./launcher rebuild app`
- open-source and portable across self-hosted Discourse instances

## Support matrix

Inline ebook reading for Discourse attachments:

- `.epub` (EPUB)
- `.mobi` (Mobipocket, including legacy MOBI)
- `.azw3` (KF8/AZW3)

The reader is visible by default, fetches the attachment only in the user's browser, never uploads book bytes to a conversion service, and provides table-of-contents navigation, previous/next paging, reading progress, keyboard arrows, responsive mobile layout, and a permanent original-file link. It uses a pinned MIT-licensed Foliate JS bundle stored as a remote-theme asset. Active book markup is stripped before rendition and the forum CSP remains the final script-execution boundary.

Every safe inline player and reader is expanded by default. Automatic media expansion uses the provider's non-autoplay URL when available; the `auto_expand_embeds` administrator setting restores click-to-expand behavior when disabled. Exact `bdfz.net/posts/<article>/` links open the complete server-rendered article in a script-free frame by default, automatically fit the source page to the available forum width with a 70% readability floor, retain the original link, and provide an accessible `收起正文` / `展开正文` control. WeChat public-article links are converted through the operator-owned `wx.bdfz.net` archive and show its full text inline by default; pending conversions and brief request interruptions are retried within a four-minute cap, while the original WeChat link remains visible on every success or failure. Zhihu question, answer, and article URLs use a bounded summary card from the operator-owned reader service; unsupported or failed results remain source cards.

Marxists Internet Archive (`marxists.org`):

- documents under `/archive/`, `/reference/`, `/history/`, `/subject/`, `/glossary/`, `/ebooks/`, `/audiobooks/`, and every language section including `/chinese/`
- audio and video files hosted by the archive (`.mp3`, `.m4a`, `.oga`, `.ogg`, `.wav`, `.flac`, `.mp4`, `.m4v`, `.webm`, `.ogv`)
- `.epub`, `.mobi`, and `.azw3` archive files, as download cards only

Archive audio and video play inline in a native media element, expanded on load and never autoplaying. Archive documents render as an always-open reading card with no cover button and no click-to-open step, and their full text is expanded in place through the shared expand-reader service. Standalone URLs and Discourse oneboxes are supported. A paragraph whose only link is one visible supported URL is also recognized even when the URL is not on the first line or is surrounded by short explanatory text; the displayed URL and link target must canonicalize identically, and the original paragraph stays in place. Multi-link article navigation, linked prose with a non-URL label, list items, blockquotes, code, media, existing oneboxes, and component-owned content are deliberately left untouched. The section, the resolved author name, the work title, the chapter, and the date the archive encodes in its URLs are all visible immediately. `.pdf` under `marxists.org` is deliberately not claimed, because the official PDF Previews component owns that format.

### The expand-reader service

Some sources refuse to be framed **and** refuse cross-origin reads, which leaves a client-side component with nothing but a link. For those, the component calls a reading-view service the forum operator runs — [`expand-reader`](https://github.com/ieduer/expand-reader) — which fetches the page server-side and returns an already-sanitized reading fragment. The component re-sanitizes that fragment against its own allowlist before it touches the DOM, and any failure falls back silently to the URL-derived source card.

This is the single sanctioned path for content that cannot be expanded directly. It is configured with `enable_expand_reader`, provider-specific `enable_zhihu_summary`, `expand_reader_endpoint`, and `expand_reader_height`. The endpoint must be HTTPS and must be a service the operator controls. Marxists pages use the service's direct-read allowlist; Zhihu never joins that fetch allowlist and instead uses only the fixed official search API for an exact-ID summary.

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

Zhihu summary-card render (with permanent original-source fallback):

- `https://www.zhihu.com/question/<question_id>`
- `https://www.zhihu.com/question/<question_id>/answer/<answer_id>`
- `https://www.zhihu.com/answer/<answer_id>`
- `https://zhuanlan.zhihu.com/p/<article_id>`
- `https://www.zhihu.com/p/<article_id>`

WeChat public-article full-text render (with permanent original-source fallback):

- `https://mp.weixin.qq.com/s/<share_token>`
- `https://mp.weixin.qq.com/s?__biz=<id>&mid=<id>&idx=<id>...`

BDFZ post full-page render (default-open, auto-fit, script-free, and collapsible):

- `https://bdfz.net/posts/<article>/`

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

For the Marxists Internet Archive, `www.marxists.org` answers with `X-Frame-Options: SAMEORIGIN`, a `frame-ancestors 'self'` content security policy, and no `Access-Control-Allow-Origin` header. Every reachable mirror reviewed for this integration repeats the same effective restriction or is unavailable. The client component therefore never frames or fetches an archive document directly. The operator-owned `expand-reader` service performs the allowlisted server-side fetch and returns a sanitized fragment; this component independently re-sanitizes it, scopes fragment IDs, restricts images to the source host, and retains the canonical source link on every failure. Archive media files remain native `<audio>`/`<video>` sources.

For Zhihu, the component never frames or scrapes a source page. It sends an exact numeric question, answer, or article URL to the operator-owned `expand-reader` service. The service queries Zhihu's fixed official search endpoint and returns content only when type, ID, and returned canonical URL all match. The card explicitly labels this as a bounded official-search summary, retains the original link, rejects returned images, and falls back to the source card on every missing-secret, auth, rate, timeout, malformed, or no-match failure. It does not claim arbitrary full text.

For Xiaohongshu and RedNote, the official platform documentation reviewed on 2026-08-08 exposes no supported third-party oEmbed or embed widget. Version `0.8.2` builds a content-rich preview from the title and description included in the copied share text, including auto-linkified URLs embedded in a sentence, then defaults the card to an expanded, browser-native lazy-loaded official note page. The original cooked post text remains untouched, and the footer always retains a direct source link even when the general open-link setting is disabled. Recognized links are normalized to HTTPS while their full path, query, and fragment are preserved because note access can depend on temporary share parameters. No private API, login cookie, custom signature, media download, or persisted note cache is used.

Still not supported:

- opaque non-Xiaohongshu short-link tokens that cannot be resolved client-side before Discourse oneboxes them
- paragraphs with multiple links, a non-URL link label, code, navigation anchors, lists, blockquotes, media, or an existing onebox; a visible supported URL elsewhere in an otherwise eligible paragraph is recognized
- favorites, collections, channels, playlists, watch-later, and other multi-item containers
- DRM-encrypted EPUB/MOBI/AZW3 files
- PDF, because the official Discourse PDF Previews component owns that format
- the article body of a `marxists.org` page when `enable_expand_reader` is off or no reader endpoint is configured, because the archive forbids both framing and cross-origin reads
- FB2 and CBZ until the forum enables those upload extensions and they receive independent acceptance

Standalone supported URLs remain the simplest input. The component also recognizes an eligible paragraph whose only anchor visibly spells the supported URL, wherever that URL appears in the paragraph; it preserves the paragraph and inserts the card after it.

Pasted Xiaohongshu share text, with either plain or auto-linkified share URLs, is a narrow exception: the original paragraph is preserved and the content card is inserted after it, so surrounding text is never discarded.

## How it works

1. The cooked post is scanned on the client with Discourse's `decorateCookedElement` JS API.
2. Existing bilibili oneboxes are detected first, and standalone links, official iframe URLs, and pasted iframe code are handled as fallbacks.
3. The original cooked block is normally replaced with a poster card using the data already present in the cooked post; eligible visible-URL paragraphs remain in place and receive a content card after them.
4. For ordinary bilibili videos, the component fetches official bilibili metadata in the background to fill in the correct title and preview image when the cooked post does not already contain them.
5. When the user clicks the card, the component resolves the correct bilibili page context, including `cid` when available.
6. If bilibili exposes a valid public embed context, the official external player iframe is inserted in place.
7. If a bilibili iframe loads but the user still gets trapped in bilibili's own guide layer, the footer offers an inline retry that reloads the player without autoplay.
8. In high-risk environments such as in-app browsers and WebViews, the component can automatically downgrade to opening bilibili instead of trapping the user in a broken third-party iframe.
9. For NetEase Cloud Music, the component converts supported URLs directly into the official outchain player iframe.
10. For QQ Music single-song cards, the component resolves the real track title on the client with QQ Music's official JSONP song-detail endpoint before the user clicks play.
11. For NetEase single-song cards, if the cooked post still only exposes a generic provider title in this no-rebuild architecture, the component falls back to loading the official no-autoplay outchain player immediately instead of showing an ID-only fake title.
12. For QQ Music, the component supports the official outchain player for songs with numeric IDs and the playsong page for songs with songmid identifiers. Playlists, albums, and toplists are rendered as styled cards with an open-on-QQ-Music fallback.
13. For WeChat public articles, the component sends the exact semantic article identity to `wx.bdfz.net`, polls bounded HTTP `202` pending responses, retries brief request interruptions, requires a matching source response and exact archive slug, then embeds the script-free stored article while retaining both the original and archive links. Terminal or environment-verification-blocked conversions remain original-source cards.
14. For exact BDFZ article links, the component normalizes the public URL to `https://bdfz.net/posts/<article>/`, inserts the complete page in a lazy script-free frame, keeps the source link, and defaults an accessible collapse control to expanded.
15. For Zhihu, the component upgrades supported question, answer, and article links into an official-search summary card only after the reader response proves an exact type, ID, and canonical-URL match; every failure opens the canonical source page instead.
16. For Xiaohongshu and RedNote, the component recognizes official note paths plus known `xhslink.com` / `xhslink.cn` share forms, turns copied share text into a real title and description, and defaults to the lazy-loaded expanded official note page while preserving the direct source link.
17. For content types without a stable official iframe path in this theme-component-only architecture, the component still upgrades the post into a unified media card and falls back to opening the canonical source page.
18. For EPUB, MOBI, and AZW3 attachment links, the component downloads the bounded file in the current browser, removes active markup, and opens it in the local Foliate reader. Parse, size, CORS, or DRM failures leave the original download available.
19. For sources that can be neither framed nor read by the browser, the component asks the operator's expand-reader service for a sanitized reading fragment and renders it expanded in place, with no click step. Reader output is re-sanitized locally against an element and attribute allowlist, links are forced to `target="_blank" rel="noopener nofollow ugc"`, an over-long page is trimmed with a notice, and any failure leaves the source card untouched.
20. For the Marxists Internet Archive, the component reads the archive's own URL grammar. It resolves the section, the author slug against a curated English and Chinese name table, the year from a path segment such as `1848` or `1867-c1`, the date the Chinese archive encodes in filenames such as `marxist.org-chinese-mao-19251201.htm`, and the chapter from files such as `ch01.htm`. Opaque archive abbreviations such as `staterev` are not promoted to titles; the resolved author is used instead. Archive audio and video are attached to a native media element and expand without a click; documents render as an already-open reading card.

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
- WeChat source pages: `https://mp.weixin.qq.com/s...`
- WeChat archive ingestion and full-text pages: `https://wx.bdfz.net/api/ingest` and `https://wx.bdfz.net/<slug>`
- BDFZ post pages: `https://bdfz.net/posts/<article>/`
- Zhihu source pages: `https://www.zhihu.com` and `https://zhuanlan.zhihu.com`; the theme calls no Zhihu API directly
- Zhihu official search API, called only by `expand-reader`: `https://developer.zhihu.com/api/v1/content/zhihu_search`
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
- `auto_expand_embeds`
- `max_embeds_per_post`
- `show_open_link`
- `enable_experimental_live_embed`
- `enable_live_danmaku`
- `enable_xiaohongshu_inline_page`
- `enable_marxists_inline_media`
- `enable_expand_reader`
- `enable_zhihu_summary`
- `enable_wechat_inline`
- `enable_bdfz_posts_inline`
- `enable_bdfz_post_auto_scale`
- `bdfz_post_embed_height`
- `wechat_ingest_endpoint`
- `wechat_embed_height`
- `expand_reader_endpoint`
- `expand_reader_height`
- `enable_ebook_reader`
- `max_ebook_size_mb`
- `ebook_reader_height`
- `auto_open_on_high_risk_env`
- `button_label`

## Operational notes

- Default Discourse installs should not need `allowed_iframes` changes because this component injects the iframe after cooking, not from raw post HTML.
- If a site runs a custom reverse-proxy CSP that restricts `frame-src`, allow `https://player.bilibili.com`.
- If a site runs a strict custom script CSP that blocks dynamic third-party scripts, allow `https://api.bilibili.com` for the render-time bilibili metadata request.
- If experimental live embeds are enabled, allow `https://www.bilibili.com` in `frame-src`.
- If NetEase Cloud Music embeds are enabled by CSP, allow `https://music.163.com` in `frame-src`.
- If QQ Music embeds are enabled by CSP, allow `https://i.y.qq.com` in `frame-src`.
- WeChat conversion sends only the pasted public article URL to `https://wx.bdfz.net/api/ingest`, with credentials omitted and no referrer. The Worker allows CORS only from `https://forum.rdfzer.com`; stored article pages allow that same exact forum origin as their only external frame ancestor. A custom forum CSP with `connect-src` or `frame-src` must allow `https://wx.bdfz.net`.
- BDFZ post embeds accept only one exact article slug below `https://bdfz.net/posts/`; archive, pagination, nested, credential-bearing, custom-port, and lookalike-host URLs are rejected. The iframe is lazy, sends no referrer, and is sandboxed without scripts, forms, or same-origin privileges. Automatic scaling derives from the live container width, never exceeds 100%, and never drops below 70%; `enable_bdfz_post_auto_scale=false` restores the original 100% scale. The source site's SRI-protected stylesheets must opt into anonymous CORS so they remain valid in the opaque-origin sandbox; do not add `allow-same-origin` as a stylesheet workaround. A custom forum `frame-src` policy must allow `https://bdfz.net`.
- Zhihu cards load no Zhihu iframe, script, or image resource. Summary JSON comes only from the configured reader endpoint with credentials omitted and no-referrer; the original canonical link is always present.
- Xiaohongshu and RedNote cards default to an expanded lazy-loaded iframe for the official user-supplied note URL. A strict custom `frame-src` policy must allow both the root and wildcard forms of `xiaohongshu.com`, `xhslink.com`, `xhslink.cn`, and `rednote.com` (for example, `https://xiaohongshu.com https://*.xiaohongshu.com`).
- Marxists documents and Zhihu summary requests call the configured `expand_reader_endpoint` with credentials omitted and a no-referrer policy. If a custom CSP adds `connect-src`, it must allow the exact reader endpoint origin. Marxists images are upgraded to HTTPS, restricted to the source archive host, lazy-loaded, and forced to `referrerpolicy="no-referrer"`; Zhihu summary images are rejected.
- Reader and WeChat conversion results use separate 24-entry, five-minute in-memory LRUs. Source fragments share a reader fetch; repeated WeChat links share one conversion request. WeChat HTTP `202` responses are polled with bounded delay; at most two transient request interruptions are retried, and the entire wait is capped at four minutes and 64 attempts. Failed responses are evicted immediately so a transient outage does not persist for the SPA lifetime.
- Discourse Onebox is a separate server-side stage. The component does not require Onebox metadata; copied share text supplies the preview content, and `blocked_onebox_domains` can prevent redundant server fetches.
- If a supported media link cannot be parsed, the original cooked content is left untouched.
- Ebook parsing only applies to cooked Discourse attachment links ending in `.epub`, `.mobi`, or `.azw3`; arbitrary inline URLs and PDF attachments are not taken over.
- The reader bundle is self-hosted as a theme asset. No runtime CDN, resolver, converter, account, cookie, or API key is required.
- The default ebook inline limit is 50 MiB and can be configured from 1–100 MiB. The site upload limit is separate; a larger attachment remains downloadable.
- The current forum CSP blocks untrusted book scripts. Do not loosen `script-src` to include `blob:` or unsafe inline script for ebook compatibility.

## Verification standard

1. Source of truth: GitHub `main` and the clean checkout at `/Users/ylsuen/Discourse/discourse-bilibili-inline-player`.
2. Health probe: `https://forum.rdfzer.com/`, `/srv/status`, and `/session/csrf` must continue returning success.
3. Contract checks: run `npm test`, validate `about.json` and `settings.yml`, verify the vendored Foliate bundle hash/license, confirm the intended `blocked_onebox_domains` policy, then confirm Discourse remote theme `119` reports the intended Git commit without `last_error_text`.
4. Deploy command: push a tested commit to GitHub, then update remote theme `119` through Discourse theme administration. Never add this component to `app.yml` or rebuild the container.
5. Dependency regression: verify one real cooked post for bilibili, NetEase, QQ Music, a WeChat public article success plus conversion-failure fallback, an exact-ID Zhihu summary, a full Xiaohongshu note URL, and an `xhslink.cn` short share. Confirm the WeChat iframe uses an exact `wx.bdfz.net/<slug>` URL, displays the full archived article, and leaves both original and archive links available. For every non-Zhihu provider, also verify an eligible visible URL after explanatory text or a line break. Verify Marxists document readers at standalone topic/post `1330/2` and the preserved source paragraph at `2327/1`, while confirming the PDF onebox at `5970/77`, pasted navigation topics `6813/1` and `9340/1`, code, multi-link paragraphs, and non-URL anchor labels remain untouched. The executable suite separately covers a synthetic document onebox. Also open, page, and navigate the TOC of real EPUB, MOBI, and KF8/AZW3 attachments. Confirm a PDF attachment is still owned by the official PDF component.
6. Backup and restore: the previous Git commit is the immutable backup; a fresh clone of the repository is the restore path.
7. Rollback: revert the release commit on GitHub and refresh remote theme `119`, then repeat health and provider regression checks.
8. Last verified release evidence is recorded in `PROJECT_STATE.md` and the forum operations report; live Discourse readback is authoritative.

## Suggested repository name

- `discourse-bilibili-inline-player`

## License

MIT
