# pi-plan-board

PI-Desktop 插件 **Plan Board** 的源码仓库。插件本体在 [`plugin/`](plugin/)（打包时只包含这个目录），说明见 [`plugin/README.md`](plugin/README.md)。

| 目录 | 内容 |
| --- | --- |
| `plugin/` | 插件：`manifest.json`、`main.js`（主进程，注册 `plan` 工具）、`lib/`（schema/存储/工具定义）、`renderer/`（卡片与开关） |
| `test/` | 单元测试：`npm test` |
| `scripts/sync-manifest.mjs` | 把工具 schema 同步进 manifest |
| `acceptance/` | 在官方 PI-Desktop v0.17.0 上的验收截图与驱动脚本 |

## 开发

```bash
npm test                               # schema / 校验 / 存储 单元测试
node scripts/sync-manifest.mjs         # 改了 lib/tool-spec.mjs 之后
pi-plugin check plugin                 # 用上游 plugin-devkit
pi-plugin pack plugin                  # 生成 plugin/dist/*.piplug
```

要求 PI-Desktop ≥ 0.17.0（需要 renderer slots：`toolCard`、`composerControl`）。

计划数据格式 `pi.plan/v1`：`{schema, id, title, summary, status, revisions[{revision, steps[{id,title,detail?,dependsOn[]}], design?, source}], approvedRevision?, progress{stepId:{status,note?}}}`。

License: MIT. 不包含任何来自 PI-Desktop（LGPL-3.0）的代码。
