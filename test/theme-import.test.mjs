import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { test } from "node:test";

// Discourse ThemeField.opts_from_file_path treats every test/** file as JS,
// irrespective of its extension. BaseImporter reads it as UTF-8 text.
test("all files in the Discourse-imported test tree are valid UTF-8", () => {
  const root = new URL("./", import.meta.url);
  const decoder = new TextDecoder("utf-8", { fatal: true });
  function inspect(directory) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = new URL(entry.name + (entry.isDirectory() ? "/" : ""), directory);
      if (entry.isDirectory()) inspect(path);
      else assert.doesNotThrow(() => decoder.decode(readFileSync(path)), path.pathname);
    }
  }
  inspect(root);
});
