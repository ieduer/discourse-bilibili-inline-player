# Project operating instructions

This repository is a Git-backed Discourse remote theme component. It is not a server plugin. Its permanent role is to supplement preview/embed formats that are not already supported by Discourse core or an official Discourse component.

## Scope and architecture

- Canonical checkout: `/Users/ylsuen/Discourse/discourse-bilibili-inline-player`
- Remote source: `https://github.com/ieduer/discourse-bilibili-inline-player.git`
- Production Discourse component: theme `119` on `forum.rdfzer.com`
- Runtime: client-side cooked-post enhancement through `decorateCookedElement`
- Data class: `none`; the component has no database, account, cookie, or student-data path
- Cloudflare dependency: the component consumes the operator-owned `expand-reader` Worker at `reader.bdfz.net`; that service owns its capability receipt, allowlist, deployment, and route
- Official-support boundary: never take over a format already handled by Discourse core or an official component. PDF remains owned by `discourse-pdf-previews`.

Before work, read `PROJECT_STATE.md` for the accepted version and `docs/OPERATIONS.md` for the exact test, release, readback, restore, and rollback procedure.

Keep the component fail-open: unsupported or failed URLs must leave the original cooked content or original source link available. Preserve `max_embeds_per_post`, bound attachment size, and do not add unbounded client fetches.

Safe inline players and readers are visible by default through `auto_expand_embeds`. Automatic expansion must never force media autoplay; click activation may continue to follow `autoplay_on_click`. Zhihu uses only the bounded official-search summary contract when `enable_zhihu_summary` is enabled; source-only or failed content remains a card.

## Change boundaries

- Do not add this repository to `/var/discourse/containers/app.yml`.
- Do not rebuild or restart Discourse for a theme update.
- Do not modify nginx, the forum front proxy, uploads, R2, Redis, CSP, or Discourse core for ordinary component work.
- Do not add private APIs, login cookies, custom request signatures, downloaded media, or third-party resolver services. Xiaohongshu may lazy-load the user-supplied official note page; Zhihu must never be framed or scraped and may use only the exact-ID, summary-only `expand-reader` contract.
- Preserve Xiaohongshu/RedNote path, query, and fragment while normalizing recognized links to HTTPS; never log full share URLs that may contain temporary capability parameters.
- Treat Discourse Onebox as a separate server-side fetch path. The preview must remain complete from copied share text when those domains are blocked.
- Keep existing bilibili, NetEase, QQ Music, Xiaohongshu/RedNote, Zhihu, and Marxists Internet Archive behavior unless a regression test proves a change is needed. The common visible-URL detector must support every non-Zhihu provider at arbitrary position and may accept multiple copied share rows when each BR-delimited visual segment contains exactly one URL-labelled anchor. Each accepted anchor consumes one `max_embeds_per_post` slot. Keep the paragraph as the shared placement/downstream-exclusion target, mark both paragraph and anchor for re-decoration safety, preserve source order, and continue rejecting code, same-segment navigation/multiple anchors, non-URL anchor labels, PDF, lists, blockquotes, media, and existing oneboxes.
- Douyin support accepts only exact numeric video identities from `douyin.com/video/<ID>`, `douyin.com/user/<SEC_UID>?modal_id=<ID>`, `iesdouyin.com/share/video/<ID>`, or the official `open.douyin.com/player/video` URL. It must use only Douyin Open Platform's official player, retain the direct source link, and reject short links, notes, lookalike hosts, credentials, custom ports, duplicate IDs, scraping, media downloads, private APIs, signatures, and resolver services.
- WeChat public-article support accepts only exact `mp.weixin.qq.com/s` article forms. It calls only `https://wx.bdfz.net/api/ingest`, requires an exact semantic source identity and exact `wx.bdfz.net/<slug>` response, keeps the original WeChat link, and fails open when Tencent environment verification or conversion blocks the archive. Never send credentials, referrers, copied browser HTML, or cookies from the theme.
- BDFZ post support accepts only one exact article slug below `https://bdfz.net/posts/`. It frames that public server-rendered page directly, defaults to expanded and width-aware automatic scaling, keeps the original link, and exposes an accessible collapse/expand control. Keep the iframe lazy, no-referrer, and sandboxed without scripts, forms, or same-origin privileges; do not route BDFZ posts through `expand-reader`. Preserve the 70% readability floor and the administrator's 100%-scale fallback. The BDFZ source owns sandbox-compatible CSS delivery: its SRI stylesheet links must use anonymous CORS. Do not weaken the iframe sandbox to compensate for a source stylesheet regression.
- `marxists.org` sends `X-Frame-Options: SAMEORIGIN`, `frame-ancestors 'self'`, and no CORS header, and its reachable mirrors repeat that policy. It can never be framed or fetched by the browser. Its audio and video still play through native media elements, which need neither framing nor a cross-origin read.
- Content that cannot be expanded directly goes through the operator's `expand-reader` service and nowhere else. Decided 2026-08-22. Do not add a second proxy, a third-party resolver, or a mirror rewrite. Marxists direct reads remain on their exact fetch allowlist. Zhihu is a separate fixed-endpoint provider contract: exact numeric identifiers only, official-search summary only, exact type/ID/returned-URL match, and permanent original-source fallback. Never add Zhihu to the direct-fetch allowlist or describe the summary as arbitrary full text. Opaque Bilibili short-link resolution is limited to exact HTTPS `b23.tv` and `bili2233.cn` 5-12 character alphanumeric paths through same-origin `GET /resolve`; it stays behind the independent default-off `enable_short_link_resolution` circuit breaker, shares bounded in-flight requests, re-parses every returned canonical URL locally, preserves source text on failure, and must never be extended to `v.douyin.com` or another provider without a new reviewed capability decision.
- Treat every reader fragment as untrusted even though the service sanitizes it. Keep the local allowlist re-sanitization, keep the reader failure path falling back to the source card, and never loosen the forum CSP for it.
- Keep `expand_reader_endpoint` HTTPS-only apart from the loopback development affordance.
- Do not let `marxists.org` claim `.pdf`; that format stays with `discourse-pdf-previews`.
- Ebook bytes must remain in the user's browser. Do not add a converter service, upload API, DRM bypass, credential forwarding, or persistent book cache.
- Ebook content is untrusted active content: strip scripts, event handlers, nested frames/objects, dangerous URLs, and rely on the existing strict forum CSP. Never loosen forum `script-src` for a book.
- Keep Foliate pinned, self-hosted as a theme asset, license-retained, reproducibly hashed, and free of the PDF adapter.

