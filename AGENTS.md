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

Safe inline players and readers are visible by default through `auto_expand_embeds`. Automatic expansion must never force media autoplay; click activation may continue to follow `autoplay_on_click`. Source-only content without a safe renderer remains a card.

## Change boundaries

- Do not add this repository to `/var/discourse/containers/app.yml`.
- Do not rebuild or restart Discourse for a theme update.
- Do not modify nginx, the forum front proxy, uploads, R2, Redis, CSP, or Discourse core for ordinary component work.
- Do not add private APIs, login cookies, custom request signatures, downloaded media, or third-party resolver services. Lazy-loading the user-supplied official note page in the default expanded state is the supported inline path for this component.
- Preserve Xiaohongshu/RedNote path, query, and fragment while normalizing recognized links to HTTPS; never log full share URLs that may contain temporary capability parameters.
- Treat Discourse Onebox as a separate server-side fetch path. The preview must remain complete from copied share text when those domains are blocked.
- Keep existing bilibili, NetEase, QQ Music, Zhihu, and Marxists Internet Archive behavior unless a regression test proves a change is needed.
- `marxists.org` sends `X-Frame-Options: SAMEORIGIN`, `frame-ancestors 'self'`, and no CORS header, and its reachable mirrors repeat that policy. It can never be framed or fetched by the browser. Its audio and video still play through native media elements, which need neither framing nor a cross-origin read.
- Content that cannot be expanded directly goes through the operator's `expand-reader` service and nowhere else. Decided 2026-08-22. Do not add a second proxy, a third-party resolver, a mirror rewrite, or a per-provider fetch path. Adding a host to the service allowlist is a separate operator decision about that site's terms; any later component support must reuse this single service contract.
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

After GitHub push, verify the remote branch commit. After updating theme `119`, read back `RemoteTheme.local_version`, `remote_version`, `theme_version`, and `last_error_text`, then smoke-test the public forum, representative provider posts, real EPUB/MOBI/AZW3 attachments, and a PDF non-takeover control. The exact live commit, verification evidence, and rollback anchor belong in the forum operations report and agent action log.

## Resource location and restore

All required source and test inputs are tracked in Git; there are no external local data sources or generated release artifacts. Restore into an absent destination with:

```bash
git clone https://github.com/ieduer/discourse-bilibili-inline-player.git <ABSENT_DESTINATION>
git -C <ABSENT_DESTINATION> rev-parse HEAD
git -C <ABSENT_DESTINATION> status --short
```

Verify the restored commit against the intended GitHub or live `RemoteTheme.local_version` SHA before testing or release. Retain the previous release commit as the rollback anchor.
