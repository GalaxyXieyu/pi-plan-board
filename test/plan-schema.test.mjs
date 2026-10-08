import { test } from "node:test";
import assert from "node:assert/strict";
import {
  validateSteps, validateDesign, validateSubmission, findCycle, wouldCreateCycle, topoLayers,
  executionBrief, toPlanV1, PLAN_STEPS_MAX, PLAN_SCHEMA,
} from "../plugin/lib/plan-schema.mjs";

const steps = [
  { id: "s1", title: "主题变量", dependsOn: [] },
  { id: "s2", title: "主题切换", detail: "按钮 + localStorage", dependsOn: ["s1"] },
  { id: "s3", title: "任务列表", dependsOn: [] },
  { id: "s4", title: "验收", dependsOn: ["s2", "s3"] },
];

test("valid steps normalize: trim, dedupe deps, drop empty detail", () => {
  const out = validateSteps([{ id: " s1 ", title: " A ", detail: "  ", dependsOn: [] }, { id: "s2", title: "B", dependsOn: ["s1", "s1"] }]);
  assert.deepEqual(out, [{ id: "s1", title: "A", dependsOn: [] }, { id: "s2", title: "B", dependsOn: ["s1"] }]);
});

test("missing dependsOn defaults to []", () => {
  assert.deepEqual(validateSteps([{ id: "a", title: "x" }]), [{ id: "a", title: "x", dependsOn: [] }]);
});

test("rejects bad ids, duplicates, unknown keys, unknown deps, self deps", () => {
  assert.throws(() => validateSteps([{ id: "-x", title: "a", dependsOn: [] }]), { code: "PLAN_STEPS_INVALID" });
  assert.throws(() => validateSteps([{ id: "a", title: "a" }, { id: "a", title: "b" }]), /duplicate/);
  assert.throws(() => validateSteps([{ id: "a", title: "a", owner: "me" }]), /unknown key/);
  assert.throws(() => validateSteps([{ id: "a", title: "a", dependsOn: ["zz"] }]), /unknown step/);
  assert.throws(() => validateSteps([{ id: "a", title: "a", dependsOn: ["a"] }]), /itself/);
  assert.throws(() => validateSteps([{ id: "a", title: "  " }]), /title/);
  assert.throws(() => validateSteps([{ id: "a", title: "x".repeat(201) }]), /title/);
});

test("limits: at most 24 steps", () => {
  const many = Array.from({ length: PLAN_STEPS_MAX + 1 }, (_, i) => ({ id: `s${i}`, title: "t" }));
  assert.throws(() => validateSteps(many), /at most 24/);
});

test("cycles are found and refused", () => {
  const cyc = [{ id: "a", title: "a", dependsOn: ["c"] }, { id: "b", title: "b", dependsOn: ["a"] }, { id: "c", title: "c", dependsOn: ["b"] }];
  assert.deepEqual(findCycle(cyc), ["a", "c", "b", "a"]);
  assert.throws(() => validateSteps(cyc), /cycle/);
  assert.equal(findCycle(steps), null);
});

test("wouldCreateCycle guards the dependency picker", () => {
  assert.equal(wouldCreateCycle(steps, "s1", "s4"), true); // s4 -> s2 -> s1
  assert.equal(wouldCreateCycle(steps, "s1", "s2"), true);
  assert.equal(wouldCreateCycle(steps, "s3", "s1"), false);
  assert.equal(wouldCreateCycle(steps, "s2", "s2"), true);
});

test("topoLayers orders dependencies first", () => {
  assert.deepEqual(topoLayers(steps), [["s1", "s3"], ["s2"], ["s4"]]);
});

test("design normalizes colors, keywords and font sizes; drops empties", () => {
  const d = validateDesign({
    framework: "html", componentLibrary: " ", styleKeywords: ["极简", "极简", ""],
    fontSystem: { fontFamily: "Inter", heading: { size: 28, weight: "700" } },
    colorSystem: { primary: ["#7c3aed"], text: [] },
  });
  assert.deepEqual(d, { framework: "html", styleKeywords: ["极简"], fontSystem: { fontFamily: "Inter", heading: { size: "28px", weight: 700 } }, colorSystem: { primary: ["#7C3AED"] } });
});

test("design rejects bad colors, weights, unknown keys", () => {
  assert.throws(() => validateDesign({ colorSystem: { primary: ["red"] } }), { code: "PLAN_DESIGN_INVALID" });
  assert.throws(() => validateDesign({ fontSystem: { fontFamily: "A", body: { size: "16px", weight: 450 } } }), /100\.\.900/);
  assert.throws(() => validateDesign({ fontSystem: { fontFamily: "A", body: { size: "8px", weight: 400 } } }), /10px/);
  assert.throws(() => validateDesign({ theme: "dark" }), /unknown key/);
  assert.throws(() => validateDesign({ colorSystem: { accent: ["#000000"] } }), /unknown key/);
});

test("submission needs a title and at least one step", () => {
  assert.throws(() => validateSubmission({ steps }), /title/);
  assert.throws(() => validateSubmission({ title: "x", steps: [] }), /at least one step/);
  const sub = validateSubmission({ title: " 番茄钟 ", summary: "## 目标", steps, design: {} });
  assert.equal(sub.title, "番茄钟");
  assert.equal(sub.design, undefined);
});

test("pi.plan/v1 view and execution brief", () => {
  const record = { id: "pb-abcdef", title: "T", summary: "", status: "approved", approvedRevision: 2, progress: { s1: { status: "completed", at: "x" } }, source: {}, createdAt: "c", updatedAt: "u",
    revisions: [{ revision: 1, steps: [steps[0]] }, { revision: 2, steps, design: { framework: "html" } }] };
  const v = toPlanV1(record, 2);
  assert.equal(v.schema, PLAN_SCHEMA);
  assert.equal(v.revision, 2);
  assert.equal(v.steps.length, 4);
  const brief = executionBrief(v);
  assert.match(brief, /Approved plan pb-abcdef r2/);
  assert.match(brief, /\[s1\] 主题变量 {2}\(status: completed\)/);
  assert.match(brief, /after: s2, s3/);
  assert.match(brief, /"framework": "html"/);
  assert.ok(brief.indexOf("[s1]") < brief.indexOf("[s2]") && brief.indexOf("[s3]") < brief.indexOf("[s4]"));
});
