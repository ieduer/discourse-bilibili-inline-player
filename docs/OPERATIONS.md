# Operations authority

Last reviewed: 2026-08-29 (America/Los_Angeles)

This is the canonical operational procedure for the Extended Preview & Embed Suite.
`AGENTS.md` owns constraints, `PROJECT_STATE.md` owns the accepted version and next
action, and this file owns executable test, release, readback, restore, and rollback
steps. Live Discourse and GitHub readback override this document when they disagree.

## 0.15.2 BR-delimited copied-share candidate

The candidate fixes copied share rows that Discourse cooks into one paragraph
with `<br>` separators. Eligibility is evaluated per visual segment, not per
paragraph: each segment must contain exactly one anchor whose visible label and
`href` canonicalize to the same already-supported URL. The original paragraph
stays visible, every accepted segment consumes one `max_embeds_per_post` slot,
and generated cards are inserted after the paragraph in source order.

The paragraph remains `candidate.target` for compatibility with downstream
collector exclusion. Each accepted anchor is also marked, and the paragraph's
existing processed marker remains in place, so a second decoration of the same
element cannot duplicate a card. Code, lists, blockquotes, media, oneboxes,
non-URL labels, PDFs, and multiple anchors within one visual segment remain
untouched. Each card extracts metadata from a detached clone of its own visual
segment, so later rows cannot inherit the first row's copied title. Trailing
punctuation is normalized only in this visible-link path.

Local candidate gate: 71/71 tests plus JavaScript syntax, JSON, YAML, Foliate
hash, and diff checks pass. Production currently points to the first candidate
`f87398c` / `0.15.2`; its database readback is clean, but browser preview exposed
cross-row title reuse. Do not claim release until the corrected source passes
GitHub CI, guarded theme 119 refresh, exact database readback, and repeated
authenticated positive/negative browser controls.

`CAPABILITY_FIT=no-new-capability`. This is a leaf-only DOM detector change with
no Worker, endpoint, route, binding, storage, identity, data, CSP, or provider
contract change. Roll back theme 119 to exact source `7ddffd5`.

## Quick start

- Owner: `suen`.
- Lifecycle: `maintained-product`.
- Risk class: production forum leaf component with an external shared-service dependency.
- Data class: `none`; no account, cookie, database, student record, or persistent client cache.
- Canonical checkout: `/Users/ylsuen/Discourse/discourse-bilibili-inline-player`.
- Repository: `https://github.com/ieduer/discourse-bilibili-inline-player.git`, branch `main`.
- Runtime target: `forum.rdfzer.com`, Discourse remote theme component `119`.
- Reader dependencies: `https://reader.bdfz.net/read`, owned by `expand-reader`, and `https://wx.bdfz.net/api/ingest`, owned by `wx-ingest`; BDFZ posts frame their public `https://bdfz.net/posts/<article>/` source directly.
- Health: forum `/`, `/srv/status`; reader `/health`; `wx.bdfz.net/health`; then real cooked-post acceptance.
- Deploy prohibition: never rebuild Discourse, edit `app.yml`, or mutate forum content for a theme release.
- Release gate: clean exact source, tests, GitHub push, exact-SHA hosted-CI readback, guarded theme refresh, database readback, public health, and browser acceptance. A zero-step GitHub billing rejection may use only the bounded local-CI exception below; a real test failure may not.
- Installed runtime at the 2026-08-26 preflight: `0.12.0`, exact SHA
  `d8c43282ba19e7a0f4191e457f3b8573f00f60d9`, with no import or field error.
- Current accepted runtime is `0.15.1` implementation SHA
  `fea74ee121b4cf0f36a827782e4f21defbb6ea24`; immediate theme rollback is
  `6d9a3f902e82fe28cf0e50f7ff1cb0599e50a45c` (`0.15.0`).
  Immediate containment is `enable_wechat_inline=false`; the existing reader
  kill switch remains `enable_expand_reader=false`.

## 0.15.1 Douyin official-player portrait layout: accepted in production

