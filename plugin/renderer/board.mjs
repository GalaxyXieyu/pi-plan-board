/**
 * The Plan Board tool card (`toolCard` slot for the plugin's `plan` tool).
 *
 * submit:   the editable board: steps (title, detail, dependencies kept as
 *            structured ids, shown as step numbers, cycle-guarded), the design
 *            spec, the read-only summary, and Approve / Request changes.
 * get:      one line, the approved revision was read.
 * progress: one line, a step changed status.
 */
import { createElement as h, Fragment, useEffect, useReducer, useState } from "react";
import {
  PLAN_COLOR_GROUPS, PLAN_COMPONENT_LIBRARY_OPTIONS, PLAN_FONT_FAMILY_PRESETS, PLAN_FONT_LEVELS,
  PLAN_FONT_SIZE_OPTIONS, PLAN_FONT_WEIGHT_OPTIONS, PLAN_FRAMEWORK_OPTIONS, PLAN_HEX_COLOR_PATTERN,
  PLAN_STEPS_MAX, PLAN_STYLE_KEYWORDS_MAX, PLAN_COLORS_PER_GROUP_MAX, wouldCreateCycle,
} from "../lib/plan-schema.mjs";
import { executeSend, reviseSend } from "../lib/tool-spec.mjs";
import { approve, board, edit, isDirty, load, predictedRevision, setNotice, subscribe } from "./board-state.mjs";
import { replaceDraftNow, rewriteMarks } from "./host.mjs";
import { Icon, STATUS_ICON } from "./icons.mjs";
import { Markdown } from "./markdown.mjs";

const POLL_ACTIVE_MS = 2000;
const POLL_IDLE_MS = 5000;

const STATUS_LABEL = {
  awaiting_approval: "待批准",
  approved: "已批准",
  executing: "执行中",
  completed: "已完成",
  superseded: "已被新版本替代",
};
const STEP_LABEL = { pending: "未开始", in_progress: "进行中", completed: "完成", skipped: "跳过", failed: "失败" };
const COLOR_GROUP_LABEL = { primary: "主色", background: "背景", text: "文字", functional: "功能色" };
const FONT_LEVEL_LABEL = { heading: "标题", subheading: "副标题", body: "正文" };

/** Find the planId in a tool result, whatever envelope the host put around it. */
export function planIdFrom(result) {
  const seen = new Set();
  const visit = (v, depth) => {
    if (v == null || depth > 6) return null;
    if (typeof v === "string") {
      const direct = /"planId"\s*:\s*"(pb-[a-z0-9]+)"/.exec(v);
      if (direct) return direct[1];
      return null;
    }
    if (typeof v !== "object" || seen.has(v)) return null;
    seen.add(v);
    if (typeof v.planId === "string" && /^pb-[a-z0-9]+$/.test(v.planId)) return v.planId;
    for (const child of Array.isArray(v) ? v : Object.values(v)) {
      const found = visit(child, depth + 1);
      if (found) return found;
    }
    return null;
  };
  return visit(result, 0);
}

function fieldFrom(result, key) {
  let out;
  const visit = (v, depth) => {
    if (out !== undefined || v == null || depth > 6) return;
    if (typeof v === "string") {
      if (v.trim().startsWith("{")) { try { visit(JSON.parse(v), depth + 1); } catch { /* not JSON */ } }
      return;
    }
    if (typeof v !== "object") return;
    if (key in v && typeof v[key] !== "object") { out = v[key]; return; }
    for (const child of Array.isArray(v) ? v : Object.values(v)) visit(child, depth + 1);
  };
  visit(result, 0);
  return out;
}

function errorText(error) {
  if (typeof error === "string") return error;
  return error?.message || fieldFrom(error, "error") || JSON.stringify(error);
}

function useBoard(planId) {
  const b = board(planId);
  const [, force] = useReducer((n) => n + 1, 0);
  useEffect(() => subscribe(b, force), [b]);
  useEffect(() => {
    if (!b.loaded) load(b);
  }, [b]);
  const status = b.server?.status;
  useEffect(() => {
    if (!status || status === "completed" || status === "superseded") return undefined;
    const every = status === "approved" || status === "executing" ? POLL_ACTIVE_MS : POLL_IDLE_MS;
    const t = setInterval(() => { if (!document.hidden) load(b); }, every);
    return () => clearInterval(t);
  }, [b, status]);
  return b;
}

