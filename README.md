# 暮色 · DuskWeave

| 目录 | 内容 |
| --- | --- |
| [ensocode/](ensocode/) | 保留 EnsoCode 原始源码，基线 `ded32f21`，包括上游文档、原始许可和历史发布工作流。 |
| [dusk/](dusk/) | 暮色桌面应用。在这边开发，依赖和启动命令都在该目录独立运行。 |

用户原有的[设计素材](dusk/design/)与[交互画板](dusk/design/dusk-workspace.vetd/)一起迁入 `dusk/`，原型文件内容没有改动。

## 运行暮色

需要 Node.js 22 或更新版本。已安装 pnpm 的环境可以省略 `corepack`：

```bash
cd dusk
corepack pnpm install --frozen-lockfile
corepack pnpm dev
```

详见[暮色开发说明](dusk/README.md)。原版也可在 `ensocode/` 下独立安装、启动。两版各用自己的应用数据，不自动读取或迁移对方的设置。上游发布工作流仅作归档，不会从当前仓库根目录触发。
