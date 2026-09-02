# Project state

Last reviewed: 2026-09-01 (America/Los_Angeles)

## 0.15.3 opaque Bilibili short-link candidate

- The theme recognizes only exact HTTPS `b23.tv` and `bili2233.cn` paths whose
  opaque token is 5-12 ASCII alphanumeric characters. `www`, query, fragment,
  credentials, ports, lookalikes, `v.douyin.com`, and every other provider are
  rejected. Existing directly parseable BV/av short paths remain synchronous.
- Resolution is behind `enable_short_link_resolution`, default `false`. The
  client derives `/resolve` from the existing operator-controlled
  `expand_reader_endpoint` origin, sends a credential-free/no-referrer GET, and
  accepts only contract version 1 plus a canonical URL that passes the existing
  local Bilibili video parser again. Failures preserve the original content.
- Identical URLs share a 24-entry, five-minute in-memory promise cache and a
  ten-second client timeout. Failed or invalid responses are evicted. Candidates
  consume `max_embeds_per_post` before resolution. Paragraph placement and
  downstream exclusion remain unchanged; anchor and paragraph are both marked
  while awaiting resolution, and same-paragraph results are inserted in source
  order after all pending results for that paragraph settle.
- Local candidate evidence: 79/79 Node tests plus initializer syntax, JSON,
  YAML, Foliate SHA-256, and diff checks pass. New tests cover the exact short
  grammar, default-off behavior, same-origin endpoint derivation, mixed copied
  text with NBSP and terminal punctuation, pre-resolution card budgeting,
  shared in-flight fetch, local response revalidation, bounded TTL/LRU behavior,
  failure eviction, and re-decoration blocking while a request is pending.
- Worker prerequisite is already accepted: clean resolver version
  `392e13be-70f7-464c-9c09-34e1a139eff6` is active at 100%, while preserved
  blocked Zhihu candidate `3edbcd17-da5e-4dc2-9de1-314609717bb7` is restored at
  0%. The resolver passed real-host override, 10%, 50%, and 100% acceptance.
- `CAPABILITY_FIT=no-new-cloudflare-capability`: the client reuses the accepted
  Worker, custom domain, Cache API, limiter, observability, and CSP origin. Theme
  containment is `enable_short_link_resolution=false`; full theme rollback is
  source `b3f9006a4d83bd74b1d8b76ca1f9e9edd2972b88`. Worker rollback restores
  `b5d4ccac-b84a-4c5c-8716-4d20f4691689@100%` plus the preserved Zhihu version
  at 0%.

## 0.15.2 BR-delimited copied-share rendering: accepted in production

- The candidate treats direct-child `<br>` elements in one cooked paragraph as
  visual-segment boundaries. Each segment may contribute one URL-labelled,
  locally supported anchor; multiple links in one segment remain rejected.
- `candidate.target` remains the paragraph so downstream ebook, iframe, and raw
  embed-text exclusion contracts do not change. A separate anchor marker gives
  each card its own identity, while the existing paragraph marker remains the
  re-decoration guard. Preserved-source cards use a moving insertion cursor so
  multiple cards retain source order after the paragraph. Card metadata is
  extracted from a detached clone of that card's visual segment, preventing a
  later row from inheriting the first row's copied title.
- Each accepted visual segment consumes one `max_embeds_per_post` slot. Visible
  anchor text and raw `href` receive the same bounded trailing-punctuation trim
  only in this detector; the shared URL parser remains strict.
- Local candidate evidence: 71/71 Node tests plus initializer syntax, JSON,
  YAML, Foliate SHA-256, and diff checks pass. New tests cover separate BR
  segments, same-segment multi-link rejection, card-budget counting, NBSP and
  terminal Chinese punctuation, stable insertion order, and same-element
  re-decoration without duplicate cards. An authenticated composer-preview
  probe exposed cross-row title reuse in the first published candidate; the
  segment-clone correction and a dedicated regression test now cover it.