export function PlanToolCard(props) {
  const action = props.toolArgs?.action;
  if (action === "get") return h(GetRow, props);
  if (action === "progress") return h(ProgressRow, props);
  return h(SubmitCard, props);
}

function Pill({ status }) {
  return h("span", { className: `pb-pill pb-pill--${status}`, "data-pb-status": status }, STATUS_LABEL[status] || status);
}

function GetRow({ toolArgs, toolStatus, toolResult, toolError }) {
  const revision = fieldFrom(toolResult, "revision");
  return h("div", { className: "pb-row", "data-pb": "get-row", title: toolArgs?.planId || undefined },
    h("span", { className: "pb-row-icon" }, h(Icon, { name: "fileCheck" })),
    h("span", { className: "pb-row-main" }, toolStatus === "error"
      ? h("span", { className: "pb-error" }, `读取计划失败：${errorText(toolError)}`)
      : toolStatus === "running" ? "正在读取批准的计划…" : `已读取批准的计划 r${revision ?? "?"}，开始执行`));
}

function ProgressRow({ toolArgs, toolStatus, toolResult, toolError }) {
  const done = fieldFrom(toolResult, "done");
  const total = fieldFrom(toolResult, "total");
  const status = toolArgs?.status || "";
  const steps = board(toolArgs?.planId || "").server?.steps || [];
  const at = steps.findIndex((s) => s.id === toolArgs?.stepId);
  const name = at >= 0 ? `${at + 1}. ${steps[at].title}` : toolArgs?.stepId || "";
  return h("div", { className: `pb-row pb-row--${status}`, "data-pb": "progress-row", "data-pb-row-step": toolArgs?.stepId || "" },
    h("span", { className: "pb-row-icon" }, h(Icon, { name: STATUS_ICON[status] || "circle" })),
    h("span", { className: "pb-row-main" },
      h("span", { className: "pb-row-title" }, name), h("span", { className: "pb-muted" }, ` ${STEP_LABEL[status] || status}`),
      toolArgs?.note ? h("span", { className: "pb-row-note" }, toolArgs.note) : null),
    toolStatus === "error"
      ? h("span", { className: "pb-error" }, errorText(toolError))
      : typeof done === "number" ? h("span", { className: "pb-muted" }, `${done}/${total}`) : null);
}

function SubmitCard({ toolArgs, toolStatus, toolResult, toolError }) {
  if (toolStatus === "running") {
    return h("div", { className: "pb-card", "data-pb": "card", "data-pb-state": "running" },
      h("div", { className: "pb-head" }, h("strong", null, "Plan Board"), h("span", { className: "pb-muted" }, `正在提交计划：${toolArgs?.title || ""}`)));
  }
  if (toolStatus === "error") {
    return h("div", { className: "pb-card pb-card--error", "data-pb": "card", "data-pb-state": "error" },
      h("div", { className: "pb-head" }, h("strong", null, "Plan Board"), h("span", { className: "pb-error" }, `计划提交失败：${errorText(toolError)}`)));
  }
  const planId = planIdFrom(toolResult);
  if (!planId) {
    return h("div", { className: "pb-card", "data-pb": "card", "data-pb-state": "no-id" },
      h("div", { className: "pb-head" }, h("strong", null, "Plan Board"), h("span", { className: "pb-error" }, "工具结果里没有 planId")));
  }
  return h(Board, { planId, fallback: toolArgs });
}

