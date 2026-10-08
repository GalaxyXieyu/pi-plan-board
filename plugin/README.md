# Plan Board（计划看板）

PI-Desktop 插件：让 Agent 先交一份**可编辑的实施计划**，你在卡片上改步骤、依赖和设计规范，批准后再让它按批准的版本执行，并实时看到每一步的进度。

## 用法

1. 在输入框左下角点 **📋 先出计划**，再写需求，回车。
2. 模型提交计划后，对话里出现 Plan Board 卡片（在本轮的工具记录里，点“Processed …”展开即可看到）：
   - **步骤**：改标题/说明、上下移动、删除、添加；依赖用 `#序号 标题` 的标签表示，可删可加，会成环的选项是灰的。
   - **设计规范**：框架、组件库、风格关键词、字体（标题/副标题/正文的字号字重，带预览）、配色。
   - **说明**：模型写的概要（markdown）。
   - 修改自动保存为新版本（r2、r3…）。
3. 点 **批准并执行**：输入框里会出现「▶ 执行计划 rN」，按回车发送，模型读取批准的版本并按依赖顺序执行。
4. 执行时卡片每 2 秒刷新进度。想让模型改计划：点 **要改…** 写意见，放进输入框后发送。

需要 Agent 模式（插件工具只在 Agent 模式下可用）。

## 权限与数据

- `agent.tool.register`：注册 `plan` 工具（风险等级 low）。
- `renderer.extension`：绘制计划卡片和输入框开关；只使用 `plugin.call`、`composer.readDraft`、`composer.replaceDraft`，且写输入框只发生在你点击按钮时。
- 计划只保存在本机插件数据目录：`~/.pi-desktop/plugins/data/io.github.galaxyxieyu.plan-board/plans/`，每个计划一个 JSON（保留全部版本），最多 200 个、30 天自动清理。
- 不联网，不读写项目文件。

## English

Plan Board lets the agent submit an editable implementation plan (steps with dependencies, plus an optional UI design spec). You edit it on a card, approve it, and the approved revision is what the agent executes, with live per-step progress. Data stays in the plugin data directory; no network access. License: MIT.
