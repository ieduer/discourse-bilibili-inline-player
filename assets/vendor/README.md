# Vendored ebook renderer

`foliate-reader.min.js` is a single-file ESM bundle of
[foliate-js](https://github.com/johnfactotum/foliate-js), pinned to commit
`78914aef4466eb960965702401634c2cb348e9b1` (2026-08-12 readback).

- Upstream license: MIT; retained in `foliate-js-LICENSE`.
- Bundle SHA-256: `465114ea6de8f7c75c965f35b73e823d8980522a5b632dabcfd37782579720c6`.
- Included runtime formats for this component: EPUB, MOBI, and KF8/AZW3.
- PDF detection/import was removed from the bundle because PDF preview belongs
  to Discourse's official `discourse-pdf-previews` component.
- The bundle was produced from `view.js` with Rollup `inlineDynamicImports` and
  Terser. Runtime dependencies are bundled; `npm audit --omit=dev` reported zero
  vulnerabilities at build time.

The component additionally removes active markup before rendition, relies on
the forum's CSP to block untrusted book scripts, and never sends book bytes to
a third-party conversion service.