function Board({ planId, fallback }) {
  const b = useBoard(planId);
  const [tab, setTab] = useState("steps");
  if (!b.loaded) {
    if (b.loadError === "PLAN_NOT_FOUND") return h(Snapshot, { planId, args: fallback });
    return h("div", { className: "pb-card", "data-pb": "card", "data-pb-state": "loading" },
      h("div", { className: "pb-head" }, h("strong", null, "Plan Board"), h("span", { className: b.loadError ? "pb-error" : "pb-muted" }, b.loadError || "加载计划…")));
  }
  const plan = b.server;
  const editable = plan.status === "awaiting_approval";
  const steps = editable ? b.steps : plan.steps;
  const design = editable ? b.design : plan.design || {};
  const progress = plan.progress || {};
  const done = steps.filter((s) => ["completed", "skipped"].includes(progress[s.id]?.status)).length;
  const running = plan.status !== "awaiting_approval" && plan.status !== "superseded";
  const saveState = b.saving ? "保存中…" : isDirty(b) ? "未保存" : plan.revision > 1 ? `已保存 r${plan.revision}` : `r${plan.revision}`;
  return h("div", { className: `pb-card pb-card--${plan.status}`, "data-pb": "card", "data-pb-state": plan.status, "data-pb-plan": planId, "data-pb-revision": plan.revision },
    h("div", { className: "pb-head" },
      h("span", { className: "pb-brand" }, "Plan Board"),
      h("strong", { className: "pb-title" }, plan.title),
      h(Pill, { status: plan.status }),
      h("span", { className: "pb-muted pb-save", "data-pb": "save-state" }, editable ? saveState : `r${plan.revision}`)),
    running ? h("div", { className: "pb-progress", "data-pb": "progress", "data-pb-done": done, "data-pb-total": steps.length },
      h("div", { className: "pb-progress-bar" }, h("span", { style: { width: `${steps.length ? (done / steps.length) * 100 : 0}%` } })),
      h("span", null, `${done}/${steps.length}`)) : null,
    h("div", { className: "pb-tabs", role: "tablist" },
      [["steps", `步骤 ${steps.length}`], ["design", "设计规范"], ["summary", "说明"]].map(([id, label]) =>
        h("button", { key: id, type: "button", role: "tab", className: `pb-tab${tab === id ? " pb-tab--on" : ""}`, "aria-selected": tab === id, "data-pb-tab": id, onClick: () => setTab(id) }, label))),
    tab === "steps" ? h(StepsTab, { b, steps, editable, running, progress }) : null,
    tab === "design" ? h(DesignTab, { b, design, editable }) : null,
    tab === "summary" ? h("div", { className: "pb-summary", "data-pb": "summary" }, plan.summary ? h(Markdown, { source: plan.summary }) : h("span", { className: "pb-muted" }, "没有说明")) : null,
    b.error ? h("div", { className: "pb-error", "data-pb": "error" }, b.error) : null,
    b.notice && plan.status !== "superseded" && plan.status !== "completed" ? h("div", { className: "pb-notice", "data-pb": "notice" }, b.notice) : null,
    editable ? h(ApproveBar, { b, planId }) : null,
    plan.status === "approved" ? h("div", { className: "pb-notice", "data-pb": "approved-hint" }, `已批准 r${plan.revision}。在输入框按回车发送「执行计划」，模型就会按这个版本开始做。`) : null,
    plan.status === "superseded" ? h("div", { className: "pb-muted" }, `这个计划已被 ${plan.supersededBy || "新版本"} 替代。`) : null);
}

/** The plan as the model first submitted it, when its stored record is gone. */
function Snapshot({ planId, args }) {
  const steps = Array.isArray(args?.steps) ? args.steps : [];
  return h("div", { className: "pb-card", "data-pb": "card", "data-pb-state": "snapshot" },
    h("div", { className: "pb-head" }, h("span", { className: "pb-brand" }, "Plan Board"), h("strong", { className: "pb-title" }, args?.title || planId)),
    h("div", { className: "pb-muted" }, "计划数据已不在（插件可能被重装），下面是模型提交时的原始版本，只读。"),
    h("ol", { className: "pb-snapshot" }, steps.map((s, i) => h("li", { key: i }, String(s?.title ?? "")))));
}

function nextStepId(steps) {
  let n = steps.length + 1;
  while (steps.some((s) => s.id === `s${n}`)) n += 1;
  return `s${n}`;
}

function StepsTab({ b, steps, editable, running, progress }) {
  const indexOf = new Map(steps.map((s, i) => [s.id, i]));
  return h("div", { className: "pb-steps", "data-pb": "steps" },
    steps.map((step, i) => h(StepRow, { key: step.id, b, step, i, steps, indexOf, editable, running, progress: progress[step.id] })),
    editable && steps.length < PLAN_STEPS_MAX ? h("button", {
      type: "button", className: "pb-add", "data-pb": "add-step",
      onClick: () => edit(b, (d) => ({ ...d, steps: [...d.steps, { id: nextStepId(d.steps), title: "新步骤", dependsOn: [] }] })),
    }, h(Icon, { name: "plus" }), "添加步骤") : null);
}

