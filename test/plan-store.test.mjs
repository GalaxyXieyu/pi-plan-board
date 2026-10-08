import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, readdirSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createPlanStore } from "../plugin/lib/plan-store.mjs";

const steps = [
  { id: "s1", title: "主题变量", dependsOn: [] },
  { id: "s2", title: "主题切换", dependsOn: ["s1"] },
  { id: "s3", title: "验收", dependsOn: ["s2"] },
];
const fresh = (opts) => createPlanStore(mkdtempSync(join(tmpdir(), "pb-store-")), opts);

test("submit stores r1 awaiting approval and returns pi.plan/v1", async () => {
  const store = fresh();
  const plan = await store.submit({ title: "番茄钟", summary: "s", steps, design: { framework: "html" } }, { sessionId: "sess" });
  assert.match(plan.id, /^pb-[a-z0-9]{10}$/);
  assert.equal(plan.schema, "pi.plan/v1");
  assert.equal(plan.revision, 1);
  assert.equal(plan.status, "awaiting_approval");
  assert.deepEqual(plan.source, { sessionId: "sess" });
  const onDisk = JSON.parse(readFileSync(join(store.dir, `${plan.id}.json`), "utf8"));
  assert.equal(onDisk.revisions.length, 1);
  assert.deepEqual(store.list().map((e) => e.id), [plan.id]);
});

test("invalid submissions are refused with codes", async () => {
  const store = fresh();
  await assert.rejects(store.submit({ title: "x", steps: [{ id: "a", title: "a", dependsOn: ["a"] }] }), { code: "PLAN_STEPS_INVALID" });
  await assert.rejects(store.get("pb-nope00"), { code: "PLAN_NOT_FOUND" });
  await assert.rejects(store.get("../../etc/passwd"), { code: "PLAN_NOT_FOUND" });
});

test("edits become revisions; unchanged saves are no-ops", async () => {
  const store = fresh();
  const { id } = await store.submit({ title: "T", steps });
  const edited = steps.map((s) => (s.id === "s2" ? { ...s, title: "主题切换（带动画）" } : s));
  const r2 = await store.saveRevision(id, { steps: edited, design: {} });
  assert.equal(r2.revision, 2);
  const same = await store.saveRevision(id, { steps: edited, design: {} });
  assert.equal(same.revision, 2);
  const r3 = await store.saveRevision(id, { steps: edited, design: { colorSystem: { primary: ["#7c3aed"] } } });
  assert.equal(r3.revision, 3);
  assert.deepEqual(r3.design, { colorSystem: { primary: ["#7C3AED"] } });
  await assert.rejects(store.saveRevision(id, { steps: [] }), /at least one step/);
  await assert.rejects(store.saveRevision(id, { steps: [{ id: "a", title: "a", dependsOn: ["b"] }, { id: "b", title: "b", dependsOn: ["a"] }] }), /cycle/);
  const record = await store.record(id);
  assert.deepEqual(record.revisions.map((r) => r.revision), [1, 2, 3]);
});

test("concurrent saves serialize into consecutive revisions", async () => {
  const store = fresh();
  const { id } = await store.submit({ title: "T", steps });
  const a = steps.map((s) => ({ ...s, title: `${s.title} A` }));
  const b = steps.map((s) => ({ ...s, title: `${s.title} B` }));
  const [ra, rb] = await Promise.all([store.saveRevision(id, { steps: a }), store.saveRevision(id, { steps: b })]);
  assert.deepEqual([ra.revision, rb.revision], [2, 3]);
});

test("approve locks the revision; get refuses before approval; progress tracks to completion", async () => {
  const store = fresh();
  const { id } = await store.submit({ title: "T", steps });
  await assert.rejects(store.startExecution(id), { code: "PLAN_NOT_APPROVED" });
  await assert.rejects(store.progress(id, "s1", "completed"), { code: "PLAN_NOT_APPROVED" });
  const edited = [...steps, { id: "s4", title: "写 README", dependsOn: ["s3"] }];
  const approved = await store.approve(id, { steps: edited });
  assert.equal(approved.revision, 2);
  assert.equal(approved.status, "approved");
  assert.equal(approved.steps.length, 4);
  await assert.rejects(store.saveRevision(id, { steps }), { code: "PLAN_LOCKED" });
  const again = await store.approve(id);
  assert.equal(again.revision, 2);
  const exec = await store.startExecution(id);
  assert.equal(exec.status, "executing");
  await assert.rejects(store.progress(id, "zz", "completed"), { code: "PLAN_STEP_UNKNOWN" });
  await assert.rejects(store.progress(id, "s1", "done"), { code: "PLAN_INVALID" });
  let r = await store.progress(id, "s1", "in_progress");
  assert.equal(r.done, 0);
  for (const s of ["s1", "s2", "s3"]) r = await store.progress(id, s, "completed", "ok");
  assert.deepEqual(r.remaining, ["s4"]);
  assert.equal(r.plan.status, "executing");
  r = await store.progress(id, "s4", "skipped", "不需要");
  assert.equal(r.plan.status, "completed");
  assert.equal(r.done, 4);
  const v = await store.get(id);
  assert.equal(v.progress.s4.note, "不需要");
});

test("resubmitting with replaces supersedes the old plan", async () => {
  const store = fresh();
  const old = await store.submit({ title: "v1", steps });
  const next = await store.submit({ title: "v2", steps, replaces: old.id });
  const v = await store.get(old.id);
  assert.equal(v.status, "superseded");
  assert.equal(v.supersededBy, next.id);
  await assert.rejects(store.approve(old.id), { code: "PLAN_LOCKED" });
});

test("survives a restart: a new store over the same dir sees everything", async () => {
  const dir = mkdtempSync(join(tmpdir(), "pb-store-"));
  const a = createPlanStore(dir);
  const { id } = await a.submit({ title: "T", steps });
  await a.saveRevision(id, { steps: steps.slice(0, 2) });
  await a.approve(id);
  const b = createPlanStore(dir);
  const v = await b.get(id);
  assert.equal(v.status, "approved");
  assert.equal(v.revision, 2);
  assert.equal(v.steps.length, 2);
  assert.ok(!readdirSync(join(dir, "plans")).some((f) => f.endsWith(".tmp")));
});

test("prunes plans older than 30 days", async () => {
  let now = new Date("2026-01-01T00:00:00Z");
  const dir = mkdtempSync(join(tmpdir(), "pb-store-"));
  const store = createPlanStore(dir, { now: () => now });
  const old = await store.submit({ title: "old", steps });
  now = new Date("2026-03-01T00:00:00Z");
  const recent = await store.submit({ title: "new", steps });
  assert.equal(existsSync(join(store.dir, `${old.id}.json`)), false);
  assert.deepEqual(store.list().map((e) => e.id), [recent.id]);
});
