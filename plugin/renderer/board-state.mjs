/**
 * Card state per plan, kept at module level so a card that unmounts and
 * mounts again (scrolling, session switch) keeps unsaved edits.
 *
 * Edits autosave as revisions through `plugin.call("plan.save")`, debounced
 * and one at a time. The approval chip names the revision the approval will
 * land on, which `predictedRevision` derives from what was saved, what is in
 * flight and what is still local.
 */
import { validateDesign, validateSteps } from "../lib/plan-schema.mjs";
import { call } from "./host.mjs";

const SAVE_DEBOUNCE_MS = 700;
const boards = new Map();

function normalizedKey(steps, design) {
  try {
    return JSON.stringify({ steps: validateSteps(steps), design: validateDesign(design || {}) });
  } catch {
    return null;
  }
}

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

export function board(planId) {
  let b = boards.get(planId);
  if (!b) {
    b = {
      planId, server: null, steps: [], design: {}, loaded: false, loading: false,
      saving: false, inflightKey: null, lastAck: null, timer: null, error: "", loadError: "",
      notice: "", listeners: new Set(), version: 0,
    };
    boards.set(planId, b);
  }
  return b;
}

function emit(b) {
  b.version += 1;
  for (const l of [...b.listeners]) l(b.version);
}

export function subscribe(b, listener) {
  b.listeners.add(listener);
  return () => b.listeners.delete(listener);
}

export function isDirty(b) {
  return Boolean(b.lastAck) && normalizedKey(b.steps, b.design) !== b.lastAck.key;
}

function adopt(b, plan) {
  b.server = plan;
  b.lastAck = { revision: plan.revision, key: normalizedKey(plan.steps, plan.design || {}) };
}

export async function load(b) {
  if (b.loading) return;
  b.loading = true;
  try {
    const plan = await call("plan.get", { planId: b.planId });
    const dirty = b.loaded && isDirty(b);
    const before = b.server?.revision;
    b.server = plan;
    if (!b.loaded || (!dirty && !b.saving)) {
      if (!b.loaded || plan.revision !== before || plan.status !== "awaiting_approval") {
        b.steps = clone(plan.steps);
        b.design = clone(plan.design || {});
      }
      adopt(b, plan);
    }
    b.loaded = true;
    b.loadError = "";
  } catch (e) {
    b.loadError = e?.code === "PLAN_NOT_FOUND" ? "PLAN_NOT_FOUND" : `${e?.code || ""} ${e?.message || e}`.trim();
  } finally {
    b.loading = false;
    emit(b);
  }
}

/** Apply a local edit and schedule an autosave. */
export function edit(b, mutate) {
  const next = mutate({ steps: clone(b.steps), design: clone(b.design || {}) });
  b.steps = next.steps;
  b.design = next.design;
  b.notice = "";
  try {
    validateSteps(b.steps);
    if (!b.steps.length) throw new Error("至少要保留一个步骤");
    validateDesign(b.design || {});
    b.error = "";
  } catch (e) {
    b.error = e.message;
  }
  emit(b);
  clearTimeout(b.timer);
  if (!b.error) b.timer = setTimeout(() => save(b), SAVE_DEBOUNCE_MS);
}

async function save(b) {
  if (b.saving) { b.timer = setTimeout(() => save(b), SAVE_DEBOUNCE_MS); return; }
  const key = normalizedKey(b.steps, b.design);
  if (!key || !b.lastAck || key === b.lastAck.key) return;
  b.saving = true;
  b.inflightKey = key;
  emit(b);
  try {
    const plan = await call("plan.save", { planId: b.planId, steps: b.steps, design: b.design });
    adopt(b, plan);
  } catch (e) {
    b.error = `保存失败：${e?.code || ""} ${e?.message || e}`.trim();
  } finally {
    b.saving = false;
    b.inflightKey = null;
    emit(b);
  }
}

/** The revision an approval sent now will lock. */
export function predictedRevision(b) {
  const key = normalizedKey(b.steps, b.design);
  const acked = b.lastAck?.revision ?? 1;
  if (key === b.lastAck?.key) return acked;
  if (b.saving) return key === b.inflightKey ? acked + 1 : acked + 2;
  return acked + 1;
}

export async function approve(b) {
  clearTimeout(b.timer);
  const plan = await call("plan.approve", { planId: b.planId, steps: b.steps, design: b.design });
  adopt(b, plan);
  b.steps = clone(plan.steps);
  b.design = clone(plan.design || {});
  emit(b);
  return plan;
}

export function setNotice(b, notice, error = "") {
  b.notice = notice;
  b.error = error;
  emit(b);
}
