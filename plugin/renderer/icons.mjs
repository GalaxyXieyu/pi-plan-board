/**
 * Small monochrome line icons (stroke = currentColor), so the card follows the
 * host's ink. Path data adapted from Lucide (https://lucide.dev, ISC License,
 * Copyright (c) Lucide Contributors).
 */
import { createElement as h } from "react";

const PATHS = {
  chevronRight: [["path", { d: "m9 18 6-6-6-6" }]],
  chevronDown: [["path", { d: "m6 9 6 6 6-6" }]],
  arrowUp: [["path", { d: "m5 12 7-7 7 7" }], ["path", { d: "M12 19V5" }]],
  arrowDown: [["path", { d: "M12 5v14" }], ["path", { d: "m19 12-7 7-7-7" }]],
  trash: [["path", { d: "M3 6h18" }], ["path", { d: "M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" }], ["path", { d: "M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" }]],
  plus: [["path", { d: "M5 12h14" }], ["path", { d: "M12 5v14" }]],
  x: [["path", { d: "M18 6 6 18" }], ["path", { d: "m6 6 12 12" }]],
  check: [["path", { d: "M20 6 9 17l-5-5" }]],
  circle: [["circle", { cx: 12, cy: 12, r: 9 }]],
  circleHalf: [["circle", { cx: 12, cy: 12, r: 9 }], ["path", { d: "M12 3a9 9 0 0 1 0 18z", fill: "currentColor", stroke: "none" }]],
  circleCheck: [["circle", { cx: 12, cy: 12, r: 9 }], ["path", { d: "m8.5 12 2.5 2.5 4.5-5" }]],
  circleX: [["circle", { cx: 12, cy: 12, r: 9 }], ["path", { d: "m15 9-6 6" }], ["path", { d: "m9 9 6 6" }]],
  circleMinus: [["circle", { cx: 12, cy: 12, r: 9 }], ["path", { d: "M8 12h8" }]],
  listChecks: [["path", { d: "m3 17 2 2 4-4" }], ["path", { d: "m3 7 2 2 4-4" }], ["path", { d: "M13 6h8" }], ["path", { d: "M13 12h8" }], ["path", { d: "M13 18h8" }]],
  fileCheck: [["path", { d: "M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" }], ["path", { d: "M14 2v4a2 2 0 0 0 2 2h4" }], ["path", { d: "m9 15 2 2 4-4" }]],
};

export function Icon({ name, size = 14, className = "", title }) {
  const parts = PATHS[name] || [];
  return h("svg", {
    className: `pb-svg ${className}`.trim(), width: size, height: size, viewBox: "0 0 24 24", fill: "none",
    stroke: "currentColor", strokeWidth: 1.75, strokeLinecap: "round", strokeLinejoin: "round",
    "aria-hidden": title ? undefined : true, role: title ? "img" : undefined, focusable: "false",
  }, title ? h("title", null, title) : null, parts.map(([tag, attrs], i) => h(tag, { key: i, ...attrs })));
}

/** Status glyph for a step / progress row. */
export const STATUS_ICON = { pending: "circle", in_progress: "circleHalf", completed: "circleCheck", skipped: "circleMinus", failed: "circleX" };
