# Project state

Last reviewed: 2026-08-22 (America/Los_Angeles)

## Current release

- Current release: `0.11.0` (built and validated locally; not yet pushed or installed on theme `119`)
- Last live-verified release: `0.9.0` on `forum.rdfzer.com`
- Production surface: Discourse remote theme component `119`
- Source branch: GitHub `main`
- Immediate rollback commit for `0.10.0`/`0.11.0`: `edec8fd` (`0.9.0`)
- `0.11.0` depends on the `expand-reader` service at `CF/services/expand-reader`, which is not deployed yet. Until it is live, `expand_reader_endpoint` resolves to nothing reachable, every reader fetch fails, and the archive cards fall back to their `0.10.0` URL-derived form. That fallback is the intended degraded state, not a bug.
- Earlier rollback commit: `83d81781c1c17f32305db5ab4516a0f3ba545f94` (`0.8.2`)
- Original pre-Xiaohongshu commit: `0f8b12426ec894c5b548029ff1fc6ddaff8dcd4c` (`0.7.0`)
- Exact installed commit must be read from `RemoteTheme.local_version`; live readback is authoritative over this file

## 0.11.0 scope

- Establish the operator-run `expand-reader` service as the single sanctioned way to expand a source that can be neither framed nor read by the browser. Decision recorded 2026-08-22 in `AGENTS.md`; adding a future source is an allowlist change in that service, not a per-provider fetch path here.
- Marxists Internet Archive documents now expand their full text in place on load, with no cover button and no click-to-open step.
- Reader output is treated as untrusted regardless of server-side sanitization: it is re-sanitized locally against an element and attribute allowlist, unrecognized tags are removed or unwrapped, `href`/`src` must be http(s) or a fragment, and outbound links are forced to `target="_blank" rel="noopener nofollow ugc"`.
- Fail-open throughout: a disabled setting, a non-HTTPS endpoint, a network failure, a non-OK response, or an empty fragment all leave the `0.10.0` source card exactly as it was.
- When the reader returns a real page title it replaces the URL-derived heading, so a Chinese archive card that read `毛泽东` becomes `矛盾论（一九三七年八月）`.
- Three new settings: `enable_expand_reader`, `expand_reader_endpoint` (HTTPS, or loopback for development), `expand_reader_height`.
- Live verification 2026-08-22 against the real initializer, real stylesheet, and a live local instance of the service: the GB2312 Chinese essay expanded to 27 175 characters over 7 headings; the ISO-8859-1 English chapter expanded to 31 385 characters over 70 paragraphs; the audio card correctly did not route through the reader; every pane reported 0 unsafe nodes, 0 inline handlers, 0 relative links, and 0 `class`/`style` attributes; 0 cover buttons remained on the page.
- The archive's Hegel table-of-contents page is the pathological case at ~175 000 characters and 1 514 links. The service caps output at 120 000 characters and the card shows a truncation notice with the original-source link; typical chapters are unaffected.

## 0.10.0 scope

- Add Marxists Internet Archive (`marxists.org`) support: documents across `/archive/`, `/reference/`, `/history/`, `/subject/`, `/glossary/`, `/ebooks/`, `/audiobooks/`, and all language sections including `/chinese/`; the archive's own audio and video files; and `.epub`/`.mobi`/`.azw3` as download cards.
- Measured constraint, 2026-08-22: `www.marxists.org` sends `X-Frame-Options: SAMEORIGIN`, `frame-ancestors 'self'`, and no `Access-Control-Allow-Origin`. Of the mirrors on the archive's own mirror page, `architexturez` returned 526, `wikis.cc` and `mirror.osqdu.org` timed out, `marxists.info` served an invalid certificate, `incn.su` redirected to a 404, `pages.dev` and `anu.edu.au` repeated `SAMEORIGIN`, and `marxists-malta.org` restricted CORS to its own hosts. No client-side path to the article body exists, so documents are URL-derived cards.
- Archive audio and video are attached to a native `<audio>`/`<video>` element, which is subject to neither the framing policy nor CORS. Verified live: `to-the-workers.mp3` reached `readyState 4` with a 166.05 s duration and no media error.
- Archive cards are always open. Documents render through a dedicated reading-card layout with no cover button and no click-to-open step; media auto-expands into its player without autoplay.
- Card fields come from the archive's URL grammar: section, author slug resolved against a curated 102-name English table and a 120-name Chinese table, year from a path segment such as `1848` or `1867-c1`, date from Chinese filenames such as `marxist.org-chinese-mao-19251201.htm`, and chapter from files such as `ch01.htm`. Opaque abbreviations such as `staterev` fall back to the resolved author instead of becoming a title.
- `.pdf` under `marxists.org` is rejected so the official `discourse-pdf-previews` component keeps that format.
- One new administrator switch, `enable_marxists_inline_media`, disables inline archive playback without touching the cards.
- No new network capability, server route, proxy, resolver, or Cloudflare resource is introduced; the component stays client-side only.