function StepRow({ b, step, i, steps, indexOf, editable, running, progress }) {
  const [open, setOpen] = useState(false);
  const [depsOpen, setDepsOpen] = useState(false);
  const status = progress?.status || "pending";
  const update = (patch) => edit(b, (d) => ({ ...d, steps: d.steps.map((s) => (s.id === step.id ? { ...s, ...patch } : s)) }));
  const move = (delta) => edit(b, (d) => {
    const list = [...d.steps];
    const j = i + delta;
    if (j < 0 || j >= list.length) return d;
    [list[i], list[j]] = [list[j], list[i]];
    return { ...d, steps: list };
  });
  const remove = () => edit(b, (d) => ({
    ...d,
    steps: d.steps.filter((s) => s.id !== step.id).map((s) => ({ ...s, dependsOn: s.dependsOn.filter((x) => x !== step.id) })),
  }));
  const toggleDep = (id) => {
    if (step.dependsOn.includes(id)) update({ dependsOn: step.dependsOn.filter((x) => x !== id) });
    else if (!wouldCreateCycle(steps, step.id, id)) update({ dependsOn: [...step.dependsOn, id] });
  };
  const num = (id) => { const at = indexOf.get(id); return at === undefined ? id : String(at + 1); };
  const full = (id) => { const at = indexOf.get(id); return at === undefined ? id : `${at + 1}. ${steps[at].title}`; };
  const hasDeps = step.dependsOn.length > 0;
  const depsText = hasDeps ? `依赖 ${step.dependsOn.map(num).join("、")}` : "";
  const depsAttrs = { "data-pb": "deps-line", "data-pb-deps": step.dependsOn.join(","), title: hasDeps ? `依赖：\n${step.dependsOn.map(full).join("\n")}` : "设置依赖" };
  const hasDetail = editable || Boolean(step.detail);
  const tool = (name, title, onClick, extra = {}) =>
    h("button", { type: "button", className: "pb-icon", title, "aria-label": title, onClick, ...extra }, h(Icon, { name }));
  return h("div", { className: `pb-step pb-step--${status}${depsOpen ? " pb-step--open" : ""}`, "data-pb-step": step.id, "data-pb-step-status": status },
    h("div", { className: "pb-step-main" },
      running ? h("span", { className: `pb-status pb-status--${status}`, title: STEP_LABEL[status] }, h(Icon, { name: STATUS_ICON[status] })) : null,
      h("span", { className: "pb-step-index" }, `${i + 1}`),
      editable
        ? h("input", { className: "pb-step-title", value: step.title, "data-pb": "step-title", "aria-label": `步骤 ${i + 1} 标题`, onChange: (e) => update({ title: e.target.value }) })
        : h("span", { className: "pb-step-title-text" }, step.title),
      h("span", { className: "pb-step-tools" },
        editable && !hasDeps ? h("button", { type: "button", className: "pb-text-btn", "aria-expanded": depsOpen, onClick: () => setDepsOpen(!depsOpen), ...depsAttrs }, "依赖") : null,
        hasDetail ? tool(open ? "chevronDown" : "chevronRight", open ? "收起说明" : "展开说明", () => setOpen(!open), { "data-pb": "step-detail-toggle", "aria-expanded": open }) : null,
        editable ? h(Fragment, null,
          tool("arrowUp", "上移", () => move(-1), { disabled: i === 0, "data-pb": "step-up" }),
          tool("arrowDown", "下移", () => move(1), { disabled: i === steps.length - 1, "data-pb": "step-down" }),
          tool("trash", "删除步骤", remove, { disabled: steps.length <= 1, "data-pb": "step-delete" })) : null)),
    hasDeps ? h("div", { className: "pb-step-meta" },
      editable
        ? h("button", { type: "button", className: "pb-deps-line", "aria-expanded": depsOpen, onClick: () => setDepsOpen(!depsOpen), ...depsAttrs }, depsText)
        : h("span", { className: "pb-deps-line", ...depsAttrs }, depsText)) : null,
    editable && depsOpen ? h(DepsPanel, { step, steps, onToggle: toggleDep, onClose: () => setDepsOpen(false) }) : null,
    open ? (editable
      ? h("textarea", { className: "pb-input pb-detail", rows: 3, value: step.detail || "", placeholder: "这一步具体做什么、验收标准", "data-pb": "step-detail", onChange: (e) => update({ detail: e.target.value }) })
      : h("div", { className: "pb-detail-text" }, step.detail)) : null,
    progress?.note && !editable && !open ? h("div", { className: "pb-note", title: progress.note }, progress.note) : null,
    progress?.note && !editable && open ? h("div", { className: "pb-detail-text" }, progress.note) : null);
}

