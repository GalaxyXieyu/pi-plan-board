/**
 * `pi.plan/v1` — the one plan contract Plan Board shares with other hosts.
 *
 * Steps and design carry the same fields and limits as the Interactive Plan
 * proposal in GalaxyXieyu/PI-Desktop (PlanStep / PlanDesignSpec), so a plan
 * can move between this plugin, a built-in host plan and other runtimes.
 * Pure functions only: used by the plugin process, the renderer card and tests.
 */

export const PLAN_SCHEMA = "pi.plan/v1";
export const PLAN_STEPS_MAX = 24;
export const PLAN_STEP_ID_MAX = 64;
export const PLAN_STEP_TITLE_MAX = 200;
export const PLAN_STEP_DETAIL_MAX = 2000;
export const PLAN_STEPS_JSON_MAX_BYTES = 64 * 1024;
export const PLAN_STEP_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
export const PLAN_TITLE_MAX = 200;
export const PLAN_SUMMARY_MAX = 20000;

export const PLAN_DESIGN_JSON_MAX_BYTES = 16 * 1024;
export const PLAN_STYLE_KEYWORDS_MAX = 12;
export const PLAN_STYLE_KEYWORD_MAX = 40;
export const PLAN_COLORS_PER_GROUP_MAX = 8;
export const PLAN_FONT_FAMILY_MAX = 120;
export const PLAN_FONT_SIZE_MIN = 10;
export const PLAN_FONT_SIZE_MAX = 72;
export const PLAN_FONT_WEIGHT_MIN = 100;
export const PLAN_FONT_WEIGHT_MAX = 900;
export const PLAN_DESIGN_SLUG_MAX = 40;
export const PLAN_HEX_COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;
export const PLAN_COLOR_GROUPS = ["primary", "background", "text", "functional"];
export const PLAN_FONT_LEVELS = ["heading", "subheading", "body"];
export const PLAN_FRAMEWORK_OPTIONS = ["react", "vue", "svelte", "angular", "html"];
export const PLAN_COMPONENT_LIBRARY_OPTIONS = ["shadcn", "mui", "antd", "tdesign", "element-plus", "chakra"];
export const PLAN_FONT_SIZE_OPTIONS = ["12px", "14px", "16px", "18px", "20px", "24px", "28px", "32px", "36px", "40px", "48px"];
export const PLAN_FONT_WEIGHT_OPTIONS = [100, 200, 300, 400, 500, 600, 700, 800, 900];
export const PLAN_FONT_FAMILY_PRESETS = ["system-ui", "Inter", "Roboto", "Montserrat", "SF Pro Display", "PingFang SC", "Arial", "Helvetica", "Georgia", "Times New Roman", "Courier New"];

export const PLAN_STATUSES = ["awaiting_approval", "approved", "executing", "completed", "superseded"];
export const STEP_STATUSES = ["pending", "in_progress", "completed", "skipped", "failed"];

// eslint-disable-next-line no-control-regex
const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;
const CONTROL_ANY = /[\u0000-\u001F\u007F]/;

export class PlanError extends Error {
  constructor(code, path, reason) {
    super(`${path}: ${reason}`);
    this.code = code;
    this.path = path;
  }
}

const isRecord = (v) => typeof v === "object" && v !== null && !Array.isArray(v);
const bytes = (v) => new TextEncoder().encode(JSON.stringify(v)).length;
const chars = (s) => [...s].length;

function unknownKey(record, allowed) {
  return Object.keys(record).find((k) => !allowed.includes(k));
}

export function isStepId(value) {
  return typeof value === "string" && value === value.trim() && value.length > 0 &&
    value.length <= PLAN_STEP_ID_MAX && PLAN_STEP_ID_PATTERN.test(value);
}

export function newStepId(random = Math.random) {
  return `step-${Array.from({ length: 8 }, () => Math.floor(random() * 36).toString(36)).join("")}`;
}