The component recognizes only exact numeric public-video identities from the
ordinary Douyin video path, the user-page `modal_id` form, the historical
`iesdouyin.com/share/video/<ID>` form, and the official player URL. It builds the
documented public player URL locally and always retains the canonical direct
video link. It deliberately does not fetch metadata from the browser, because
the iframe-code API does not return an allow-origin header for the forum; it also
does not add a proxy, scraper, private endpoint, signature, cookie, media
download, or short-link resolver.

Authority reviewed on 2026-08-29:

- Douyin Open Platform documents the permission-free iframe-code endpoint and
  returns `https://open.douyin.com/player/video?vid=<ID>&autoplay=0`.
- GitHub implementations independently use the same player and extract
  `modal_id` as a numeric video identity. Direct `www.douyin.com` pages cannot
  be framed because the current response sends `X-Frame-Options: DENY` and a
  restrictive `frame-ancestors` policy.
- The supplied ID `7026333893087202567` returned a public 1920×1080 iframe
  payload. Real Chromium loaded the official player without a page error; a
  user click advanced it from `00:00` to `00:01 / 01:27` and exposed the title,
  author, counters, speed, share, and source controls. A separate security-SDK
  WebSocket diagnostic did not prevent playback.

The official player internally uses a fixed `324 × 672` portrait surface.
Implementation `fea74ee121b4cf0f36a827782e4f21defbb6ea24` replaces the incorrect
`16:9` loaded frame with that native canvas, centers a 326-pixel bordered card,
removes the iframe baseline gap, and proportionally scales the fixed iframe only
when the cooked post is narrower than 324 pixels. It passes `65/65` tests plus
syntax, JSON, YAML, vendored Foliate hash, and diff checks. Hosted Actions runs
`33294642222` and documentation run `33294899042` each used one real runner job
and every step passed.

Theme `119` readback showed version `0.15.1`, exact local/remote SHA parity,
`commits_behind=0`, 24 settings, and no import or field errors. The first guarded
Rails-runner refresh updated the database source and JavaScript but the active
web process kept the old compiled stylesheet asset `d3958660…`. Database SCSS
already contained the new width and scale rules. Running the standard Discourse
admin `Check for updates` / `Update to latest` path against the already-tested
newer commit rebuilt the active CSS asset as `4269ec9e…`; no app restart, server
configuration edit, or content mutation was used.

Logged-in Brave acceptance on topic `13472/3` proved one centered 326-pixel card
and exact `324 × 672` iframe at desktop and 390-pixel widths. At 320 pixels the
298.5625-pixel cooked width produced scale `0.915316`, kept the iframe's internal
viewport at `324 × 672`, and introduced no document overflow. A real play click
advanced to `1.926258 / 87.005011` seconds with `paused=false`. The canonical
source link remained visible. A strict forum CSP must allow
`https://open.douyin.com` in `frame-src`. Immediate rollback is source
`6d9a3f902e82fe28cf0e50f7ff1cb0599e50a45c` and a guarded theme refresh.

`CAPABILITY_FIT: no-new-capability` — no Cloudflare service, binding, route,
storage, data, identity, hub, monitoring, cost, or Companion contract changes.

## 0.14.2 WeChat pending-conversion transaction: accepted

The release treats HTTP `202` as a pending conversion instead of a terminal
failure, honors bounded server retry guidance, and retries at most two transient
request interruptions. The whole wait is capped at four minutes and 64 attempts;
every terminal path remains fail-open to the original source card.

Implementation SHA `a605fa0f317c7675d8db47c056f3bc59352edd00`
passed Node `24.18.0` local validation with `63/63` tests and hosted Actions run
`33178183580`. Guarded theme `119` refresh and independent database readback
showed exact local/remote SHA parity, `commits_behind=0`, version `0.14.2`, 24
settings, and no setting, field, or import errors. The paired Worker version
`252a0d7f-7b73-466e-aca1-38e1e92dbeea` is active at 100% through deployment
`a770a777-c716-4eee-8b51-b6a72ca73e87` with a two-minute lease and bounded image
mirroring. Logged-in browser acceptance passed topic `13456`, existing WeChat
control `13235/7`, PDF non-takeover `5970/77`, and BDFZ control `13449`.
Immediate theme rollback is `b834f530fce5e01863f0c07fc97572ed847a2c61`;
Worker rollback is `ded62088-877e-4d92-b0c8-5164efc69387@100` with R2 preserved.

