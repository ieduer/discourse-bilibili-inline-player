# Project state

Last reviewed: 2026-08-24 (America/Los_Angeles)

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

- Accepted runtime/theme release: `0.11.1`.
- Accepted implementation and JavaScript runtime source SHA:
  `cd8063bdc2f49ee00ee86dfeef0dc1b3105a1738`.
- Production surface: Discourse remote theme component `119` on `forum.rdfzer.com`.
- Accepted release readback: theme `119` was refreshed exactly to `cd8063b`; its
  `RemoteTheme.local_version` and `remote_version` both matched the full accepted
  implementation SHA, `commits_behind=0`, `theme_version=0.11.1`, and
  `last_error_text=nil`.
- GitHub Actions run `32582774357` completed successfully for the accepted
  implementation.
- The component is enabled and attached to parent themes `[-2, -1, 1, 8, 14, 117, 118]`.
- The effective production reader settings were `enable_expand_reader=true`, `expand_reader_endpoint=https://reader.bdfz.net/read`, and `expand_reader_height=560`. They were defaults, not database overrides.
- The accepted reader Worker version is
  `b5d4ccac-b84a-4c5c-8716-4d20f4691689`, active through deployment
  `d5d9d4f0-9a6d-4a6c-b301-c185dfea6bc0`. Its custom-domain routing,
  allowlist, monitoring, and Cloudflare rollback are owned by
  `/Users/ylsuen/CF/services/expand-reader`, not by this repository.
- Runtime-behavior rollback reference:
  `7dd04ed3c2586bfe70ab3d6ff42efc8ed546f607` (`0.11.0`). Restore that tree
  through a reviewed revert commit on `main`; do not rewrite history or point
  the remote theme at an unreviewed detached revision.
- Live state is authoritative over this file. Use the readback procedure in `docs/OPERATIONS.md` before any mutation.

### Runtime SHA versus docs-only theme SHA

This accepted implementation was browser-verified while theme `119` pointed at
`cd8063bdc2f49ee00ee86dfeef0dc1b3105a1738`. The follow-up commit that records this
closeout changes only `PROJECT_STATE.md` and `docs/OPERATIONS.md`. After that docs-only
commit is pushed and refreshed, `RemoteTheme.local_version` and `remote_version` will
correctly report the docs-only commit SHA. That source-synchronization SHA must not be
reported as a new runtime release: the installed JavaScript and accepted runtime
authority remain release `0.11.1` at `cd8063bdc2f49ee00ee86dfeef0dc1b3105a1738`.

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