export function newPlanId(random = Math.random) {
  return `pb-${Array.from({ length: 10 }, () => Math.floor(random() * 36).toString(36)).join("")}`;
}

/** Validate and normalize steps. Throws PlanError("PLAN_STEPS_INVALID"). */
export function validateSteps(value) {
  const bad = (path, reason) => new PlanError("PLAN_STEPS_INVALID", path, reason);
  if (!Array.isArray(value)) throw bad("steps", "expected an array");
  if (value.length > PLAN_STEPS_MAX) throw bad("steps", `must contain at most ${PLAN_STEPS_MAX} steps`);
  const steps = [];
  const ids = new Set();
  for (const [index, input] of value.entries()) {
    const path = `steps[${index}]`;
    if (!isRecord(input)) throw bad(path, "expected an object");
    const extra = unknownKey(input, ["id", "title", "detail", "dependsOn"]);
    if (extra !== undefined) throw bad(`${path}.${extra}`, "unknown key");
    const id = typeof input.id === "string" ? input.id.trim() : input.id;
    if (!isStepId(id)) throw bad(`${path}.id`, `expected a 1..${PLAN_STEP_ID_MAX} character id matching ${PLAN_STEP_ID_PATTERN.source}`);
    if (ids.has(id)) throw bad(`${path}.id`, `duplicate step "${id}"`);
    ids.add(id);
    if (typeof input.title !== "string") throw bad(`${path}.title`, "expected a string");
    const title = input.title.trim();
    if (!title || chars(title) > PLAN_STEP_TITLE_MAX || CONTROL_ANY.test(title)) {
      throw bad(`${path}.title`, `expected 1..${PLAN_STEP_TITLE_MAX} characters without control characters`);
    }
    let detail;
    if (input.detail !== undefined && input.detail !== null) {
      if (typeof input.detail !== "string") throw bad(`${path}.detail`, "expected a string");
      detail = input.detail.trim() || undefined;
      if (detail && (chars(detail) > PLAN_STEP_DETAIL_MAX || CONTROL.test(detail))) {
        throw bad(`${path}.detail`, `expected at most ${PLAN_STEP_DETAIL_MAX} characters`);
      }
    }
    const rawDeps = input.dependsOn === undefined ? [] : input.dependsOn;
    if (!Array.isArray(rawDeps)) throw bad(`${path}.dependsOn`, "expected an array of step ids");
    const dependsOn = [];
    for (const [d, dep] of rawDeps.entries()) {
      const depId = typeof dep === "string" ? dep.trim() : dep;
      if (!isStepId(depId)) throw bad(`${path}.dependsOn[${d}]`, "expected a step id");
      if (!dependsOn.includes(depId)) dependsOn.push(depId);
    }
    steps.push(detail ? { id, title, detail, dependsOn } : { id, title, dependsOn });
  }
  for (const [index, step] of steps.entries()) {
    for (const dep of step.dependsOn) {
      if (dep === step.id) throw bad(`steps[${index}].dependsOn`, "a step cannot depend on itself");
      if (!ids.has(dep)) throw bad(`steps[${index}].dependsOn`, `unknown step "${dep}"`);
    }
  }
  const cycle = findCycle(steps);
  if (cycle) throw bad("steps", `dependency cycle: ${cycle.join(" -> ")}`);
  if (bytes(steps) > PLAN_STEPS_JSON_MAX_BYTES) throw bad("steps", `must serialize to at most ${PLAN_STEPS_JSON_MAX_BYTES} bytes`);
  return steps;
}

