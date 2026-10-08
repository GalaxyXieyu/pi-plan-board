/** "先出计划" toggle in the composer toolbar: adds or removes the plan-first chip. */
import { createElement as h, useEffect, useState } from "react";
import { PLAN_FIRST_SEND } from "../lib/tool-spec.mjs";
import { hasOwnMark, onDraft, replaceDraftNow, rewriteMarks } from "./host.mjs";

const isPlanFirst = (send) => send === PLAN_FIRST_SEND;

export function PlanFirstToggle() {
  const [on, setOn] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => onDraft((snapshot) => setOn(hasOwnMark(snapshot, isPlanFirst))), []);
  return h("button", {
    type: "button",
    className: `pb-toggle${on ? " pb-toggle--on" : ""}`,
    "data-pb": "plan-first",
    "aria-pressed": on,
    title: error || (on ? "已开启：这条消息会让模型先提交计划，再等你批准" : "让模型先出计划，你在卡片上改好、批准后再执行"),
    onClick: () => {
      setError("");
      replaceDraftNow((snapshot) =>
        hasOwnMark(snapshot, isPlanFirst)
          ? rewriteMarks(snapshot, { drop: isPlanFirst })
          : rewriteMarks(snapshot, { add: { label: "📋 先出计划", send: PLAN_FIRST_SEND } }),
      ).catch((e) => setError(`${e.code || ""} ${e.message || e}`.trim()));
    },
  }, h("span", { "aria-hidden": true }, "📋"), " 先出计划");
}