/** Inline checklist for one step's dependencies; options that would close a cycle are disabled. */
function DepsPanel({ step, steps, onToggle, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  const others = steps.map((s, at) => ({ s, at })).filter(({ s }) => s.id !== step.id);
  return h("div", { className: "pb-deps-panel", "data-pb": "deps-panel", role: "group", "aria-label": "这一步要等哪些步骤完成" },
    h("div", { className: "pb-deps-head" },
      h("span", null, "要先完成的步骤"),
      h("button", { type: "button", className: "pb-icon", title: "收起", "aria-label": "收起", "data-pb": "deps-close", onClick: onClose }, h(Icon, { name: "x" }))),
    others.length ? others.map(({ s, at }) => {
      const checked = step.dependsOn.includes(s.id);
      const cycle = !checked && wouldCreateCycle(steps, step.id, s.id);
      return h("label", { key: s.id, className: `pb-deps-option${cycle ? " is-disabled" : ""}`, "data-pb-dep-option": s.id, "data-pb-cycle": cycle ? "1" : "0", title: cycle ? `${at + 1}. ${s.title}\n它已经（间接）依赖这一步，选了会形成循环` : `${at + 1}. ${s.title}` },
        h("input", { type: "checkbox", checked, disabled: cycle, onChange: () => onToggle(s.id) }),
        h("span", { className: "pb-deps-num" }, String(at + 1)),
        h("span", { className: "pb-deps-title" }, s.title),
        cycle ? h("span", { className: "pb-deps-hint" }, "会成环") : null);
    }) : h("span", { className: "pb-muted" }, "没有其他步骤"));
}

function Select({ value, options, onChange, editable, placeholder, ...rest }) {
  if (!editable) return h("span", { className: "pb-value" }, value || "—");
  const all = value && !options.includes(value) ? [value, ...options] : options;
  return h("select", { className: "pb-select", value: value || "", onChange: (e) => onChange(e.target.value || undefined), ...rest },
    h("option", { value: "" }, placeholder || "未指定"),
    all.map((o) => h("option", { key: o, value: o }, String(o))));
}

function DesignTab({ b, design, editable }) {
  const [keyword, setKeyword] = useState("");
  const set = (mutate) => edit(b, (d) => ({ ...d, design: mutate({ ...(d.design || {}) }) }));
  const prune = (o) => { for (const k of Object.keys(o)) if (o[k] === undefined) delete o[k]; return o; };
  const empty = !design || Object.keys(design).length === 0;
  if (empty && !editable) return h("div", { className: "pb-muted", "data-pb": "design" }, "这个计划没有设计规范");
  const font = design.fontSystem;
  const colors = design.colorSystem || {};
  return h("div", { className: "pb-design", "data-pb": "design" },
    h("div", { className: "pb-field" }, h("label", null, "框架"),
      h(Select, { value: design.framework, options: PLAN_FRAMEWORK_OPTIONS, editable, "data-pb": "framework", onChange: (v) => set((d) => prune({ ...d, framework: v })) })),
    h("div", { className: "pb-field" }, h("label", null, "组件库"),
      h(Select, { value: design.componentLibrary, options: PLAN_COMPONENT_LIBRARY_OPTIONS, editable, "data-pb": "component-library", onChange: (v) => set((d) => prune({ ...d, componentLibrary: v })) })),
    h("div", { className: "pb-field pb-field--wide" }, h("label", null, "风格关键词"),
      h("div", { className: "pb-keywords", "data-pb": "keywords" },
        (design.styleKeywords || []).map((k) => h("span", { key: k, className: "pb-chip", "data-pb-keyword": k }, k,
          editable ? h("button", { type: "button", className: "pb-chip-x", title: "删除", "aria-label": `删除关键词 ${k}`, onClick: () => set((d) => prune({ ...d, styleKeywords: (d.styleKeywords || []).filter((x) => x !== k).length ? d.styleKeywords.filter((x) => x !== k) : undefined })) }, h(Icon, { name: "x", size: 12 })) : null)),
        editable && (design.styleKeywords || []).length < PLAN_STYLE_KEYWORDS_MAX ? h("form", {
          className: "pb-inline", onSubmit: (e) => {
            e.preventDefault();
            const k = keyword.trim();
            if (!k) return;
            set((d) => ({ ...d, styleKeywords: [...new Set([...(d.styleKeywords || []), k])] }));
            setKeyword("");
          },
        }, h("input", { className: "pb-input pb-keyword-input", value: keyword, placeholder: "加关键词", "data-pb": "keyword-input", onChange: (e) => setKeyword(e.target.value) }),
        h("button", { type: "submit", className: "pb-icon", title: "添加关键词", "aria-label": "添加关键词", "data-pb": "keyword-add" }, h(Icon, { name: "plus" }))) : null)),
    h("div", { className: "pb-field pb-field--wide" }, h("label", null, "字体"),
      font || editable ? h("div", { className: "pb-font" },
        editable ? h(Fragment, null,
          h("input", { className: "pb-input", list: "pb-font-presets", value: font?.fontFamily || "", placeholder: "字体，例如 Inter", "data-pb": "font-family",
            onChange: (e) => set((d) => prune({ ...d, fontSystem: e.target.value.trim() ? { ...(d.fontSystem || {}), fontFamily: e.target.value } : undefined })) }),
          h("datalist", { id: "pb-font-presets" }, PLAN_FONT_FAMILY_PRESETS.map((f) => h("option", { key: f, value: f }))))
          : h("span", { className: "pb-value" }, font?.fontFamily || "—"),
        font ? PLAN_FONT_LEVELS.map((level) => {
          const l = font[level];
          const setLevel = (patch) => set((d) => ({ ...d, fontSystem: { ...d.fontSystem, [level]: { size: "16px", weight: 400, ...(d.fontSystem?.[level] || {}), ...patch } } }));
          return h("div", { key: level, className: "pb-font-level", "data-pb-font-level": level },
            h("span", { className: "pb-font-name" }, FONT_LEVEL_LABEL[level]),
            h(Select, { value: l?.size, options: PLAN_FONT_SIZE_OPTIONS, editable, placeholder: "字号", "data-pb": `font-${level}-size`, onChange: (v) => v && setLevel({ size: v }) }),
            h(Select, { value: l?.weight, options: PLAN_FONT_WEIGHT_OPTIONS, editable, placeholder: "字重", "data-pb": `font-${level}-weight`, onChange: (v) => v && setLevel({ weight: Number(v) }) }),
            l ? h("span", { className: "pb-font-preview", style: { fontFamily: font.fontFamily, fontSize: l.size, fontWeight: l.weight } }, "示例 Aa") : null);
        }) : null) : h("span", { className: "pb-muted" }, "未指定")),
    h("div", { className: "pb-field pb-field--wide" }, h("label", null, "颜色"),
      h("div", { className: "pb-colors", "data-pb": "colors" }, PLAN_COLOR_GROUPS.map((group) => h(ColorGroup, {
        key: group, group, colors: colors[group] || [], editable,
        onChange: (list) => set((d) => {
          const cs = { ...(d.colorSystem || {}) };
          if (list.length) cs[group] = list; else delete cs[group];
          return prune({ ...d, colorSystem: Object.keys(cs).length ? cs : undefined });
        }),
      })))));
}

function ColorGroup({ group, colors, editable, onChange }) {
  return h("div", { className: "pb-color-group", "data-pb-color-group": group },
    h("span", { className: "pb-font-name" }, COLOR_GROUP_LABEL[group]),
    colors.map((c, i) => h(ColorSwatch, { key: `${i}-${c}`, color: c, editable, onChange: (next) => onChange(colors.map((x, j) => (j === i ? next : x))), onRemove: () => onChange(colors.filter((_, j) => j !== i)) })),
    editable && colors.length < PLAN_COLORS_PER_GROUP_MAX ? h("button", { type: "button", className: "pb-icon", title: "加颜色", "data-pb": `color-add-${group}`, "aria-label": "加颜色", onClick: () => onChange([...colors, "#888888"]) }, h(Icon, { name: "plus" })) : null,
    !editable && !colors.length ? h("span", { className: "pb-muted" }, "—") : null);
}

function ColorSwatch({ color, editable, onChange, onRemove }) {
  const [text, setText] = useState(color);
  useEffect(() => setText(color), [color]);
  if (!editable) return h("span", { className: "pb-swatch", title: color }, h("i", { style: { background: color } }), h("code", null, color));
  return h("span", { className: "pb-swatch", "data-pb-color": color },
    h("input", { type: "color", value: color.toLowerCase(), onChange: (e) => onChange(e.target.value.toUpperCase()) }),
    h("input", { className: "pb-input pb-hex", value: text, "data-pb": "color-hex", onChange: (e) => { setText(e.target.value); if (PLAN_HEX_COLOR_PATTERN.test(e.target.value.trim())) onChange(e.target.value.trim().toUpperCase()); } }),
    h("button", { type: "button", className: "pb-chip-x", title: "删除颜色", "aria-label": "删除颜色", onClick: onRemove }, h(Icon, { name: "x", size: 12 })));
}

function ApproveBar({ b, planId }) {
  const [revising, setRevising] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState(false);
  const onApprove = () => {
    if (b.error) return;
    const revision = predictedRevision(b);
    // The draft rewrite has to start inside this click (PLUGIN_DRAFT_REMOTE).
    const draftWrite = replaceDraftNow((snapshot) => rewriteMarks(snapshot, {
      drop: (send) => send.startsWith("[Plan Board]"),
      add: { label: `执行计划 r${revision}`, send: executeSend(planId, revision) },
    }));
    setBusy(true);
    Promise.allSettled([draftWrite, approve(b)]).then(([draft, approval]) => {
      setBusy(false);
      if (approval.status === "rejected") {
        setNotice(b, "", `批准失败：${approval.reason?.code || ""} ${approval.reason?.message || approval.reason}`.trim());
      } else if (draft.status === "rejected") {
        setNotice(b, "", `已批准 r${approval.value.revision}，但没能填进输入框（${draft.reason?.code || draft.reason?.message}）。请手动发送：执行计划 ${planId}`);
      } else if (approval.value.revision !== revision) {
        setNotice(b, `已批准 r${approval.value.revision}（输入框里写的是 r${revision}，模型会以 get 读到的批准版本为准）。按回车开始执行。`);
      }
    });
  };
  const onRevise = () => {
    const text = feedback.trim();
    if (!text) return;
    replaceDraftNow((snapshot) => rewriteMarks(snapshot, {
      drop: (send) => send.startsWith("[Plan Board]"),
      add: { label: "修改计划", send: reviseSend(planId, text) },
    })).then(() => { setRevising(false); setFeedback(""); setNotice(b, "修改意见已放进输入框，按回车发给模型。"); },
      (e) => setNotice(b, "", `没能填进输入框：${e.code || e.message}`));
  };
  return h("div", { className: "pb-actions", "data-pb": "actions" },
    revising ? h("div", { className: "pb-revise" },
      h("textarea", { className: "pb-input", rows: 2, value: feedback, placeholder: "哪里要改？例如：第 3 步拆成两步", "data-pb": "revise-text", onChange: (e) => setFeedback(e.target.value) }),
      h("button", { type: "button", className: "pb-btn", "data-pb": "revise-send", onClick: onRevise, disabled: !feedback.trim() }, "放进输入框"),
      h("button", { type: "button", className: "pb-btn pb-btn--ghost", onClick: () => setRevising(false) }, "取消"))
      : h("button", { type: "button", className: "pb-btn pb-btn--ghost", "data-pb": "revise", onClick: () => setRevising(true) }, "要修改"),
    h("span", { className: "pb-spacer" }),
    h("button", { type: "button", className: "pb-btn pb-btn--primary", "data-pb": "approve", disabled: busy || Boolean(b.error), onClick: onApprove }, busy ? "批准中…" : "批准并执行"));
}
