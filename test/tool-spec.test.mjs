import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { EXPOSED_TOOL_NAME, PLAN_FIRST_SEND, TOOL_SCHEMA, executeSend, reviseSend } from "../plugin/lib/tool-spec.mjs";

const manifest = JSON.parse(readFileSync(new URL("../plugin/manifest.json", import.meta.url), "utf8"));

test("manifest declares the same tool the plugin registers", () => {
  assert.equal(manifest.id, "io.github.galaxyxieyu.plan-board");
  assert.deepEqual(manifest.contributes.agentTools[0].schema, TOOL_SCHEMA);
  assert.deepEqual(manifest.permissions.sort(), ["agent.tool.register", "renderer.extension"]);
  assert.deepEqual(manifest.rendererCallMethods.sort(), ["plan.approve", "plan.get", "plan.save"]);
});

test("exposed name follows plugin_<id>_<tool> and stays under 64 chars", () => {
  assert.equal(EXPOSED_TOOL_NAME, "plugin_io_github_galaxyxieyu_plan_board_plan");
  assert.ok(EXPOSED_TOOL_NAME.length < 64);
});

test("chip texts fit the host mark limit (32 KiB) and name the tool", () => {
  for (const text of [PLAN_FIRST_SEND, executeSend("pb-abc123defg", 3), reviseSend("pb-abc123defg", "x".repeat(2000))]) {
    assert.ok(new TextEncoder().encode(text).length < 32 * 1024);
    assert.ok(text.includes(EXPOSED_TOOL_NAME));
    assert.ok(text.startsWith("[Plan Board]"));
  }
  assert.match(executeSend("pb-abc123defg", 3), /r3/);
});

test("design schema advertises exactly the keys the validator accepts", async () => {
  const { TOOL_SCHEMA } = await import("../plugin/lib/tool-spec.mjs");
  const { validateDesign } = await import("../plugin/lib/plan-schema.mjs");
  const design = TOOL_SCHEMA.properties.design;
  assert.deepEqual(Object.keys(design.properties).sort(), ["colorSystem", "componentLibrary", "fontSystem", "framework", "styleKeywords"]);
  assert.equal(design.properties.framework.maxLength, 40);
  assert.throws(() => validateDesign({ framework: "x".repeat(41) }));
  assert.doesNotThrow(() => validateDesign({ framework: "html", fontSystem: { fontFamily: "system-ui", heading: { size: "32px", weight: 700 } } }));
});