/** A dependency cycle as a list of ids (first repeated at the end), or null. */
export function findCycle(steps) {
  const deps = new Map(steps.map((s) => [s.id, s.dependsOn || []]));
  const state = new Map();
  const stack = [];
  const visit = (id) => {
    state.set(id, 1);
    stack.push(id);
    for (const dep of deps.get(id) || []) {
      if (!deps.has(dep)) continue;
      if (state.get(dep) === 1) return [...stack.slice(stack.indexOf(dep)), dep];
      if (!state.get(dep)) { const found = visit(dep); if (found) return found; }
    }
    stack.pop();
    state.set(id, 2);
    return null;
  };
  for (const s of steps) {
    if (!state.get(s.id)) { const found = visit(s.id); if (found) return found; }
  }
  return null;
}

/** Whether adding `stepId` dependsOn `dependencyId` would create a cycle. */
export function wouldCreateCycle(steps, stepId, dependencyId) {
  if (stepId === dependencyId) return true;
  // A cycle appears iff stepId is reachable from dependencyId through dependsOn.
  const deps = new Map(steps.map((s) => [s.id, s.dependsOn || []]));
  const seen = new Set();
  const queue = [dependencyId];
  while (queue.length) {
    const id = queue.shift();
    if (id === stepId) return true;
    if (seen.has(id)) continue;
    seen.add(id);
    queue.push(...(deps.get(id) || []));
  }
  return false;
}

/** Topological layers (ids), dependencies first. Assumes no cycle. */
export function topoLayers(steps) {
  const remaining = new Map(steps.map((s) => [s.id, new Set((s.dependsOn || []).filter((d) => steps.some((x) => x.id === d)))]));
  const layers = [];
  while (remaining.size) {
    const ready = [...remaining].filter(([, deps]) => deps.size === 0).map(([id]) => id);
    if (!ready.length) break;
    layers.push(ready);
    for (const id of ready) remaining.delete(id);
    for (const deps of remaining.values()) for (const id of ready) deps.delete(id);
  }
  return layers;
}

function slug(value, path) {
  if (typeof value !== "string") throw new PlanError("PLAN_DESIGN_INVALID", path, "expected a string");
  const s = value.trim();
  if (!s) return undefined;
  if (chars(s) > PLAN_DESIGN_SLUG_MAX || CONTROL_ANY.test(s)) throw new PlanError("PLAN_DESIGN_INVALID", path, `expected at most ${PLAN_DESIGN_SLUG_MAX} characters`);
  return s;
}

function fontSize(value, path) {
  const s = typeof value === "number" ? `${value}px` : typeof value === "string" ? value.trim() : "";
  const m = /^(\d{1,3})px$/.exec(s);
  if (!m || Number(m[1]) < PLAN_FONT_SIZE_MIN || Number(m[1]) > PLAN_FONT_SIZE_MAX) {
    throw new PlanError("PLAN_DESIGN_INVALID", path, `expected ${PLAN_FONT_SIZE_MIN}px..${PLAN_FONT_SIZE_MAX}px`);
  }
  return `${Number(m[1])}px`;
}

function fontWeight(value, path) {
  const n = typeof value === "string" ? Number(value) : value;
  if (!Number.isInteger(n) || n < PLAN_FONT_WEIGHT_MIN || n > PLAN_FONT_WEIGHT_MAX || n % 100 !== 0) {
    throw new PlanError("PLAN_DESIGN_INVALID", path, "expected 100..900 in steps of 100");
  }
  return n;
}