- Corrected implementation `b3f9006a4d83bd74b1d8b76ca1f9e9edd2972b88`
  passed hosted Actions run `33594231330`, was installed into theme 119 with
  exact local/remote SHA parity, `commits_behind=0`, version `0.15.2`, 24
  settings, and no import/field errors. Authenticated composer preview rendered
  two BR-separated rows as two ordered cards with distinct canonical URLs and
  distinct row titles; the same-segment two-link negative remained untouched.
  The draft was discarded and reopened empty, so no forum post was created.
- `CAPABILITY_FIT=no-new-capability`: this is a leaf-only cooked-DOM detector
  correction. It adds no endpoint, Worker, binding, route, storage, identity,
  data, cost, or CSP surface. Immediate rollback is theme source `7ddffd5`.

## 0.15.1 Douyin official-player portrait layout: accepted in production

- Exact public-video identities are accepted from `douyin.com/video/<ID>`,
  `douyin.com/user/<SEC_UID>?modal_id=<ID>`, historical
  `iesdouyin.com/share/video/<ID>`, and Douyin Open Platform player URLs. Every
  accepted form normalizes to `https://www.douyin.com/video/<ID>` and embeds
  only `https://open.douyin.com/player/video?vid=<ID>&autoplay=<0|1>`.
- The implementation does not scrape Douyin, call a private API, resolve opaque
  short links, download media, send credentials, add a signature, or introduce
  a Worker/service dependency. Notes, lookalike hosts, credentials, custom
  ports, duplicate IDs, invalid IDs, and `v.douyin.com` links remain untouched.
- The official player internally fixes its portrait surface at `324 × 672`.
  Version `0.15.1` centers a 326-pixel bordered card, removes the iframe baseline
  gap, preserves the complete portrait canvas, and uses a `ResizeObserver` to
  scale the fixed iframe proportionally only when the cooked-post width is below
  324 pixels. No document-level horizontal overflow is introduced.
- Implementation commit `fea74ee121b4cf0f36a827782e4f21defbb6ea24`
  passes Node `26.7.0` validation with `65/65` parser, cooked-DOM, provider,
  layout-scaling, sandbox, retry, reader, and regression tests. JSON, YAML,
  syntax, vendored Foliate hash, and diff checks also pass. Hosted Actions run
  `33294642222` used one real runner job and every step succeeded; synchronized
  layout documentation commit `262c7983e4e9845b3576190d9d04da7a60f0f066`
  passed run `33294899042` the same way.
- `CAPABILITY_FIT: no-new-capability`: this is a leaf theme-component change
  using Douyin's existing public official iframe player. No Cloudflare runtime,
  binding, route, data, identity, monitoring, hub, or Companion contract changes.
- Guarded theme `119` refresh and independent database readback proved exact
  local/remote SHA parity, `commits_behind=0`, version `0.15.1`, 24 settings,
  and zero field/import errors. The first Rails-runner refresh updated source and
  JavaScript but the web process retained the old compiled stylesheet asset;
  the standard Discourse admin `Update to latest` path rebuilt the CSS asset from
  `d3958660…` to `4269ec9e…` without a restart or server/configuration change.
- Logged-in Brave acceptance on topic `13472/3` found one centered 326-pixel
  card and an exact `324 × 672` iframe at desktop and 390-pixel viewports, with
  `centerDelta=0`. At a 320-pixel viewport the cooked area was 298.5625 pixels,
  the iframe scaled to `0.915316`, the internal viewport remained `324 × 672`,
  and document `scrollWidth` remained exactly 320. A real click advanced the
  official video to `1.926258 / 87.005011` seconds with `paused=false`.
- The direct `www.douyin.com/video/<ID>` fallback remains present. No forum
  content/data, setting, CSP, server, Cloudflare resource, or other provider
  changed. Immediate theme rollback is the pre-layout SHA
  `6d9a3f902e82fe28cf0e50f7ff1cb0599e50a45c` (`0.15.0`).

## 0.14.2 WeChat pending-conversion resilience: accepted in production

- The WeChat client now treats HTTP `202` as a pending state, honors a bounded
  `Retry-After` or response retry delay, and retries transient request
  interruptions. The complete wait is capped at four minutes and 64 attempts;
  only two network failures are retried. All terminal failures still preserve
  the original source card and link.