## 0.14.1 BDFZ post transaction: accepted

The release adds only exact `https://bdfz.net/posts/<article>/` full-page
embeds. It defaults the lazy iframe to expanded, automatically scales its
800-pixel reading viewport down to the available forum width without crossing
a 70% readability floor, strips tracking query and
fragment state from the canonical URL, disables scripts/forms/same-origin
privileges through sandboxing, retains the original link, and provides an
accessible collapse/expand control. Archive and pagination URLs, nested paths,
lookalike hosts, credentials, custom ports, and non-web schemes remain untouched.

The feature has no Worker or server-side dependency. Implementation commit
`50c48df001ac5af93d7812ca5e4deb1893af8847` passed hosted Actions run
`33145461980`; guarded theme `119` refresh and independent database readback
showed exact local/remote SHA parity, `commits_behind=0`, version `0.14.1`, 24
settings, auto-scale enabled, and no import/field errors. Authenticated Brave
acceptance initially proved the width and toggle behavior, then the user-selected
route `13449/7` exposed a source-side SRI/CORS defect: BDFZ's two integrity-bearing
stylesheet links lacked `crossorigin`, so the opaque-origin sandbox correctly
rejected the theme. The iframe sandbox was not weakened. BDFZ Blog commit
`e017bbf` / Pages deployment `bc41eabd-32ef-4421-a993-25873bd7750f` added
anonymous CORS to both links. Authenticated Brave revalidation from the exact
user route to its embedded first post showed one default-open `180-qishike`
wrapper at auto scale 70%, computed background `#fcfcfc`, body `#444`, heading
`#222`, expected font/line-height, and a same-frame collapse/restore. WeChat
control `13235/7` retained one wrapper and PDF control `5970/77` retained zero
plugin takeovers. Immediate scale-only containment is
`enable_bdfz_post_auto_scale=false`; full feature containment is
`enable_bdfz_posts_inline=false`; the pre-scale rollback anchor is
`537a4d84f934bbf1a3474e556dd1ccbf879226fd` and pre-feature rollback is
`06cfb26b7ab8d53ae717b68891076c1f8e758000`.

## 0.13.0 WeChat transaction: accepted

Fresh database readback shows theme `119` already installed at the clean GitHub
head `d8c4328` / `0.12.0`, despite the earlier 2026-08-24 closeout recording it as
unreleased. Live database state is authoritative; preserve this drift receipt.

The 0.13.0 candidate adds exact WeChat public-article parsing, conversion through
the operator-owned `wx-ingest` Worker, a bounded five-minute client cache, strict
source/archive response matching, and an always-open sandboxed full-text archive.
The original cooked paragraph and source link remain present on success and every
failure. The paired Worker candidate allows browser ingestion and article framing
only for the exact production forum origin.

The Worker release gate is complete. Clean source
`36c24fdd58919e37be921d02edfb43387aa36457` produced immutable version
`ded62088-877e-4d92-b0c8-5164efc69387`, promoted through 0%, 10%, and 100% to
deployment `b526fa0a-af16-42ba-af71-86c955e7b011`. Exact allowed and denied CORS,
stored-article CSP, cached ingest without a duplicate recent row, health, and
ordinary archive probes passed. Theme implementation SHA
`b335cc5f0bd4c1df05e051a19772ec1b76d478f6` passed hosted CI run
`32952009174`, then guarded refresh and independent database readback confirmed
version `0.13.0`, 21 settings, `commits_behind=0`, and no setting, field, or
import errors. Logged-in browser acceptance on existing post `13235/7` proved
the source link, exact archive link, and a default-open iframe containing 1,405
characters of visible article text; PDF control `5970/77` retained its onebox
with zero reader or WeChat wrappers. No forum content was mutated.
Pre-change rollback is theme SHA `d8c4328` and Worker version
`72803e25-6f81-4965-aeea-aaf11cd7770e`.