/** Validate and normalize a design spec; empty collections are dropped. */
export function validateDesign(value) {
  const bad = (path, reason) => new PlanError("PLAN_DESIGN_INVALID", path, reason);
  if (!isRecord(value)) throw bad("design", "expected an object");
  const extra = unknownKey(value, ["framework", "componentLibrary", "styleKeywords", "fontSystem", "colorSystem"]);
  if (extra !== undefined) throw bad(`design.${extra}`, "unknown key");
  const spec = {};
  for (const key of ["framework", "componentLibrary"]) {
    if (value[key] === undefined || value[key] === null) continue;
    const s = slug(value[key], `design.${key}`);
    if (s) spec[key] = s;
  }
  if (value.styleKeywords !== undefined && value.styleKeywords !== null) {
    if (!Array.isArray(value.styleKeywords)) throw bad("design.styleKeywords", "expected an array");
    const keywords = [];
    for (const [i, k] of value.styleKeywords.entries()) {
      if (typeof k !== "string") throw bad(`design.styleKeywords[${i}]`, "expected a string");
      const s = k.trim();
      if (!s) continue;
      if (chars(s) > PLAN_STYLE_KEYWORD_MAX || CONTROL_ANY.test(s)) throw bad(`design.styleKeywords[${i}]`, `expected at most ${PLAN_STYLE_KEYWORD_MAX} characters`);
      if (!keywords.includes(s)) keywords.push(s);
    }
    if (keywords.length > PLAN_STYLE_KEYWORDS_MAX) throw bad("design.styleKeywords", `at most ${PLAN_STYLE_KEYWORDS_MAX} keywords`);
    if (keywords.length) spec.styleKeywords = keywords;
  }
  if (value.fontSystem !== undefined && value.fontSystem !== null) {
    const f = value.fontSystem;
    if (!isRecord(f)) throw bad("design.fontSystem", "expected an object");
    const extraF = unknownKey(f, ["fontFamily", ...PLAN_FONT_LEVELS]);
    if (extraF !== undefined) throw bad(`design.fontSystem.${extraF}`, "unknown key");
    const family = typeof f.fontFamily === "string" ? f.fontFamily.trim() : "";
    if (!family || chars(family) > PLAN_FONT_FAMILY_MAX || CONTROL_ANY.test(family)) throw bad("design.fontSystem.fontFamily", `expected 1..${PLAN_FONT_FAMILY_MAX} characters`);
    const fontSystem = { fontFamily: family };
    for (const level of PLAN_FONT_LEVELS) {
      if (f[level] === undefined || f[level] === null) continue;
      if (!isRecord(f[level])) throw bad(`design.fontSystem.${level}`, "expected { size, weight }");
      fontSystem[level] = { size: fontSize(f[level].size, `design.fontSystem.${level}.size`), weight: fontWeight(f[level].weight, `design.fontSystem.${level}.weight`) };
    }
    spec.fontSystem = fontSystem;
  }
  if (value.colorSystem !== undefined && value.colorSystem !== null) {
    const c = value.colorSystem;
    if (!isRecord(c)) throw bad("design.colorSystem", "expected an object");
    const extraC = unknownKey(c, PLAN_COLOR_GROUPS);
    if (extraC !== undefined) throw bad(`design.colorSystem.${extraC}`, "unknown key");
    const colorSystem = {};
    for (const group of PLAN_COLOR_GROUPS) {
      if (c[group] === undefined || c[group] === null) continue;
      if (!Array.isArray(c[group])) throw bad(`design.colorSystem.${group}`, "expected an array");
      const colors = [];
      for (const [i, color] of c[group].entries()) {
        if (typeof color !== "string" || !PLAN_HEX_COLOR_PATTERN.test(color.trim())) throw bad(`design.colorSystem.${group}[${i}]`, "expected #RRGGBB");
        const hex = color.trim().toUpperCase();
        if (!colors.includes(hex)) colors.push(hex);
      }
      if (colors.length > PLAN_COLORS_PER_GROUP_MAX) throw bad(`design.colorSystem.${group}`, `at most ${PLAN_COLORS_PER_GROUP_MAX} colors`);
      if (colors.length) colorSystem[group] = colors;
    }
    if (Object.keys(colorSystem).length) spec.colorSystem = colorSystem;
  }
  if (bytes(spec) > PLAN_DESIGN_JSON_MAX_BYTES) throw bad("design", `must serialize to at most ${PLAN_DESIGN_JSON_MAX_BYTES} bytes`);
  return spec;
}

export function isDesignEmpty(spec) {
  return !spec || Object.keys(spec).length === 0;
}

