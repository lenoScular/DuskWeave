# 暮色

暮色是基于 [EnsoCode](https://github.com/J3n5en/EnsoCode) 的本地桌面智能体工作台。可以在欢迎页打开项目目录，或新建不关联项目的临时会话。

## 启动

```bash
corepack pnpm install --frozen-lockfile
corepack pnpm dev
```

开发启动不强制下载辅助工具。需要 RTK 命令输出压缩时，可另行运行 `corepack pnpm rtk:prepare`。

- **打开项目目录**：使用系统目录选择器把项目加入左栏；打开目录不会自动新建会话。
- **新建临时会话**：使用暮色自己的临时工作区，不关联已有项目，历史仍可在侧栏找回。
- **会话主控**：欢迎页不展示角色选择。由欢迎页新建会话时，已有的非全局默认预设优先；否则使用云深预设。角色提示不改变工具权限，已建会话不会被改写。
- **模型设置**：复用现有模型服务商配置。没有配置可用模型也能建会话，但发送消息前必须先选模型。

## 设计和工程边界

正式桌面首屏以[首次启动原图](design/暮色-首次启动.png)为准。新建和恢复会话沿用同一原型侧栏，正式会话使用原型封面、在场伙伴栏和输入区，不显示 EnsoCode 的开场建议卡。对话模型设置使用暮色模型页，接入真实的兼容服务和本地服务。智能体名册、邀请集群、设计画布、生图设置和「桥边初会」仍打开隔离的原有[交互预览](design/暮色-历史会话交互预览.html)，不修改正式会话、配置或真实模型。会话历史、工具审批和模型运行继续复用已有逻辑。

应用数据目录使用 `duskweave-dev`（开发）和 `duskweave`（打包），属于各系统自己的应用数据目录。暮色不接管原版深链、全局终端集成或发行更新，也不自动读取原版的模型凭据和会话。

```bash
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm test
corepack pnpm build
```

基线与原始维护者信息见 [EnsoCode 原始说明](../ensocode/README.zh-CN.md)。沿用原项目 GNU AGPL-3.0-only 与附加许可，详见 [LICENSE](LICENSE)。