Before any mutation, also read:

1. `/Users/ylsuen/CF/AGENTS.md`.
2. `/Users/ylsuen/CF/reports/operations/INDEX.md` and the resource index.
3. `/Users/ylsuen/CF/runbooks/bdfz_project_matrix_and_interdependencies.md`.
4. `/Users/ylsuen/CF/runbooks/shared_hub_synchronized_change_standard.md` when the reader contract or route changes.
5. This repository's `AGENTS.md` and `PROJECT_STATE.md`.
6. `/Users/ylsuen/CF/services/expand-reader/AGENTS.md`, `PROJECT_STATE.md`, and `README.md` for Worker operations.

## Resource map

| Resource | Authority and role | Source/derived | Restore or owner |
| --- | --- | --- | --- |
| Theme source | canonical checkout and GitHub `main` | source | fresh Git clone at exact SHA |
| Theme `119` | Discourse database plus compiled theme fields | derived runtime | refresh from GitHub; previous SHA is rollback |
| `settings.yml` | setting schema and defaults | source | Git |
| Effective settings | theme defaults plus `ThemeSetting` overrides | runtime state | read through `Theme#settings`; do not infer from YAML alone |
| Foliate bundle | `assets/vendor/foliate-reader.min.js` | pinned source asset | Git; SHA-256 verification below |
| Reader Worker | `/Users/ylsuen/CF/services/expand-reader` and its GitHub repository | external shared service | that project's operations authority |
| `reader.bdfz.net` | Worker custom domain and exact routing | external runtime | Cloudflare/shared-hub change procedure |
| WeChat archive Worker | `/Users/ylsuen/CF/sites/tools/wx-ingest` and `ieduer/wx-ingest` | external leaf service | that project's operations authority |
| `wx.bdfz.net` | existing Worker route, archive API, and script-free article pages | external runtime | immutable Worker version rollback; preserve R2 objects |
| `bdfz.net/posts/<article>/` | public, server-rendered source page framed directly by the theme | external public source | source link fallback; feature kill switch |
| `open.douyin.com/player/video` | official public Douyin iframe player; exact numeric video ID only | external public player | canonical `www.douyin.com/video/<ID>` fallback; revert theme commit |
| Tests | `test/url-parsers.test.mjs` | source | Git |

There are no external local build inputs, database exports, generated releases, or
secret files required by this repository. Discourse compiles the Git-backed fields.
The component sends only a canonical public source URL to the reader endpoint with
`credentials: "omit"` and `referrerPolicy: "no-referrer"`.

## 0.13.0 accepted production release

Release `0.13.0` was accepted in production on 2026-08-26 with these exact
authorities and receipts:

- implementation and JavaScript runtime source SHA:
  `b335cc5f0bd4c1df05e051a19772ec1b76d478f6`;
- GitHub Actions run `32952009174`: `success`;
- local gate: `58/58` tests passing, plus initializer, test, JSON, YAML,
  Foliate hash, and diff checks;
- theme `119` acceptance readback: `local_version` and `remote_version` both
  `b335cc5f0bd4c1df05e051a19772ec1b76d478f6`, `commits_behind=0`,
  `theme_version=0.13.0`, and no setting, field, or import error;
- WeChat Worker version `ded62088-877e-4d92-b0c8-5164efc69387`, active at
  100% through deployment `b526fa0a-af16-42ba-af71-86c955e7b011`;
- runtime-behavior rollback reference SHA:
  `d8c43282ba19e7a0f4191e457f3b8573f00f60d9` (`0.12.0`).

