/** The Agent tool Plan Board registers, shared by main.js and the manifest check test. */
export const PLUGIN_ID = "io.github.galaxyxieyu.plan-board";
export const TOOL_NAME = "plan";
/** Name the host exposes to the model (`plugin_<id>_<tool>`, PI-Desktop D015). */
export const EXPOSED_TOOL_NAME = `plugin_${PLUGIN_ID.replace(/[^a-zA-Z0-9_]/g, "_")}_${TOOL_NAME}`;

export const TOOL_DESCRIPTION =
  "Plan Board: propose an editable implementation plan to the user, read the approved version, and report step progress. " +
  "action=submit: send title, summary (markdown) and steps [{id,title,detail?,dependsOn[]}] (at most 24, ids like s1, dependsOn lists ids of earlier steps), optional design " +
  "{framework, componentLibrary (short names, max 40 chars), styleKeywords[], fontSystem{fontFamily, heading|subheading|body:{size:'24px',weight:600}}, colorSystem{primary|background|text|functional:['#RRGGBB']}}, optional replaces=<old planId>. " +
  "The user edits and approves it on a card; after submit, end your turn and change no files. " +
  "action=get with planId: returns the approved revision with steps in dependency order; refuses until the user approved. " +
  "action=progress with planId, stepId, status (in_progress|completed|skipped|failed), optional note: call when a step starts and when it ends.";

const stepSchema = {
  type: "object",
  properties: {
    id: { type: "string", description: "Short unique id, e.g. s1" },
    title: { type: "string" },
    detail: { type: "string" },
    dependsOn: { type: "array", items: { type: "string" }, description: "ids of steps that must finish first" },
  },
  required: ["id", "title", "dependsOn"],
};

const fontLevel = {
  type: "object",
  properties: { size: { type: "string", description: "10px..72px, e.g. 16px" }, weight: { type: "integer", description: "100..900 in steps of 100" } },
  additionalProperties: false,
};
const colorList = { type: "array", maxItems: 8, items: { type: "string", pattern: "^#[0-9A-Fa-f]{6}$" } };
const designSchema = {
  type: "object",
  description: "submit (optional): UI design spec; only these keys are accepted",
  properties: {
    framework: { type: "string", maxLength: 40, description: "short name, e.g. html, react, vue" },
    componentLibrary: { type: "string", maxLength: 40, description: "short name, e.g. none, shadcn, antd" },
    styleKeywords: { type: "array", maxItems: 12, items: { type: "string", maxLength: 40 } },
    fontSystem: {
      type: "object",
      properties: { fontFamily: { type: "string", maxLength: 120 }, heading: fontLevel, subheading: fontLevel, body: fontLevel },
      additionalProperties: false,
    },
    colorSystem: {
      type: "object",
      properties: { primary: colorList, background: colorList, text: colorList, functional: colorList },
      additionalProperties: false,
    },
  },
  additionalProperties: false,
};

export const TOOL_SCHEMA = {
  type: "object",
  properties: {
    action: { type: "string", enum: ["submit", "get", "progress"] },
    planId: { type: "string", description: "get/progress: the planId submit returned" },
    title: { type: "string", description: "submit: plan title" },
    summary: { type: "string", description: "submit: markdown overview, risks, acceptance" },
    steps: { type: "array", items: stepSchema, description: "submit: ordered steps with dependencies" },
    design: designSchema,
    replaces: { type: "string", description: "submit (optional): planId this plan revises" },
    stepId: { type: "string", description: "progress: the step id" },
    status: { type: "string", enum: ["in_progress", "completed", "skipped", "failed"], description: "progress: new step status" },
    note: { type: "string", description: "progress (optional): one-line note" },
  },
  required: ["action"],
};

/** Text the "先出计划" composer chip sends in its place. */
export const PLAN_FIRST_SEND =
  `[Plan Board] 这次请先出计划，不要修改任何文件。先调用 ToolSearch（query 填 ${EXPOSED_TOOL_NAME}）激活 Plan Board 工具，` +
  `再用 action="submit" 提交计划：title、summary（markdown）、steps（每步 id/title/detail/dependsOn，5 步左右，dependsOn 写清依赖），` +
  `涉及界面时附上 design（framework、componentLibrary、styleKeywords、fontSystem、colorSystem）。提交后结束本轮，等我在计划卡上修改并批准。`;

/** Text the approval chip sends in its place. */
export function executeSend(planId, revision) {
  return `[Plan Board] 我已批准计划 ${planId}（r${revision}），开始执行。先调用 ${EXPOSED_TOOL_NAME}（如未激活先用 ToolSearch 激活）action="get" planId="${planId}" 读取批准版本，` +
    `严格按它的步骤和依赖顺序执行，并遵守其中的 design。每一步开始时调用 action="progress" status="in_progress"，完成时 status="completed"（带一句 note）。` +
    `同时用 TodoWrite 维护清单，每条以 [stepId] 开头。`;
}

/** Text the "要改" chip sends in its place. */
export function reviseSend(planId, feedback) {
  return `[Plan Board] 计划 ${planId} 需要修改：${feedback}\n请按意见重新调用 ${EXPOSED_TOOL_NAME} action="submit"，并带上 replaces="${planId}"。提交后结束本轮，不要修改文件。`;
}
