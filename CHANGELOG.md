# Changelog

## 0.1.0 (unreleased)

- `plan` Agent tool: `submit` / `get` / `progress`.
- Tool card: editable steps (title, detail, order, add/delete), dependencies as labelled chips with a cycle guard, design-spec tab (framework, component library, keywords, font system, color groups), markdown summary tab.
- Approve fills the composer with a "▶ 执行计划 rN" chip; the user presses Enter to start execution.
- Composer toggle "📋 先出计划" asks the model to submit a plan first.
- Per-plan JSON storage with every revision kept, in the plugin data directory; survives restart.
- Live progress (2 s refresh while executing).