- Node `24.18.0` validation passes `63/63` parser, retry, timeout, cooked-DOM,
  provider, sandbox, and regression tests, plus syntax, JSON, YAML, Foliate hash,
  and diff checks. Implementation SHA
  `a605fa0f317c7675d8db47c056f3bc59352edd00` passed hosted Actions run
  `33178183580` with one real job and every step successful.
- Guarded theme `119` refresh and independent database readback proved exact
  local/remote SHA parity, `commits_behind=0`, version `0.14.2`, 24 settings,
  and zero setting, field, or import errors.
- Logged-in browser acceptance on topic `13456` rendered one default-open iframe
  and archive link at `https://wx.bdfz.net/wx-9eab6673`, retained both original
  WeChat links, and showed no conversion fallback or error. Existing WeChat
  control `13235/7` still rendered its archive; PDF control `5970/77` produced
  zero WeChat frames; BDFZ control `13449` retained its one article frame.
- Paired Worker version `252a0d7f-7b73-466e-aca1-38e1e92dbeea` is active at
  100% through deployment `a770a777-c716-4eee-8b51-b6a72ca73e87`; its two-minute
  lease and bounded image-mirror work prevent long stale locks.
- Immediate theme rollback is the clean pre-change SHA
  `b834f530fce5e01863f0c07fc97572ed847a2c61`; immediate containment is
  `enable_wechat_inline=false`. Worker rollback is immutable version
  `ded62088-877e-4d92-b0c8-5164efc69387` at 100% with R2 data preserved.
- Capability fit: `no-new-capability`; no forum core, post, database, route,
  binding, schema, storage, identity, or new Cloudflare product was added.
- Archive disposition: `not_applicable`; Git contains the source and fixtures,
  and no non-reproducible local release artifact was created.

## 0.14.1 BDFZ post full-page release: accepted in production

- The release recognizes only one exact article slug at
  `bdfz.net/posts/<article>/`. It normalizes HTTP and `www` forms to the stable
  HTTPS canonical URL while rejecting the posts index, pagination, nested
  paths, credentials, custom ports, non-web schemes, and lookalike hosts.
- Every supported BDFZ article is lazy-loaded in a fixed-height, script-free
  sandboxed iframe and defaults to expanded. The footer permanently retains
  the canonical original link and exposes one `收起正文` / `展开正文` button with
  synchronized `aria-expanded` and `aria-controls` state. The admin kill switch
  is `enable_bdfz_posts_inline=false`; the height is bounded to 480–1600 pixels.
  Width-aware automatic scaling uses an 800-pixel reference viewport, stays
  within 70%–100%, and can be restored to original 100% rendering with
  `enable_bdfz_post_auto_scale=false`.
- Local validation passes `61/61` parser, cooked-link, provider,
  sandbox, default-open, collapse-state, and legacy regression tests, plus
  initializer/test syntax, JSON, YAML, Foliate hash, and diff checks. GitHub
  implementation commit `50c48df001ac5af93d7812ca5e4deb1893af8847`
  passed hosted Actions run `33145461980` with one real job and every step
  successful. Guarded theme `119` refresh and independent database readback
  then proved exact local/remote SHA parity, `commits_behind=0`, version
  `0.14.1`, 24 settings, auto-scale enabled, and zero import/field errors. Live
  `https://bdfz.net/posts/180-qishike/` returns the full server-rendered article
  with no `X-Frame-Options` or `frame-ancestors` restriction.
- The user-selected acceptance route `13449/7` exposed a source-side stylesheet
  defect: both BDFZ SRI CSS links lacked `crossorigin`, so the opaque-origin
  sandbox rejected the theme and exposed browser-default black text. The plugin
  sandbox remained unchanged. BDFZ Blog commit `e017bbf` / Pages deployment
  `bc41eabd-32ef-4421-a993-25873bd7750f` added anonymous CORS to both links.
  Authenticated Brave revalidation from that exact route to its embedded first
  post found one default-open `180-qishike` wrapper in `auto` mode at 70%; live
  computed styles were background `#fcfcfc`, body `#444`, heading `#222`, the
  expected font stack, and 27.6px line height. Collapse changed to `展开正文` /
  `aria-expanded=false`; restore preserved the same frame ID and auto scale.
  Earlier regression checks also retained one WeChat wrapper on `13235/7` and
  zero plugin takeover on PDF control `5970/77`.
