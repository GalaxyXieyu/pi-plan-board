# 验收记录 — Plan Board 0.1.0 @ 官方 PI-Desktop v0.17.0

日期：2026-10-08（Asia/Shanghai）
环境：box 上的官方 `PI-Desktop-0.17.0-linux-x86_64.AppImage`（解包运行，Xvfb），隔离的数据目录、Electron profile 和 HOME。
模型：自建网关上的 aigalaxy / gpt-6-astra，Agent 模式，权限 Auto。
安装方式：`pi-plugin pack` 打出 `.piplug`，再调用 host RPC `plugins.installFromPackage`（扩展页“从安装包安装”用的就是这个 RPC，只是跳过了原生文件选择框），并授予 `renderer.extension` 和 `agent.tool.register` 两个权限。扩展页显示为普通已安装插件，不是 Dev（见 10）。
操作方式：通过 CDP 发送真实（trusted）的鼠标和键盘事件。项目和会话通过 MCP control 创建（`PI_DESKTOP_MCP_CONTROL=1`）。

## 流程与截图

| # | 步骤 | 截图 |
| --- | --- | --- |
| 1 | 点「📋 先出计划」，输入需求（run3 的同一需求，去掉 “调用 SubmitPlan”） | `01-toggle-and-prompt.png` |
| 2 | 模型 ToolSearch → `plan` submit（一次通过，38s），卡片显示 5 步和依赖，状态“待批准 r1” | `02-plan-card-submitted.png`、`02a-turn-end-collapsed.png` |
| 3 | 依赖成环保护：第 1 步的依赖候选全部灰掉，标注“（会成环）” | `03-cycle-guard.png` |
| 4 | 改第 4 步标题（加 “Web Audio，不引入音频文件”），去掉第 4 步对第 2 步的依赖 → 自动保存 r2 | `04-steps-edited.png` |
| 5 | 设计规范：框架从模型写的“沿用现有；默认原生 HTML/CSS/JS”改成 html，加关键词“番茄红点缀” → r3（标题字号模型原本就是 32px） | `05-design-edited.png` |
| 6 | 点「批准并执行」→ 输入框出现「▶ 执行计划 r3」芯片，卡片变为“已批准” | `06-approved-chip-in-composer.png` |
| 7 | 回车发送 → 模型 get（读到 r3）→ 每步 progress，卡片每 2 秒刷新（2/5） | `07-progress-running.png`、`07b-progress-rows-in-transcript.png` |
| 8 | 5/5 完成（16m18s，93 次工具调用） | `08-progress-final-card.png`、`08b-final-answer.png` |
| 9 | 重启应用（强杀进程）并覆盖重装最终包，卡片仍为“已完成 r3”，设计改动仍在 | `09-after-restart.png`、`09b-after-restart-design.png` |
| 10 | 扩展页：Plan Board v0.1.0 是已安装插件 | `10-installed-in-extensions.png` |
| 11 | （dev 实例）「要改…」→「✎ 修改计划」芯片 → 模型带 `replaces` 重新提交，旧卡片显示“已被新版本替代” | `11-revise-new-plan-dev.png`、`11a-revise-old-superseded-dev.png` |

工具调用顺序（来自会话记录）：`submit get progress:s1=in_progress s1=completed s2=in_progress s2=completed s4=in_progress s4=completed s3=in_progress s3=completed s5=in_progress s5=completed`。s4 在 s3 之前执行，因为批准的 r3 里 s4 只依赖 s1。

批准的改动确实被执行了：s4 改成只依赖 s1 后，模型就把 s4 放到 s3 前面做（见上面的调用顺序）；s4 标题里加的“Web Audio，不引入音频文件”也照做了，提示音在 `app.js:20` 用 `AudioContext` 实现，项目里没有音频文件；`style.css:33` 的 `h1` 是设计规范里的 32px / 700。

另外在 dev 实例（loadDev）上用同一需求完整跑了一遍（5/5）。其间插件热重载了两次，进度上报和卡片都没受影响。

## 与 fork run3 的对比（`compare/`）

左边是 fork run3（v0.16.1 原生 Plan 面板），右边是插件。
- `01-steps-edited.png`、`02-cycle-guard.png`：步骤编辑和成环保护两边都有。插件的依赖显示为 `#序号 标题` 标签，不会成环的才能选。
- `03-design-edited.png`：设计规范的字段一致（框架、组件库、关键词、字体三级、四组配色）。
- `04-progress-running.png`、`05-progress-final.png`：fork 在右侧面板显示 Tasks 和 Graph；插件在对话内的卡片上显示，并在工具记录里加进度行。
- 插件没有 DAG 图（按计划放在 v0.2）、没有 Plan 模式（v0.3）、没有一键执行（v0.1 需要用户自己回车）。

## 已知限制

- 卡片在本轮的工具记录里。回合结束后宿主会把记录折叠成 “Processed for …”，要点开才能看到卡片（`02a`）。这是宿主行为，插件改不了。
- 第一次 dev 运行时，模型的 `design.framework` 写了长句，超过 40 字被拒，第二次提交才成功。之后在工具 schema 里写明了每个字段（含 maxLength 和不允许多余键），验收运行一次就提交成功。
- 原生 `<select>` 的下拉弹层截不到图，所以成环截图是临时把 select 展开成列表拍的（`size=n`）。
- 重启用的是强杀：这个构建的主进程不响应 SIGTERM。数据走原子写入，没有丢失。
