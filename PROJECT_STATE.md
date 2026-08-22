# Project state

Last reviewed: 2026-08-22 (America/Los_Angeles)

## Accepted production state

- Last live-verified release: `0.11.0`, commit `7dd04ed3c2586bfe70ab3d6ff42efc8ed546f607`.
- Production surface: Discourse remote theme component `119` on `forum.rdfzer.com`.
- Point-in-time readback: `RemoteTheme.local_version` and `remote_version` both matched `7dd04ed`, `commits_behind=0`, `theme_version=0.11.0`, and `last_error_text=nil`.
- The component is enabled and attached to parent themes `[-2, -1, 1, 8, 14, 117, 118]`.
- The effective production reader settings were `enable_expand_reader=true`, `expand_reader_endpoint=https://reader.bdfz.net/read`, and `expand_reader_height=560`. They were defaults, not database overrides.
- The reader Worker, custom-domain routing, allowlist, monitoring, and Cloudflare rollback are owned by `/Users/ylsuen/CF/services/expand-reader`, not by this repository.
- Live state is authoritative over this file. Use the readback procedure in `docs/OPERATIONS.md` before any mutation.

## Current candidate

- Candidate release: `0.11.1`, validated in an isolated clone; not yet pushed to GitHub and not installed on theme `119` at this state snapshot.
- Objective: publish only after independent diff review, exact-SHA CI, and a controlled theme `119` refresh.
- Immediate candidate rollback anchor: production commit `7dd04ed3c2586bfe70ab3d6ff42efc8ed546f607` (`0.11.0`).
- Earlier full pre-reader rollback anchor: `edec8fdfc8e52b3df1f1c677bf392a3bcad17077` (`0.9.0`).

## 0.11.1 scope

- Recognize the real Discourse cooked shape used by topic/post `2327/1`: a short source note, a `<br>`, and one direct auto-linked Marxists URL whose displayed text is the URL. Preserve the note and add one reader card after it.
- Keep scope deliberately narrow: the paragraph's only element children must be one `<br>` followed by one direct `a.onebox`; the displayed and target Marxists URLs must canonicalize identically, the URL must end the paragraph, surrounding text is capped at 48 characters, and list, blockquote, media, onebox-container, and component-owned content are rejected.
- Explicitly leave pasted article navigation alone. Topic/post `9340/1` has six previous/contents/next links and `6813/1` has a three-link cluster; neither is a source-card candidate.
- Preserve existing standalone and onebox behavior. Public acceptance controls are standalone `1330/2` and onebox `5970/77`.
- Replace the unbounded lifetime reader cache with a 24-entry, five-minute LRU; ignore source fragments in the fetch key, keep endpoint identity in the key, and immediately evict failed responses.
- Re-sanitize reader images to same-source HTTPS only, force lazy loading and no-referrer, and scope anchor `id`, `name`, and fragment references uniquely per reader pane.
- Reject reader endpoints containing credentials and discard endpoint fragments.
- Add polite loading/error announcements, `aria-busy`, a keyboard-focusable labelled reader region, and reduced-motion behavior.
- Repair stale architecture, settings, verification, resource, and rollback documentation; `docs/OPERATIONS.md` is now the project-local operational authority.

## Verification evidence

- Candidate parser, cooked-DOM, cache, endpoint, sanitizer-policy, and legacy-provider suite: `49/49` passing with Node `26.7.0` in the isolated build environment.
- JavaScript syntax check passed for the initializer and test file.
- Regression fixtures encode the live shapes for `1330/2`, `2327/1`, `5970/77`, `6813/1`, and `9340/1` without storing post text.
- Production browser baseline before candidate deployment: `1330/2` produced one loaded Marxists reader; `2327/1` and `9340/1` produced zero wrappers under `0.11.0`.
- GitHub publication, exact-SHA CI, production theme refresh, and post-refresh browser acceptance remain outstanding for `0.11.1`.

## Residual risks and next action

- The test suite uses bounded DOM-shape fixtures rather than a full Discourse browser runtime. Real-post browser acceptance remains mandatory after theme refresh.
- The reader response is fetched as JSON in one operation; the Worker currently caps sanitized output, but the client has no independent streaming byte cap.
- GitHub Actions currently relies on the runner's Node installation and `actions/checkout@v4`; exact Node/action pinning remains a reproducibility-hardening follow-up.
- Next action: independent review, commit the isolated candidate, push exact SHA, require successful CI, refresh theme `119`, then verify `1330/2`, `2327/1`, `5970/77`, and the `9340/1` non-takeover control.

Exact test, release, readback, restore, and rollback commands are in `docs/OPERATIONS.md`.