- Source rollback anchor is the clean pre-change commit
  `06cfb26b7ab8d53ae717b68891076c1f8e758000`. No Worker, route, DNS, forum
  core, forum post, BDFZ source, or data mutation is part of the release.
- Capability fit: `no-new-capability`. This reuses the existing remote-theme
  iframe runtime and public `bdfz.net` pages; it adds no Cloudflare product,
  binding, route, storage, identity, shared-service contract, or cost model.
- Archive disposition: `not_applicable`; Git contains every source and test
  input, and the task creates no non-reproducible release artifact or backup.

## 0.13.0 WeChat full-text release: accepted in production

- The candidate recognizes only exact `mp.weixin.qq.com/s/<token>` and
  identity-bearing `/s?__biz=...&mid=...&idx=...` article URLs. It sends the
  public URL with credentials omitted and `no-referrer` to the exact
  `https://wx.bdfz.net/api/ingest` endpoint, requires a matching semantic
  source identity plus an exact `https://wx.bdfz.net/<slug>` response, and
  shares successful conversions through a 24-entry, five-minute LRU.
- Successful conversions render the script-free archived article in a
  sandboxed, lazy iframe by default. The original cooked paragraph and WeChat
  source link remain available, and the accepted archive URL is added as a
  separate link. Network, validation, environment-verification, or conversion
  failures remain fail-open source cards and are evicted from the cache so a
  later render can retry.
- The paired `wx-ingest` release adds CORS only for
  `https://forum.rdfzer.com` on `/api/ingest` and permits that same exact forum
  origin as the only external `frame-ancestor` of stored article pages. No
  route, binding, R2 schema, existing archive, forum core, or post data changes
  are part of the candidate.
- Local validation: theme tests `58/58` pass; initializer syntax passes. The
  paired Worker tests `33/33` and Worker syntax pass. Worker source
  `36c24fdd58919e37be921d02edfb43387aa36457` was promoted through 0%, 10%, and
  100%; immutable version `ded62088-877e-4d92-b0c8-5164efc69387` is now at
  100% in deployment `b526fa0a-af16-42ba-af71-86c955e7b011` after exact-origin
  CORS, denied-origin, stored-article CSP, cached-ingest, and health checks.
  Theme implementation commit `b335cc5f0bd4c1df05e051a19772ec1b76d478f6`
  passed GitHub Actions run `32952009174` and was installed into theme `119`.
  Database readback matched both local and remote versions at that SHA,
  `commits_behind=0`, version `0.13.0`, 21 settings, and zero setting, field, or
  import errors. Public forum and Worker health probes returned 200.
- Logged-in browser acceptance on existing post `13235/7` preserved the exact
  WeChat source link, added archive
  `https://wx.bdfz.net/26bdfz-helpeer-6f8ab6a7`, and rendered a default-open,
  lazy, no-referrer sandboxed iframe whose visible article body contained 1,405
  characters. PDF control `5970/77` retained its onebox with zero WeChat or
  reader wrappers. No forum post was created or changed for acceptance.
- Source rollback anchor is the clean pre-change theme commit
  `d8c43282ba19e7a0f4191e457f3b8573f00f60d9`. Worker rollback is immutable
  version `72803e25-6f81-4965-aeea-aaf11cd7770e` at 100%.
- Capability fit: `no-new-capability`. This reuses the existing Worker, R2
  archive, remote-theme runtime, and exact production domains; it adds no new
  Cloudflare product, binding, route, storage class, identity path, or cost
  model.
- Archive disposition: `not_applicable`; no source archive, export, backup
  payload, or historical snapshot is created.

## 0.12.0 candidate: blocked before coordinated release