The commit that records this accepted state is documentation-only. Once that
follow-up commit is pushed and theme `119` is refreshed, Discourse will correctly
show its SHA as `RemoteTheme.local_version` and `remote_version`. That later theme
source-synchronization SHA is not a new JavaScript runtime: verify that its only
changes from `b335cc5f0bd4c1df05e051a19772ec1b76d478f6` are
`PROJECT_STATE.md` and `docs/OPERATIONS.md`; release `0.13.0` and the accepted runtime
implementation remain anchored to `b335cc5f0bd4c1df05e051a19772ec1b76d478f6`.

## Contract and settings

The component enhances cooked posts through `decorateCookedElement`. It must remain
fail-open: unsupported markup and any reader failure retain an original source link.
PDF remains owned by the official `discourse-pdf-previews` component.

Reader settings:

- `enable_expand_reader`: immediate containment switch; default `true`.
- `enable_zhihu_summary`: Zhihu summary-only switch; default `true`. It has no
  effect when the main reader switch or endpoint is unavailable.
- `expand_reader_endpoint`: operator-controlled HTTPS endpoint; default
  `https://reader.bdfz.net/read`; HTTP is accepted only for exact loopback development.
- `expand_reader_height`: bounded `240`–`1200`, default `560` pixels.
- `enable_marxists_inline_media`: native archive audio/video switch; independent of document text.

WeChat settings:

- `enable_wechat_inline`: immediate WeChat containment switch; default `true`.
- `wechat_ingest_endpoint`: must be exactly `https://wx.bdfz.net/api/ingest`.
- `wechat_embed_height`: bounded `360`–`1400`, default `720` pixels.

BDFZ post settings:

- `enable_bdfz_posts_inline`: immediate BDFZ post containment switch; default `true`.
- `enable_bdfz_post_auto_scale`: width-aware scale with a 70% readability floor;
  default `true`. Disable to restore the original 100% scale.
- `bdfz_post_embed_height`: bounded `480`–`1600`, default `900` pixels; mobile
  uses a viewport-relative height.

The WeChat client sends `POST /api/ingest` with only the canonical public article
URL, `credentials: "omit"`, and `referrerPolicy: "no-referrer"`. It accepts only
an exact semantic source identity and exact `https://wx.bdfz.net/<slug>` response.
HTTP `202` is polled with bounded server-guided delay; transient request
interruptions receive at most two retries. The request timeout is 90 seconds and
the complete pending wait is capped at four minutes and 64 attempts. Stored
articles remain script-free and sandboxed. CORS and article framing are limited
to `https://forum.rdfzer.com`; every terminal failure retains the original source.

The endpoint receives `GET /read?url=<CANONICAL_URL>` and must return JSON with
`ok=true` and an HTML string. The client treats every fragment as untrusted, performs
its own allowlist sanitization, and keeps the source card on malformed, empty, timed
out, or non-2xx responses. For Zhihu it additionally requires `provider=zhihu`,
`summaryOnly=true`, the exact parsed content type and numeric ID, and the exact
canonical echoed URL; images are rejected. The service owns target policy and SSRF
controls. This component must not add a second proxy or forward credentials.

## Preflight and ownership

Run from the canonical checkout before editing or releasing:

```bash
git status --short --branch
git rev-parse HEAD
git remote -v
git log -5 --oneline --decorate
git ls-remote origin refs/heads/main
```

Inspect `/Users/ylsuen/CF/reports/agent_action_log.jsonl` for active ownership of the
repository, GitHub remote, theme `119`, reader Worker, or exact reader route. Work in
an isolated clone when the canonical checkout is dirty or another agent owns adjacent
work. Never reset, clean, stash, or overwrite another task's files.

Before a release, record the expected Git SHA, currently installed SHA, rollback SHA,
theme parents, effective reader settings, Worker/route owner, and explicit exclusions.
Theme-only work excludes nginx, containers, post content, uploads, Redis, R2, CSP,
forum core, BDFZ source content/deployment, and Cloudflare resources.

## Local verification

Use the workspace Node authority when available. The suite has no install-time
dependencies.

