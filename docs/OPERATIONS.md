# Operations authority

Last reviewed: 2026-08-22 (America/Los_Angeles)

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
- Immediate rollback authority: the previous Git commit plus remote theme `119`; the reader kill switch is `enable_expand_reader=false`.

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

## Contract and settings

The component enhances cooked posts through `decorateCookedElement`. It must remain
fail-open: unsupported markup and any reader failure retain an original source link.
PDF remains owned by the official `discourse-pdf-previews` component.

Reader settings:

- `enable_expand_reader`: immediate containment switch; default `true`.
- `expand_reader_endpoint`: operator-controlled HTTPS endpoint; default
  `https://reader.bdfz.net/read`; HTTP is accepted only for exact loopback development.
- `expand_reader_height`: bounded `240`–`1200`, default `560` pixels.
- `enable_marxists_inline_media`: native archive audio/video switch; independent of document text.

The endpoint receives `GET /read?url=<CANONICAL_URL>` and must return JSON with
`ok=true` and an HTML string. The client treats every fragment as untrusted, performs
its own allowlist sanitization, and keeps the source card on malformed, empty, timed
out, or non-2xx responses. The service owns target allowlisting and upstream SSRF
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
negative controls for lookalike hosts, credentials, ports, PDF, and other providers.
For Marxists cooked DOM, the required fixture set is:

- standalone control `1330/2`;
- conservative short-note plus `<br>` source link `2327/1`;
- onebox `5970/77`;
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

1. `1330/2`: exactly one Marxists wrapper and one loaded reader pane.
2. `2327/1`: source paragraph remains, exactly one wrapper is inserted after it, and the reader loads.
3. `5970/77`: onebox becomes one reader card without duplication.
4. `9340/1`: six article-navigation links remain unchanged and produce zero wrappers.
5. Reader failure control: source card/link remains and an accessible error status appears.
6. Keyboard focus reaches the scroll region; reduced-motion removes loading animation.
7. Representative bilibili, NetEase, QQ Music, Zhihu, Xiaohongshu, EPUB, and PDF controls remain unchanged.

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

Contain a reader regression by setting `enable_expand_reader=false` in theme `119` and
verifying source cards/links remain; this does not roll back other provider code. A full
rollback is a normal `git revert <BAD_RELEASE_SHA>`, push to `main`, successful CI, and
the same guarded theme refresh/readback using the resulting rollback SHA. Never rewrite
Git history. Re-run forum health and all affected browser controls after rollback.

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

Point-in-time 2026-08-22 baseline before `0.11.1`: theme `119` was healthy at
`7dd04ed3c2586bfe70ab3d6ff42efc8ed546f607`, with matching local/remote versions,
zero commits behind, no import error, and effective reader settings `true`,
`https://reader.bdfz.net/read`, and `560`. Revalidate rather than copying this baseline.