## 0.9.0 retained scope

- Reposition the repository as the supplemental preview/embed layer for formats not supported by Discourse core or official Discourse components.
- Add inline EPUB, legacy MOBI, and KF8/AZW3 attachment reading with TOC, previous/next navigation, progress, keyboard arrows, responsive layout, bounded in-browser fetching, and a permanent download fallback.
- Default every safe inline player and reader to visible/expanded, while automatic media expansion uses a non-autoplay URL. Retain one global administrator switch to restore click-to-expand behavior. Source-only cards remain cards.
- Vendor one pinned MIT Foliate JS ESM bundle at upstream commit `78914aef4466eb960965702401634c2cb348e9b1`; the bundle SHA-256 is `465114ea6de8f7c75c965f35b73e823d8980522a5b632dabcfd37782579720c6` and its PDF adapter is excluded.
- Keep PDF entirely under the installed official `discourse-pdf-previews` component; this repository rejects `.pdf` in its ebook parser.
- Treat book content as untrusted: remove active markup and dangerous URL attributes before rendition, preserve the forum's strict CSP, never send book bytes to a third party, and do not attempt DRM bypass.
- Keep existing provider parsing and fallbacks; apply the shared default-expanded behavior to safe inline providers.
- Live fix: read Discourse's lexically injected `settings` object so `theme_uploads.foliate_reader` resolves in production. The original `globalThis.settings` lookup failed before either the reader asset or attachment was requested.

## 0.8.2 retained scope

- Render actual Xiaohongshu/RedNote title and description from copied share text, including auto-linkified inline URLs, without deleting the source paragraphs.
- Support current `xhslink.cn` plus `xhslink.com` share forms and schemeless share text.
- Default Xiaohongshu/RedNote cards to the expanded official note page with browser-native lazy loading, while retaining the direct source link and an admin kill switch.
- Preserve complete path/query/fragment while normalizing recognized links to HTTPS, and reject lookalike hosts, credentials, custom ports, unsupported schemes, and unsupported paths.
- Add parser regression tests for all existing providers and move to the current one-argument Discourse `apiInitializer` signature.
- Do not add a private API, custom signature, login cookie, downloaded media, third-party resolver, or server-side dependency.

## Verification and rollback

The executable verification standard is in `README.md` and `AGENTS.md`. On 2026-08-12, GitHub CI passed; live post `13365/3` automatically opened its EPUB as *The Kite Runner*, exposed 29 TOC entries, reported 1% progress, and moved to chapter `ONE` after next-page navigation. Theme `119` reported matching local/remote source commits with no import error, and the forum root, `/srv/status`, and `/session/csrf` returned HTTP 200.

For `0.10.0`, local validation on 2026-08-22 passed the full gate: `npm test` at 35/35, `node --check`, `jq . about.json`, `ruby -e YAML.load_file`, `git diff --check`, and the pinned Foliate SHA-256 unchanged at `465114ea6de8f7c75c965f35b73e823d8980522a5b632dabcfd37782579720c6`. Archive rendering was verified in a browser against the real initializer and stylesheet: four archive cards rendered with `data-bilibili-loaded="1"`, zero cover play buttons, and a working native audio element. Live forum verification on theme `119` is still outstanding.

The immediate rollback anchor is `83d81781c1c17f32305db5ab4516a0f3ba545f94` (`0.8.2`): revert the `0.9.0` release commits, push GitHub `main`, refresh theme `119`, and repeat the public health and provider regression checks. The forum currently accepts EPUB uploads; MOBI and AZW3 ordinary attachment extensions remain site-setting prerequisites owned by the forum operator.

`0.9.0` changed no Cloudflare capability. `0.11.0` does: it depends on the new `expand-reader` Worker and its `reader.bdfz.net` custom domain, whose capability receipt lives in that project. No user-system path, mobile App contract, forum proxy, container, or database resource is changed by either release.