```bash
npm test
node --check javascripts/discourse/api-initializers/init-bilibili-inline-player.js
node --check test/url-parsers.test.mjs
jq . about.json >/dev/null
ruby -e 'require "yaml"; YAML.load_file("settings.yml")'
git diff --check
sha256sum assets/vendor/foliate-reader.min.js
```

The Foliate SHA-256 must be:

```text
465114ea6de8f7c75c965f35b73e823d8980522a5b632dabcfd37782579720c6
```

Review the complete diff and verify every changed line is task-scoped. Confirm parser
negative controls for lookalike hosts, credentials, ports, PDF, code, navigation,
multiple anchors, non-URL anchor labels, and other providers. Confirm every existing
non-Zhihu provider has a positive fixture whose visible URL is not at the paragraph
start, and confirm Zhihu requires an exact summary-only response contract.
For Marxists cooked DOM, the required fixture set is:

- standalone control `1330/2`;
- conservative short-note plus `<br>` source link `2327/1`;
- PDF onebox non-takeover control `5970/77`;
- navigation non-takeover controls `6813/1` and `9340/1`.

## GitHub publication gate

Do not publish from a dirty tree. Commit only task-owned files, then push normally;
never force-push. Read back the exact remote SHA and require the validate workflow for
that SHA to complete successfully before touching theme `119`.

```bash
git status --short --branch
git show --stat --oneline HEAD
git push origin main
git ls-remote origin refs/heads/main
gh run list --repo ieduer/discourse-bilibili-inline-player --commit <EXACT_SHA> --limit 5
gh run view <RUN_ID> --repo ieduer/discourse-bilibili-inline-player
```

If GitHub creates a zero-step run whose own annotation says account billing or
Actions budget prevented the job from starting, that is unavailable infrastructure,
not a passing check. The user may authorize a bounded local-CI exception for the exact
pushed SHA. The exception requires: a clean isolated clone at that SHA; Node `24.18.0`;
every command in `Local verification`; an independent diff review with no blocker; the
zero-step run id and annotation recorded; and no other release-gate waiver. A job that
starts and fails, a missing workflow, or a source mismatch cannot use this exception.

## Theme 119 readback

This read-only Rails method uses the managed SSH host and prints no cookie, private
key, or secret. It is the authoritative version/settings/import-error readback:

```bash
ssh forum-backend "docker exec -i -u discourse app bash -lc 'cd /var/www/discourse && RAILS_ENV=production bundle exec rails runner -'" <<'RUBY'
require "json"
theme = Theme.include_relations.find(119)
remote = theme.remote_theme
values = theme.settings.to_h { |name, setting| [name.to_s, setting.value] }
puts JSON.pretty_generate(
  id: theme.id,
  name: theme.name,
  enabled: theme.enabled,
  component: theme.component,
  parent_theme_ids: theme.parent_theme_ids,
  remote_url: remote&.remote_url,
  branch: remote&.branch,
  local_version: remote&.local_version,
  remote_version: remote&.remote_version,
  commits_behind: remote&.commits_behind,
  theme_version: remote&.theme_version,
  last_error_text: remote&.last_error_text,
  settings_count: theme.settings.length,
  settings_field_error: theme.settings_field&.error,
  theme_field_error_count: ThemeField.where(theme_id: theme.id).where.not(error: [nil, ""]).count,
  reader_settings: values.slice(
    "enable_expand_reader",
    "enable_zhihu_summary",
    "expand_reader_endpoint",
    "expand_reader_height",
    "enable_marxists_inline_media",
    "enable_bdfz_posts_inline",
    "enable_bdfz_post_auto_scale",
    "bdfz_post_embed_height"
  )
)
RUBY
```

Stop if the theme ID/name/component/remote URL or parent list drifted, if any field or
import error is present, or if installed state cannot be tied to an exact Git SHA.

## Guarded theme refresh