## Required validation

Run before every release:

```bash
npm test
node --check javascripts/discourse/api-initializers/init-bilibili-inline-player.js
jq . about.json >/dev/null
ruby -e 'require "yaml"; YAML.load_file("settings.yml")'
git diff --check
sha256sum assets/vendor/foliate-reader.min.js
```

After GitHub push, verify the remote branch commit. Do not refresh theme `119` to a Zhihu-capable release until the required Worker secret and a tested Worker candidate are active. Do not refresh a WeChat-capable release until `wx-ingest` proves exact-origin CORS and exact-forum `frame-ancestors` on a zero-traffic candidate, then passes a cached article canary without creating a duplicate recent row. Do not enable opaque Bilibili short-link resolution until the exact resolver Worker version is at 100%, its previous version is retained as an immutable rollback, and real-host Origin/CORS/cache/negative controls have passed. After updating theme `119`, read back `RemoteTheme.local_version`, `remote_version`, `theme_version`, `last_error_text`, and the effective short-link switch, then smoke-test the public forum, representative provider posts, exact-ID Zhihu summary/failure fallback, WeChat success and conversion-failure fallback, BDFZ default-open plus collapse/expand behavior, visible-URL paragraph positives, code/navigation/PDF negatives, opaque Bilibili success and resolver-failure fallback, real EPUB/MOBI/AZW3 attachments, and a PDF non-takeover control. The exact live commit, verification evidence, and rollback anchor belong in the forum operations report and agent action log.

## Resource location and restore

All required source and test inputs are tracked in Git; there are no external local data sources or generated release artifacts. Restore into an absent destination with:

```bash
git clone https://github.com/ieduer/discourse-bilibili-inline-player.git <ABSENT_DESTINATION>
git -C <ABSENT_DESTINATION> rev-parse HEAD
git -C <ABSENT_DESTINATION> status --short
```

Verify the restored commit against the intended GitHub or live `RemoteTheme.local_version` SHA before testing or release. Retain the previous release commit as the rollback anchor.