- Candidate implementation is committed and pushed at
  `d329dc06f006330c970882db8edd94ae04a2bafa`; production theme `119` remains
  on the accepted `0.11.1` state below. GitHub Actions run `32727691071`
  completed successfully for that implementation. A later documentation-only
  closeout commit does not change this runtime implementation authority.
- Zhihu question, answer, and article URLs now default to an expanded,
  summary-only reader card. The consumer requires `provider=zhihu`,
  `summaryOnly=true`, an exact content type and numeric ID, and the exact
  canonical returned URL before rendering. It rejects returned images,
  re-sanitizes all HTML, explicitly labels the result as an official-search
  summary, and always keeps the original source link. Every failure remains
  fail-open to the source card.
- A common visible-URL paragraph detector now recognizes every existing
  non-Zhihu provider when its only anchor visibly spells the supported URL,
  even after explanatory text or a line break. The paragraph is preserved and
  the card is inserted after it. Code, navigation/multiple anchors, non-URL
  anchor labels, lists, blockquotes, media, existing oneboxes, PDF, and
  component-owned markup remain negative controls.
- Current local verification: `52/52` parser, cooked-DOM, reader-contract,
  sanitizer, cache, PDF, code, and legacy-provider tests pass; initializer and
  test syntax, JSON, YAML, vendored Foliate hash, and diff checks pass.
- Release gate: `expand-reader` 0.3.0 received its required secret through the
  interactive undeployed-version flow, and candidate
  `3edbcd17-da5e-4dc2-9de1-314609717bb7` is attached at 0%. The accepted Worker
  remains at 100% because exact-ID readback currently receives official Zhihu
  API rate-limit code `30001`. Only after an exact type+ID+URL summary succeeds
  and the Worker completes controlled promotion may this tested theme commit be
  refreshed into theme `119` and verified in a real forum page. No secret value
  belongs in this repository or its release procedure.
- Candidate source rollback anchor is the pre-change clean commit
  `b7a8ea0ed15a1bb8f4d45d10430d31e4b25b80ff`. Production behavior rollback
  remains the accepted `0.11.1` authority below until a 0.12.0 release is
  actually accepted.
- Archive disposition: `not_applicable`; the task creates no local source
  archive, backup payload, export, or historical snapshot. Git and the existing
  installed remote-theme revision are the rollback authorities.

## Accepted production state

- Accepted runtime/theme release before the 0.15.3 candidate: `0.15.2`.
- Accepted implementation and JavaScript runtime source SHA:
  `b3f9006a4d83bd74b1d8b76ca1f9e9edd2972b88`.
- Production surface: Discourse remote theme component `119` on `forum.rdfzer.com`.
- Accepted release readback: theme `119` was refreshed exactly to `b3f9006`; its
  `RemoteTheme.local_version` and `remote_version` both matched the full accepted
  implementation SHA, `commits_behind=0`, `theme_version=0.15.2`, and
  `last_error_text=nil`.
- GitHub Actions run `33594231330` completed successfully for the accepted
  implementation.
- The component is enabled and attached to parent themes `[-2, -1, 1, 8, 14, 117, 118]`.
- The effective production reader settings were `enable_expand_reader=true`, `expand_reader_endpoint=https://reader.bdfz.net/read`, and `expand_reader_height=560`. They were defaults, not database overrides.
- The accepted reader Worker version is
  `392e13be-70f7-464c-9c09-34e1a139eff6` at 100%, with blocked Zhihu candidate
  `3edbcd17-da5e-4dc2-9de1-314609717bb7` preserved at 0%. Its custom-domain routing,
  allowlist, monitoring, and Cloudflare rollback are owned by
  `/Users/ylsuen/CF/services/expand-reader`, not by this repository.
- Runtime-behavior rollback reference:
  `7ddffd589c58b0ebd3af2962cfaf3ee578576ba2` (`0.15.1`). Restore that tree
  through a reviewed revert commit on `main`; do not rewrite history or point
  the remote theme at an unreviewed detached revision.
