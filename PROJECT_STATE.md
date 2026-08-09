# Project state

Last reviewed: 2026-08-08 (America/Los_Angeles)

## Current release

- Release target: `0.8.2`
- Production surface: Discourse remote theme component `119`
- Source branch: GitHub `main`
- Immediate rollback commit: `6f620053278e50116931af0681f92db0e8a6fb18` (`0.8.1`)
- Original pre-Xiaohongshu commit: `0f8b12426ec894c5b548029ff1fc6ddaff8dcd4c` (`0.7.0`)
- Exact installed commit must be read from `RemoteTheme.local_version`; live readback is authoritative over this file

## 0.8.2 scope

- Render actual Xiaohongshu/RedNote title and description from copied share text, including auto-linkified inline URLs, without deleting the source paragraphs.
- Support current `xhslink.cn` plus `xhslink.com` share forms and schemeless share text.
- Default Xiaohongshu/RedNote cards to the expanded official note page with browser-native lazy loading, while retaining the direct source link and an admin kill switch.
- Preserve complete path/query/fragment while normalizing recognized links to HTTPS, and reject lookalike hosts, credentials, custom ports, unsupported schemes, and unsupported paths.
- Add parser regression tests for all existing providers and move to the current one-argument Discourse `apiInitializer` signature.
- Do not add a private API, custom signature, login cookie, downloaded media, third-party resolver, or server-side dependency.

## Verification and rollback

The executable verification standard is in `README.md` and `AGENTS.md`. The rollback anchor is the pre-change commit above; revert the release commit, push GitHub `main`, refresh theme `119`, and repeat the public health and provider regression checks.

No Cloudflare capability, shared BDFZ hub contract, user-system path, mobile App contract, forum proxy, container, or database resource is changed by this release.
