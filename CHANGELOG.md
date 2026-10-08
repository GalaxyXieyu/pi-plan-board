# Changelog

## 0.1.1 (unreleased)

- Restyle: monochrome on host tokens, no emoji anywhere (inline line icons instead).
- Steps: dependencies shown as one quiet line ("依赖 1、2", full titles on hover); edited in an inline checklist with cycle-forming steps disabled. Step ids hidden; move/delete/detail controls appear on hover or focus.
- Composer chips: "先出计划", "执行计划 rN", "修改计划" (no symbols).

## 0.1.0 (unreleased)

- `plan` Agent tool: `submit` / `get` / `progress`.
- Tool card: editable steps (title, detail, order, add/delete), dependencies as labelled chips with a cycle guard, design-spec tab (framework, component library, keywords, font system, color groups), markdown summary tab.
- Approve fills the composer with a "▶ 执行计划 rN" chip; the user presses Enter to start execution.
- Composer toggle "📋 先出计划" asks the model to submit a plan first.
- Per-plan JSON storage with every revision kept, in the plugin data directory; survives restart.
- Live progress (2 s refresh while executing).
