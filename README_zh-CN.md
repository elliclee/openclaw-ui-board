# OpenClaw UI Board

🌐 [English](README.md) | [中文](README_zh-CN.md)

一个现代化的 web 端 **OpenClaw Cron** 及其智能 Agent 任务的可视化管理面板。

本开源项目旨在为强大但基于命令行（CLI）驱动的 OpenClaw 提供一个优雅的 GUI 替代方案。通过类似 Vercel / Linear 的高级「暗黑模式」面板，让你可以在浏览器中轻松总览、配置监控并调度所有的自动化智能体。

## ✨ 核心特性

- **现代 & 响应式 UI**: 深度打磨的玻璃拟物设计，专为清晰度打造的“Premium Dark”高级深色主题。
- **远程安全控制**: 直接通过 SSH 连接到运行 `openclaw` 的任何服务器 / VPS 执行命令。无需在服务器上额外部署面板进程。
- **精细化的定时功能管理**:
  - 自动解析原生 `openclaw cron list --json` 并在列表中清晰展示。
  - 支持一键 **启用**、**禁用**、**立即运行** 或 **强制删除** 任务。
- **全功能可视化编辑器**:
  - 用可视化表单轻松编辑复杂的时间配置 (Cron 表达式与时区)。
  - 定义投递路由（`Delivery`）模式（静默或公告），支持 Channel（Telegram, Slack 等）以及会话对象配置。
  - 内置了文本域编辑器，用来调试发给大模型的指令文本 (`Payload Message`)，告别在命令行打转义字符的苦恼。
- **执行历史与回溯**: 聚合查阅控制台日志，查看近 200 次的精准执行耗时、成功/失败状态，以及详细的 JSONL 原生输出。
- **安全优先**: 密码、私钥和IP信息等敏感内容绝不会写入代码库，所有连接凭证仅在启动时一次性保存在你本地的 `~/.openclaw-cron-ui/config.json` 当中。

---

## 🚀 快速开始

### 1. 环境依赖

- **Node.js**: v18 或更高版本
- **OpenClaw**: 在你的远程或本地机器上确保 `openclaw` 核心已正确配置。

### 2. 克隆与安装

将仓库克隆到本地机器上（注意，这是安装在你*操作的电脑*上，不是服务器上）：

```bash
git clone https://github.com/elliclee/openclaw-ui-board.git
cd openclaw-ui-board

# 同时安装后端与前端的依赖
npm install
cd client && npm install
cd ..
```

### 3. 本地启动服务

在项目根目录下通过一条命令即可同时启动 Node.js API 端点和 Vite 前端：

```bash
npm run dev
```

- 本地 API 监听: `http://localhost:9009`
- 浏览器面板地址: `http://localhost:5173`

### 4. 首次配置使用指引

首次打开网页时，面板会引导你输入能够访问到你服务器的 SSH 详情。这些配置会安全地保留在你这台电脑的 `~/.openclaw-cron-ui/config.json`里。

**场景 A: 面板环境与服务器分开（使用 SSH 远程登录）**
这是最推荐的管理方式（面板在你的个人 Mac/PC 上跑，管理远端服务器的进程）：
- 填写远端服务器的**Host（IP）**、**Port**以及**Username**。
- 认证方式：填写远程的 **Password** 或者填写本地 SSH 私钥路径（如 `~/.ssh/id_rsa`）。
- 填写远程机器上安装的 **OpenClaw Binary Path**的绝对路径（如 `/usr/local/bin/openclaw` 或默认环境里的 `openclaw`）。

**场景 B: 在装有 openclaw 的机器上直接运行该面板（本地执行）**
- **Host 留空** (或输入 `localhost` 或 `127.0.0.1`)。
- 输入这台机器里有效的 **OpenClaw Binary Path**。
- 此时所有 SSH 凭据都会被忽略，面板直接利用系统级命令触发工具。

## 🛠️ 技术栈清单

- **前端**: React 18, Vite, TypeScript, Vanilla CSS (使用原生 CSS 变量设计系统).
- **服务端**: Node.js, Express, `ssh2` (作为直接对接远端的桥梁).
- **架构**: 经典 REST API 交互.

## 📄 开源许可证协议

本项目遵循 MIT License 协议——您可以随意分发与商用定制，详见 [LICENSE](LICENSE) 说明文件。