The Discourse controller's established update path calls
`RemoteTheme#update_remote_version` and then `#update_from_remote`. The following
Rails command uses the same model API and adds an exact-SHA guard. Run it only after
GitHub CI succeeds or the exact zero-step exception above is fully recorded, replacing
the placeholder with the full 40-character SHA:

```bash
ssh forum-backend "docker exec -i -u discourse app bash -lc 'cd /var/www/discourse && RAILS_ENV=production bundle exec rails runner -'" <<'RUBY'
require "json"
expected = "<EXACT_40_CHARACTER_GITHUB_SHA>"
raise "replace expected SHA" unless expected.match?(/\A[0-9a-f]{40}\z/)
theme = Theme.find(119)
remote = theme.remote_theme or raise "theme 119 has no remote"
expected_remote = "https://github.com/ieduer/discourse-bilibili-inline-player"
raise "unexpected remote" unless remote.remote_url.to_s.delete_suffix(".git") == expected_remote
remote.update_remote_version
remote.reload
raise "remote SHA mismatch: #{remote.remote_version}" unless remote.remote_version == expected
remote.update_from_remote(raise_if_theme_save_fails: false, raise_on_import_error: true)
theme.reload
remote.reload
raise "installed SHA mismatch: #{remote.local_version}" unless remote.local_version == expected
raise "remote drift after update" unless remote.remote_version == expected && remote.commits_behind.to_i == 0
raise "theme import error: #{remote.last_error_text}" if remote.last_error_text.present?
puts JSON.generate(
  theme_id: theme.id,
  local_version: remote.local_version,
  remote_version: remote.remote_version,
  commits_behind: remote.commits_behind,
  theme_version: remote.theme_version,
  last_error_text: remote.last_error_text
)
RUBY
```

Do not rebuild/restart the app and do not edit the database directly. Re-run the full
readback immediately afterward; a successful method return alone is not acceptance.

## Production verification

Public HTTP probes:

```bash
curl -sS -o /dev/null -w '%{http_code}\n' https://forum.rdfzer.com/
curl -sS -o /dev/null -w '%{http_code}\n' https://forum.rdfzer.com/srv/status
curl -sS -o /dev/null -w '%{http_code}\n' https://forum.rdfzer.com/session/csrf
curl -sS https://reader.bdfz.net/health
curl -sS -o /dev/null -w '%{http_code}\n' https://bdfz.net/posts/180-qishike/
```

Then use an already authorized browser session; do not paste or log cookies. Hard
reload as needed and verify:

1. `1330/2`: exactly one Marxists wrapper, one loaded reader pane, and one open
   reader state.
2. `2327/1`: source paragraph remains and exactly one wrapper, one loaded reader
   pane, and one open reader state are present.
3. `5970/77`: its Marxists PDF remains the original PDF onebox and produces
   zero reader wrappers; document-onebox conversion remains covered by the
   executable parser/runtime fixture because no current public post provides a
   non-PDF Marxists onebox.
4. `9340/1`: non-standalone article links remain unchanged and produce zero
   wrappers.
5. `6813/1`: navigation links remain unchanged and produce zero wrappers.
6. For both accepted reader posts, the displayed and accessible title is the
   real source title with no `link clicked N times` telemetry; the reader pane
   has `role=region`, `tabindex=0`, an accessible label, and accepts keyboard
   focus.
7. Reader failure control: source card/link remains and an accessible error status appears.
8. Reduced-motion removes loading animation.
9. An exact-ID Zhihu question/answer/article renders a clearly labelled summary
   with a permanent original link; missing-secret, auth, rate, timeout, malformed,
   and no-match failures retain the original source card.
10. Representative bilibili, NetEase, QQ Music, Xiaohongshu, and Marxists links
    embedded after explanatory paragraph text render exactly one card while the
    original paragraph remains. Code, navigation/multiple anchors, non-URL labels,
    PDF, EPUB/MOBI/AZW3, and existing onebox controls remain unchanged.