function text(value, path, max, { required = false, multiline = false } = {}) {
  if (value === undefined || value === null) {
    if (required) throw new PlanError("PLAN_INVALID", path, "required");
    return "";
  }
  if (typeof value !== "string") throw new PlanError("PLAN_INVALID", path, "expected a string");
  const s = value.trim();
  if (required && !s) throw new PlanError("PLAN_INVALID", path, "required");
  if (chars(s) > max || (multiline ? CONTROL : CONTROL_ANY).test(s)) throw new PlanError("PLAN_INVALID", path, `expected at most ${max} characters`);
  return s;
}

/** Validate a `submit` payload from the model. */
export function validateSubmission(input) {
  if (!isRecord(input)) throw new PlanError("PLAN_INVALID", "args", "expected an object");
  const title = text(input.title, "title", PLAN_TITLE_MAX, { required: true });
  const summary = text(input.summary, "summary", PLAN_SUMMARY_MAX, { multiline: true });
  const steps = validateSteps(input.steps ?? []);
  if (!steps.length) throw new PlanError("PLAN_STEPS_INVALID", "steps", "a plan needs at least one step");
  const design = input.design === undefined || input.design === null ? undefined : validateDesign(input.design);
  const replaces = input.replaces === undefined || input.replaces === null || input.replaces === "" ? undefined : text(input.replaces, "replaces", 64);
  return { title, summary, steps, ...(design && !isDesignEmpty(design) ? { design } : {}), ...(replaces ? { replaces } : {}) };
}

export function stepsEqual(a, b) {
  return JSON.stringify(a || []) === JSON.stringify(b || []);
}

export function designEqual(a, b) {
  return JSON.stringify(a || {}) === JSON.stringify(b || {});
}

/** The `pi.plan/v1` view of one stored plan record at a revision. */
export function toPlanV1(record, revisionNumber) {
  const rev = revisionNumber === undefined
    ? record.revisions[record.revisions.length - 1]
    : record.revisions.find((r) => r.revision === revisionNumber);
  if (!rev) throw new PlanError("PLAN_NOT_FOUND", "revision", `no revision ${revisionNumber}`);
  return {
    schema: PLAN_SCHEMA,
    id: record.id,
    revision: rev.revision,
    title: record.title,
    summary: record.summary,
    steps: rev.steps,
    ...(rev.design && !isDesignEmpty(rev.design) ? { design: rev.design } : {}),
    status: record.status,
    progress: record.progress || {},
    source: record.source || {},
    ...(record.replaces ? { replaces: record.replaces } : {}),
    ...(record.supersededBy ? { supersededBy: record.supersededBy } : {}),
    ...(record.approvedRevision ? { approvedRevision: record.approvedRevision } : {}),
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    ...(record.approvedAt ? { approvedAt: record.approvedAt } : {}),
  };
}

/** Plain-text execution brief for an approved plan (steps in dependency order). */
export function executionBrief(plan) {
  const order = topoLayers(plan.steps).flat();
  const byId = new Map(plan.steps.map((s) => [s.id, s]));
  const lines = [`Approved plan ${plan.id} r${plan.revision}: ${plan.title}`, "", "Steps (run in this order; a step starts only after the steps on its after: line are done):"];
  order.forEach((id, i) => {
    const s = byId.get(id);
    const status = plan.progress?.[id]?.status;
    lines.push(`${i + 1}. [${s.id}] ${s.title}${status && status !== "pending" ? `  (status: ${status})` : ""}`);
    if (s.dependsOn.length) lines.push(`   after: ${s.dependsOn.join(", ")}`);
    if (s.detail) lines.push(`   ${s.detail.replace(/\n/g, "\n   ")}`);
  });
  if (plan.design && !isDesignEmpty(plan.design)) {
    lines.push("", "Design spec (follow exactly):", JSON.stringify(plan.design, null, 2));
  }
  return lines.join("\n");
}
