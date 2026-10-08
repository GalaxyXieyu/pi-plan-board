import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

// Emoji, pictographs, and the symbol glyphs that read as icons
// (arrows, geometric shapes, dingbats, misc technical, multiplication x).
const GLYPHS = /[\p{Extended_Pictographic}\u2190-\u21FF\u2300-\u23FF\u25A0-\u25FF\u2700-\u27BF\u2B00-\u2BFF\uFE0F\u00D7]/u;

function files(dir) {
  return readdirSync(dir).flatMap((name) => {
    if (name === "dist" || name === "node_modules") return [];
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : [path];
  });
}

test("plugin source and docs contain no emoji or pictographic glyphs", () => {
  const root = new URL("../plugin/", import.meta.url).pathname;
  const hits = [];
  for (const file of [...files(root), new URL("../README.md", import.meta.url).pathname]) {
    readFileSync(file, "utf8").split("\n").forEach((line, i) => {
      const m = GLYPHS.exec(line);
      if (m) hits.push(`${file.replace(root, "plugin/")}:${i + 1} ${JSON.stringify(m[0])}`);
    });
  }
  assert.deepEqual(hits, []);
});
