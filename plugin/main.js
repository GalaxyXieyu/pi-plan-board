/**
 * Plan Board — plugin process half (`io.github.galaxyxieyu.plan-board`).
 *
 * Owns the `plan` Agent tool (submit / get / progress) and the `plugin.call`
 * methods the renderer card uses. Plans are stored as JSON files in this
 * plugin's own data directory (pi.plugin.getDataPath()); nothing else on disk
 * is touched and no network is used.
 *
 * The tool never waits for the user: submit stores the plan and returns at
 * once (the host cuts plugin tools at 110 s). Approval comes back as the
 * user's next message, which tells the model to call `get`.
 */
const { join } = require("node:path");
const { pathToFileURL } = require("node:url");

let store = null;
let spec = null;
let schema = null;

const load = (file) => import(pathToFileURL(join(__dirname, "lib", file)).href);

function coded(error) {
  if (error && error.code) return error;
  return Object.assign(new Error(error instanceof Error ? error.message : String(error)), { code: "PLAN_FAILED" });
}

async function onLoad() {
  spec = await load("tool-spec.mjs");
  schema = await load("plan-schema.mjs");
  const { createPlanStore } = await load("plan-store.mjs");
  store = createPlanStore(await pi.plugin.getDataPath());
  await pi.agent.registerTool({
    name: spec.TOOL_NAME,
    description: spec.TOOL_DESCRIPTION,
    risk: "low",
    schema: spec.TOOL_SCHEMA,
    execute: async (args, ctx) => {
      try {
        return await runTool(args || {}, ctx || {});
      } catch (error) {
        throw coded(error);
      }
    },
  });
}

async function runTool(args, ctx) {
  switch (args.action) {
    case "submit": {
      const plan = await store.submit(args, {
        ...(ctx.sessionId ? { sessionId: ctx.sessionId } : {}),
        ...(ctx.turnId ? { turnId: ctx.turnId } : {}),
      });
      ctx.log?.(`submitted ${plan.id} with ${plan.steps.length} steps`);
      return {
        planId: plan.id,
        revision: plan.revision,
        status: plan.status,
        stepCount: plan.steps.length,
        message: "计划已提交到 Plan Board 卡片，等待用户修改和批准。现在结束本轮：用一两句话告诉用户在卡片里审阅、可直接编辑，然后点「批准并执行」。不要修改任何文件，不要继续执行。",
      };
    }
    case "get": {
      const plan = await store.startExecution(String(args.planId || ""));
      return {
        planId: plan.id,
        revision: plan.revision,
        status: plan.status,
        plan,
        brief: schema.executionBrief(plan),
        message: `这是用户批准的 r${plan.revision}，以它为准（用户可能改过步骤、依赖或设计）。按 brief 的顺序执行，每步开始和完成都调用 action="progress"。`,
      };
    }
    case "progress": {
      const r = await store.progress(String(args.planId || ""), String(args.stepId || ""), String(args.status || ""), args.note);
      return {
        planId: r.plan.id,
        stepId: args.stepId,
        status: args.status,
        done: r.done,
        total: r.total,
        remaining: r.remaining,
        planStatus: r.plan.status,
        message: r.remaining.length ? `已记录。剩余步骤：${r.remaining.join(", ")}` : "全部步骤已完成。请总结执行结果。",
      };
    }
    default:
      throw Object.assign(new Error(`unknown action ${JSON.stringify(args.action)}; use submit, get or progress`), { code: "PLAN_INVALID" });
  }
}

async function onUnload() {
  try { await pi.agent.unregisterTool("plan"); } catch { /* already gone */ }
}

/** `plugin.call` target for the renderer card. Thrown codes reach the card. */
async function onRendererCall(method, args) {
  if (!store) throw Object.assign(new Error("Plan Board is still loading"), { code: "PLAN_LOADING" });
  const a = args && typeof args === "object" ? args : {};
  try {
    switch (method) {
      case "plan.get":
        return await store.get(String(a.planId || ""));
      case "plan.save":
        return await store.saveRevision(String(a.planId || ""), { steps: a.steps, design: a.design });
      case "plan.approve":
        return await store.approve(String(a.planId || ""), a.steps ? { steps: a.steps, design: a.design } : undefined);
      default:
        throw Object.assign(new Error(`unknown method ${method}`), { code: "PLAN_UNKNOWN_METHOD" });
    }
  } catch (error) {
    throw coded(error);
  }
}

module.exports = { onLoad, onUnload, onRendererCall };
