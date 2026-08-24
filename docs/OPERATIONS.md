# Operations authority

Last reviewed: 2026-08-24 (America/Los_Angeles)

This is the canonical operational procedure for the Extended Preview & Embed Suite.
`AGENTS.md` owns constraints, `PROJECT_STATE.md` owns the accepted version and next
action, and this file owns executable test, release, readback, restore, and rollback
steps. Live Discourse and GitHub readback override this document when they disagree.

## Quick start

- Owner: `suen`.
- Lifecycle: `maintained-product`.
- Risk class: production forum leaf component with an external shared-service dependency.
- Data class: `none`; no account, cookie, database, student record, or persistent client cache.
- Canonical checkout: `/Users/ylsuen/Discourse/discourse-bilibili-inline-player`.
- Repository: `https://github.com/ieduer/discourse-bilibili-inline-player.git`, branch `main`.
- Runtime target: `forum.rdfzer.com`, Discourse remote theme component `119`.
- Reader dependency: `https://reader.bdfz.net/read`, owned by the `expand-reader` Worker.
- Health: forum `/`, `/srv/status`; reader `/health`; then real cooked-post acceptance.
- Deploy prohibition: never rebuild Discourse, edit `app.yml`, or mutate forum content for a theme release.
- Release gate: clean exact source, tests, GitHub push, exact-SHA hosted-CI readback, guarded theme refresh, database readback, public health, and browser acceptance. A zero-step GitHub billing rejection may use only the bounded local-CI exception below; a real test failure may not.
- Accepted runtime release: `0.11.1`; implementation/JavaScript source SHA
  `cd8063bdc2f49ee00ee86dfeef0dc1b3105a1738`.
- Runtime-behavior rollback reference:
  `7dd04ed3c2586bfe70ab3d6ff42efc8ed546f607` (`0.11.0`); restore its tree
  through a reviewed revert commit on `main`. The reader kill switch is
  `enable_expand_reader=false`.

## Pending 0.12.0 transaction

Production remains on the accepted 0.11.1 state below. The tested 0.12.0
source adds default, summary-only Zhihu cards backed by the operator-owned
`expand-reader` Worker and replaces provider-specific sentence handling with
one conservative visible-URL paragraph detector for all non-Zhihu providers.
The detector requires exactly one anchor whose visible label and target are the
same supported URL; it preserves the source paragraph and rejects code,
navigation/multiple anchors, non-URL labels, lists, blockquotes, media, existing
oneboxes, PDF, and component-owned markup.

The candidate implementation is committed and pushed at
`d329dc06f006330c970882db8edd94ae04a2bafa`; GitHub Actions run
`32727691071` completed successfully for that exact SHA. Any later closeout
commit that changes only project documentation does not change this runtime
implementation authority and must itself pass the publication gate before a
theme refresh.

The theme is not releasable ahead of the Worker. `expand-reader` 0.3.0 first
requires an authorized operator to enter `ZHIHU_ACCESS_SECRET` interactively,
then complete immutable 0% acceptance and controlled promotion. Never place the
secret value in this repository, a command argument, file, log, report, Git
object, or chat. Do not refresh theme `119` until the Worker candidate is active
and healthy. The pre-change candidate rollback anchor is
`b7a8ea0ed15a1bb8f4d45d10430d31e4b25b80ff`.

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
| Tests | `test/url-parsers.test.mjs` | source | Git |

There are no external local build inputs, database exports, generated releases, or
secret files required by this repository. Discourse compiles the Git-backed fields.
The component sends only a canonical public source URL to the reader endpoint with
`credentials: "omit"` and `referrerPolicy: "no-referrer"`.

## Accepted production release

Release `0.11.1` was accepted in production on 2026-08-22 with these exact
authorities and receipts:

- implementation and JavaScript runtime source SHA:
  `cd8063bdc2f49ee00ee86dfeef0dc1b3105a1738`;
- GitHub Actions run `32582774357`: `success`;
- local gate: `50/50` tests passing, plus initializer and test syntax checks;
- theme `119` acceptance readback: `local_version` and `remote_version` both
  `cd8063bdc2f49ee00ee86dfeef0dc1b3105a1738`, `commits_behind=0`,
  `theme_version=0.11.1`, and no import error;
- reader Worker version `b5d4ccac-b84a-4c5c-8716-4d20f4691689`, active through
  deployment `d5d9d4f0-9a6d-4a6c-b301-c185dfea6bc0`;
- runtime-behavior rollback reference SHA:
  `7dd04ed3c2586bfe70ab3d6ff42efc8ed546f607` (`0.11.0`).

The commit that records this accepted state is documentation-only. Once that
follow-up commit is pushed and theme `119` is refreshed, Discourse will correctly
show its SHA as `RemoteTheme.local_version` and `remote_version`. That later theme
source-synchronization SHA is not a new JavaScript runtime: verify that its only
changes from `cd8063bdc2f49ee00ee86dfeef0dc1b3105a1738` are
`PROJECT_STATE.md` and `docs/OPERATIONS.md`; release `0.11.1` and the accepted runtime
implementation remain anchored to `cd8063bdc2f49ee00ee86dfeef0dc1b3105a1738`.

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
forum core, and Cloudflare resources.

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
    "enable_marxists_inline_media"
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
