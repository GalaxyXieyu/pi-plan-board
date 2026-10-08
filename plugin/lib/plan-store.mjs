/**
 * Per-plan JSON storage in the plugin's own data directory.
 *
 *   <dataDir>/plans/<planId>.json   one record per plan, every revision kept
 *   <dataDir>/plans/index.json      newest-first ids for pruning
 *
 * Writes are atomic (temp file + rename) and serialized per plan, so the
 * renderer's autosave, an approval and the model's progress reports never
 * interleave.
 */
import { mkdirSync, readFileSync, renameSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import {
  PLAN_SCHEMA, PlanError, STEP_STATUSES, designEqual, isStepId, newPlanId, stepsEqual,
  toPlanV1, validateDesign, validateSteps, validateSubmission, isDesignEmpty,
} from "./plan-schema.mjs";

export const KEEP_PLANS = 200;
export const KEEP_DAYS = 30;

export function createPlanStore(dataDir, { now = () => new Date(), random = Math.random } = {}) {
  const dir = join(dataDir, "plans");
  mkdirSync(dir, { recursive: true });
  const locks = new Map();
  const file = (id) => {
    if (typeof id !== "string" || !/^pb-[a-z0-9]{6,32}$/.test(id)) throw new PlanError("PLAN_NOT_FOUND", "planId", `bad plan id ${JSON.stringify(id)}`);
    return join(dir, `${id}.json`);
  };
  const iso = () => now().toISOString();

  function read(id) {
    const path = file(id);
    if (!existsSync(path)) throw new PlanError("PLAN_NOT_FOUND", "planId", `no plan ${id}`);
    return JSON.parse(readFileSync(path, "utf8"));
  }
  function write(record) {
    const path = file(record.id);
    const tmp = `${path}.${process.pid}.${Date.now()}.tmp`;
    writeFileSync(tmp, JSON.stringify(record, null, 2), "utf8");
    renameSync(tmp, path);
  }
  function readIndex() {
    try { const v = JSON.parse(readFileSync(join(dir, "index.json"), "utf8")); return Array.isArray(v.plans) ? v.plans : []; } catch { return []; }
  }
  function writeIndex(plans) {
    const tmp = join(dir, `index.json.${process.pid}.tmp`);
    writeFileSync(tmp, JSON.stringify({ schema: "plan-board/index@1", plans }, null, 2), "utf8");
    renameSync(tmp, join(dir, "index.json"));
  }
  /** Run `fn` with the plan locked; returns its result. */
  function locked(id, fn) {
    const prev = locks.get(id) || Promise.resolve();
    const next = prev.then(() => fn(), () => fn());
    locks.set(id, next.catch(() => {}));
    return next;
  }
  function prune() {
    const plans = readIndex();
    const cutoff = now().getTime() - KEEP_DAYS * 86400_000;
    const keep = [];
    for (const [i, entry] of plans.entries()) {
      const old = Date.parse(entry.createdAt) < cutoff;
      if (i < KEEP_PLANS && !old) keep.push(entry);
      else rmSync(join(dir, `${entry.id}.json`), { force: true });
    }
    if (keep.length !== plans.length) writeIndex(keep);
  }

  return {
    dir,
    /** Create a plan from a model submission (validated here). */
    async submit(input, source = {}) {
      const sub = validateSubmission(input);
      const id = newPlanId(random);
      const at = iso();
      const record = {
        schema: PLAN_SCHEMA, id, title: sub.title, summary: sub.summary, status: "awaiting_approval",
        revisions: [{ revision: 1, steps: sub.steps, ...(sub.design ? { design: sub.design } : {}), by: "model", at }],
        progress: {}, source, createdAt: at, updatedAt: at,
        ...(sub.replaces ? { replaces: sub.replaces } : {}),
      };
      write(record);
      writeIndex([{ id, createdAt: at }, ...readIndex().filter((e) => e.id !== id)]);
      if (sub.replaces) {
        await locked(sub.replaces, () => {
          try {
            const old = read(sub.replaces);
            if (old.status === "awaiting_approval") { old.status = "superseded"; old.supersededBy = id; old.updatedAt = at; write(old); }
          } catch { /* unknown or pruned plan: nothing to supersede */ }
        });
      }
      prune();
      return toPlanV1(record);
    },
    async get(id) {
      return toPlanV1(read(id));
    },
    async record(id) {
      return read(id);
    },
    /** Save the user's edit as a new revision (no-op when unchanged). */
    async saveRevision(id, { steps, design }, by = "user") {
      return locked(id, () => {
        const record = read(id);
        if (record.status !== "awaiting_approval") throw new PlanError("PLAN_LOCKED", "status", `plan is ${record.status}`);
        const nextSteps = validateSteps(steps);
        if (!nextSteps.length) throw new PlanError("PLAN_STEPS_INVALID", "steps", "a plan needs at least one step");
        const nextDesign = design === undefined || design === null ? {} : validateDesign(design);
        const last = record.revisions[record.revisions.length - 1];
        if (stepsEqual(last.steps, nextSteps) && designEqual(last.design, nextDesign)) return toPlanV1(record);
        const at = iso();
        record.revisions.push({ revision: last.revision + 1, steps: nextSteps, ...(isDesignEmpty(nextDesign) ? {} : { design: nextDesign }), by, at });
        record.updatedAt = at;
        write(record);
        return toPlanV1(record);
      });
    },
    /** Approve (optionally with a final edit). Locks the plan at that revision. */
    async approve(id, edit) {
      if (edit) await this.saveRevision(id, edit);
      return locked(id, () => {
        const record = read(id);
        if (record.status === "superseded") throw new PlanError("PLAN_LOCKED", "status", "plan was replaced by a newer one");
        if (record.status !== "awaiting_approval") return toPlanV1(record, record.approvedRevision);
        const at = iso();
        record.status = "approved";
        record.approvedRevision = record.revisions[record.revisions.length - 1].revision;
        record.approvedAt = at;
        record.updatedAt = at;
        const steps = record.revisions[record.revisions.length - 1].steps;
        record.progress = Object.fromEntries(steps.map((s) => [s.id, { status: "pending", at }]));
        write(record);
        return toPlanV1(record, record.approvedRevision);
      });
    },
    /** The approved revision for execution; marks the plan executing. */
    async startExecution(id) {
      return locked(id, () => {
        const record = read(id);
        if (!["approved", "executing", "completed"].includes(record.status)) {
          throw new PlanError("PLAN_NOT_APPROVED", "status", `plan is ${record.status}; wait for the user to approve it on the card`);
        }
        if (record.status === "approved") { record.status = "executing"; record.updatedAt = iso(); write(record); }
        return toPlanV1(record, record.approvedRevision);
      });
    },
    async progress(id, stepId, status, note) {
      return locked(id, () => {
        const record = read(id);
        if (!["approved", "executing", "completed"].includes(record.status)) throw new PlanError("PLAN_NOT_APPROVED", "status", `plan is ${record.status}`);
        const steps = record.revisions.find((r) => r.revision === record.approvedRevision).steps;
        if (!isStepId(stepId) || !steps.some((s) => s.id === stepId)) throw new PlanError("PLAN_STEP_UNKNOWN", "stepId", `no step ${JSON.stringify(stepId)} in the approved plan`);
        if (!STEP_STATUSES.includes(status)) throw new PlanError("PLAN_INVALID", "status", `expected one of ${STEP_STATUSES.join(", ")}`);
        const at = iso();
        const trimmed = typeof note === "string" ? note.trim().slice(0, 500) : "";
        record.progress = { ...record.progress, [stepId]: { status, ...(trimmed ? { note: trimmed } : {}), at } };
        const done = steps.filter((s) => ["completed", "skipped"].includes(record.progress[s.id]?.status)).length;
        record.status = done === steps.length ? "completed" : "executing";
        record.updatedAt = at;
        write(record);
        return { plan: toPlanV1(record, record.approvedRevision), done, total: steps.length, remaining: steps.filter((s) => !["completed", "skipped"].includes(record.progress[s.id]?.status)).map((s) => s.id) };
      });
    },
    list() {
      return readIndex();
    },
  };
}
