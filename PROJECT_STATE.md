# Project state

Last reviewed: 2026-08-12 (America/Los_Angeles)

## Current release

- Source candidate: `0.9.0`
- Production remains `0.8.2` until remote theme `119` is explicitly refreshed and verified
- Production surface: Discourse remote theme component `119`
- Source branch: GitHub `main`
- Immediate rollback commit: `83d81781c1c17f32305db5ab4516a0f3ba545f94` (`0.8.2`)
- Original pre-Xiaohongshu commit: `0f8b12426ec894c5b548029ff1fc6ddaff8dcd4c` (`0.7.0`)
- Exact installed commit must be read from `RemoteTheme.local_version`; live readback is authoritative over this file

## 0.9.0 scope

- Reposition the repository as the supplemental preview/embed layer for formats not supported by Discourse core or official Discourse components.
- Add inline EPUB, legacy MOBI, and KF8/AZW3 attachment reading with TOC, previous/next navigation, progress, keyboard arrows, responsive layout, bounded in-browser fetching, and a permanent download fallback.
- Default every safe inline player and reader to visible/expanded, while automatic media expansion uses a non-autoplay URL. Retain one global administrator switch to restore click-to-expand behavior. Source-only cards remain cards.
- Vendor one pinned MIT Foliate JS ESM bundle at upstream commit `78914aef4466eb960965702401634c2cb348e9b1`; the bundle SHA-256 is `465114ea6de8f7c75c965f35b73e823d8980522a5b632dabcfd37782579720c6` and its PDF adapter is excluded.
- Keep PDF entirely under the installed official `discourse-pdf-previews` component; this repository rejects `.pdf` in its ebook parser.
- Treat book content as untrusted: remove active markup and dangerous URL attributes before rendition, preserve the forum's strict CSP, never send book bytes to a third party, and do not attempt DRM bypass.
- Keep existing provider parsing and fallbacks; apply the shared default-expanded behavior to safe inline providers.

## 0.8.2 retained scope

- Render actual Xiaohongshu/RedNote title and description from copied share text, including auto-linkified inline URLs, without deleting the source paragraphs.
- Support current `xhslink.cn` plus `xhslink.com` share forms and schemeless share text.
- Default Xiaohongshu/RedNote cards to the expanded official note page with browser-native lazy loading, while retaining the direct source link and an admin kill switch.
- Preserve complete path/query/fragment while normalizing recognized links to HTTPS, and reject lookalike hosts, credentials, custom ports, unsupported schemes, and unsupported paths.
- Add parser regression tests for all existing providers and move to the current one-argument Discourse `apiInitializer` signature.
- Do not add a private API, custom signature, login cookie, downloaded media, third-party resolver, or server-side dependency.

## Verification and rollback

The executable verification standard is in `README.md` and `AGENTS.md`. The rollback anchor is the pre-change commit above; revert the release commit, push GitHub `main`, refresh theme `119`, and repeat the public health and provider regression checks.

No Cloudflare capability, shared BDFZ hub contract, user-system path, mobile App contract, forum proxy, container, or database resource is changed by this release.