- Live state is authoritative over this file. Use the readback procedure in `docs/OPERATIONS.md` before any mutation.

### Source authority during the 0.15.3 release

Theme `119` remains accepted at 0.15.2 source
`b3f9006a4d83bd74b1d8b76ca1f9e9edd2972b88` until the 0.15.3 implementation
passes hosted CI, guarded refresh, exact database readback, and authenticated
browser acceptance. The final closeout must record both the 0.15.3 runtime
implementation SHA and any later docs-only synchronization SHA without treating
documentation-only movement as a second JavaScript release.

## 0.11.1 scope

- Recognize the real Discourse cooked shape used by topic/post `2327/1`: a short source note, a `<br>`, and one direct auto-linked Marxists URL whose displayed text is the URL. Preserve the note and add one reader card after it.
- Keep scope deliberately narrow: the paragraph's only element children must be one `<br>` followed by one direct `a.onebox`; the displayed and target Marxists URLs must canonicalize identically, the URL must end the paragraph, surrounding text is capped at 48 characters, and list, blockquote, media, onebox-container, and component-owned content are rejected.
- Explicitly leave pasted article navigation alone. Topic/post `9340/1` has six previous/contents/next links and `6813/1` has a three-link cluster; neither is a source-card candidate.
- Preserve existing standalone and onebox behavior. Public acceptance uses the
  standalone document at `1330/2`; the only current Marxists onebox control,
  `5970/77`, is a PDF and must remain an unclaimed PDF onebox. A synthetic
  document-onebox fixture covers the positive parser path without pretending it
  is that public post.
- Replace the unbounded lifetime reader cache with a 24-entry, five-minute LRU; ignore source fragments in the fetch key, keep endpoint identity in the key, and immediately evict failed responses.
- Re-sanitize reader images to same-source HTTPS only, force lazy loading and no-referrer, and scope anchor `id`, `name`, and fragment references uniquely per reader pane.
- Reject reader endpoints containing credentials and discard endpoint fragments.
- Add polite loading/error announcements, `aria-busy`, a keyboard-focusable labelled reader region, and reduced-motion behavior.
- Repair stale architecture, settings, verification, resource, and rollback documentation; `docs/OPERATIONS.md` is now the project-local operational authority.

## Verification evidence

- Parser, cooked-DOM, cache, endpoint, sanitizer-policy, and legacy-provider suite:
  `50/50` passing with the workspace authority Node `24.18.0`.
- JavaScript syntax check passed for the initializer and test file.
- Regression fixtures encode the live shapes for `1330/2`, `2327/1`, the PDF
  non-takeover at `5970/77`, `6813/1`, and `9340/1` without storing post text;
  a separately labelled synthetic fixture covers a document onebox.
- Production browser acceptance at the implementation SHA:
  - `1330/2` and `2327/1` each produced exactly one wrapper, one reader pane,
    and one open reader state.
  - Both readers used the real source title without Discourse `link clicked N
    times` telemetry. Each pane exposed a labelled `region`, had `tabindex=0`,
    and accepted keyboard focus.
  - `2327/1` retained its original source paragraph beside the added reader.
  - The PDF onebox at `5970/77`, the non-standalone article links at `9340/1`,
    and the navigation links at `6813/1` each produced zero takeovers.
- GitHub publication, successful hosted CI, exact theme refresh/readback, Worker
  deployment readback, and real-browser acceptance are complete for `0.11.1`.

## Ongoing operational cautions

- The test suite uses bounded DOM-shape fixtures rather than a full Discourse
  browser runtime; every future runtime release still requires real-post browser
  acceptance after theme refresh.
- The reader response is fetched as JSON in one operation; the Worker currently caps sanitized output, but the client has no independent streaming byte cap.
- GitHub Actions currently relies on the runner's Node installation and `actions/checkout@v4`; exact Node/action pinning remains a reproducibility-hardening follow-up.
- No release or browser-acceptance action remains outstanding for `0.11.1`.
  Continue routine health, theme-import, Worker, and real-post monitoring.

Exact test, release, readback, restore, and rollback commands are in `docs/OPERATIONS.md`.