11. An existing cooked post containing one exact BDFZ article URL produces one
    `bdfz-post` wrapper and a visible default-open iframe at the normalized
    `https://bdfz.net/posts/<article>/` URL. The frame is lazy, `no-referrer`, and
    sandboxed without scripts/forms/same-origin privileges. Its toggle starts at
    `收起正文` with `aria-expanded=true`, hides the frame and changes to `展开正文`,
    then restores the same frame without losing the permanent original link.
    The wrapper reports automatic scale mode; resizing the post recomputes a
    70%–100% scale and preserves the same iframe, while disabling the setting
    restores exactly 100%.
12. Start the canonical BDFZ style regression from
    `https://forum.rdfzer.com/t/topic/13449/7`, follow the topic to the embedded
    first post, and verify `180-qishike` uses the BDFZ font, background, body,
    heading, image, and spacing rules. Browser-default blue links on an otherwise
    black canvas mean the source CSS was rejected. Check anonymous CORS on every
    SRI stylesheet before considering any sandbox relaxation; `allow-same-origin`
    remains forbidden.

Accepted browser readback for `0.11.1` met items 1–6: `1330/2` and `2327/1`
each had one wrapper/pane/open state with a telemetry-free real title and a
focusable labelled region; `2327/1` retained its source paragraph; and
`5970/77`, `9340/1`, and `6813/1` each had zero takeover.

The browser readback is mandatory. Parser tests, CI, theme SHA equality, compiled CSS,
or screenshots alone do not prove cooked-post behavior.

## Restore and rollback

Restore source into an absent path:

```bash
component_restore_dir="/absolute/absent/discourse-bilibili-inline-player"
test ! -e "$component_restore_dir"
git clone https://github.com/ieduer/discourse-bilibili-inline-player.git "$component_restore_dir"
git -C "$component_restore_dir" rev-parse HEAD
git -C "$component_restore_dir" status --short
```

Verify the restored SHA against GitHub and the intended release, then run the complete
local gate. No archive hydrate, external source download, or data restore is required.

Contain only Zhihu summary rendering by setting `enable_zhihu_summary=false`, or
contain every reader-backed provider by setting `enable_expand_reader=false`, then
verify source cards/links remain; neither switch rolls back other provider code. A full
BDFZ post containment sets `enable_bdfz_posts_inline=false` and verifies the
canonical source link remains. A full
rollback from `0.11.1` uses
`7dd04ed3c2586bfe70ab3d6ff42efc8ed546f607` (`0.11.0`) as the known-good tree
reference, restores that runtime behavior through a reviewed Git revert commit,
pushes the resulting commit to `main`, requires successful CI, and runs the same
guarded theme refresh/readback with the new rollback commit. Never rewrite Git
history. Re-run forum health and all affected browser controls after rollback.

Worker or route failures are rolled back only through the `expand-reader` operations
authority and shared-hub receipt. Do not compensate by adding another proxy here.

## Monitoring, privacy, and closeout

- The component has no storage, identity, or direct logging path.
- Never log complete temporary Xiaohongshu share URLs, cookies, post bodies, or reader HTML.
- Aggregate topic/post IDs and DOM shape counts are sufficient for regression evidence.
- Monitor forum theme import errors, public health, reader health, and real browser behavior.
- Reader Worker request/error/cost monitoring belongs to its own operations authority.
- Closeout records exact source SHA, GitHub CI run, theme readback, effective settings,
  real-post results, Worker/route disposition, rollback anchor, dirty-tree state, and
  unresolved risks in the action log, project state, and required shared-hub receipt.

Point-in-time accepted production evidence on 2026-08-22: release `0.11.1` at
implementation SHA `cd8063bdc2f49ee00ee86dfeef0dc1b3105a1738`; successful Actions
run `32582774357`; theme `119` matching local/remote at that SHA, zero commits
behind, no import error; `50/50` tests passing; accepted browser controls as recorded
above; and reader Worker version `b5d4ccac-b84a-4c5c-8716-4d20f4691689` through
deployment `d5d9d4f0-9a6d-4a6c-b301-c185dfea6bc0`. Revalidate live state rather than
copying this receipt.
