# Project operating instructions

This repository is a Git-backed Discourse remote theme component. It is not a server plugin.

## Scope and architecture

- Canonical checkout: `/Users/ylsuen/Discourse/discourse-bilibili-inline-player`
- Remote source: `https://github.com/ieduer/discourse-bilibili-inline-player.git`
- Production Discourse component: theme `119` on `forum.rdfzer.com`
- Runtime: client-side cooked-post enhancement through `decorateCookedElement`
- Data class: `none`; the component has no database, account, cookie, or student-data path
- Cloudflare capability receipt: `no-new-capability`; this change does not use or modify Cloudflare resources

Keep the component fail-open: unsupported or failed URLs must leave the original cooked content or original source link available. Preserve `max_embeds_per_post` and do not add unbounded client fetches.

## Change boundaries

- Do not add this repository to `/var/discourse/containers/app.yml`.
- Do not rebuild or restart Discourse for a theme update.
- Do not modify nginx, the forum front proxy, uploads, R2, Redis, CSP, or Discourse core for ordinary component work.
- Do not add private APIs, login cookies, custom request signatures, downloaded media, or third-party resolver services. Lazy-loading the user-supplied official note page in the default expanded state is the supported inline path for this component.
- Preserve Xiaohongshu/RedNote path, query, and fragment while normalizing recognized links to HTTPS; never log full share URLs that may contain temporary capability parameters.
- Treat Discourse Onebox as a separate server-side fetch path. The preview must remain complete from copied share text when those domains are blocked.
- Keep existing bilibili, NetEase, QQ Music, and Zhihu behavior unless a regression test proves a change is needed.

## Required validation

Run before every release:

```bash
npm test
node --check javascripts/discourse/api-initializers/init-bilibili-inline-player.js
jq . about.json >/dev/null
ruby -e 'require "yaml"; YAML.load_file("settings.yml")'
git diff --check
```

After GitHub push, verify the remote branch commit. After updating theme `119`, read back `RemoteTheme.local_version`, `remote_version`, `theme_version`, and `last_error_text`, then smoke-test the public forum and representative provider posts. The exact live commit, verification evidence, and rollback anchor belong in the forum operations report and agent action log.

## Resource location and restore

All required source and test inputs are tracked in Git; there are no external local data sources or generated release artifacts. Restore into an absent destination with:

```bash
git clone https://github.com/ieduer/discourse-bilibili-inline-player.git <ABSENT_DESTINATION>
git -C <ABSENT_DESTINATION> rev-parse HEAD
git -C <ABSENT_DESTINATION> status --short
```

Verify the restored commit against the intended GitHub or live `RemoteTheme.local_version` SHA before testing or release. Retain the previous release commit as the rollback anchor.
