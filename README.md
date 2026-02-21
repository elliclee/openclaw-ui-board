# OpenClaw UI Board

🌐 [English](README.md) | [中文](README_zh-CN.md)

A sleek, modern web-based management dashboard for **OpenClaw Cron** and autonomous **AI agent** automation tasks.

This project provides a graphical interface (GUI) to managing the powerful but CLI-focused OpenClaw Cron system. It allows you to monitor, edit, and orchestrate your AI agents, job scheduler, and background tasks seamlessly through an elegant, Vercel/Linear-inspired dark mode dashboard.

## ✨ Features

- **Modern & Responsive UI**: Glassmorphism, precise typography, and a "Premium Dark" theme designed for clarity.
- **Remote Orchestration**: Connects directly to any VPS running `openclaw` via SSH to fetch statuses and execute commands. Safe and centralized.
- **Granular Cron Management**:
  - Automatically parse `openclaw cron list --json` and provide visual states.
  - Enable, Disable, Run instantly, or Delete tasks directly from the UI.
- **Advanced Job Editor**:
  - Visually edit scheduling (cron expressions) and timezone configurations.
  - Configure `Delivery` modes (`announce` or `none`), Channels (Telegram, Slack, Feishu), and routing targets.
  - Reconfigure models and edit task `Payload Messages` inside a comfortable textarea without dealing with CLI escape characters.
- **Execution History Tracking**: Integrated logs viewing. See exact duration, success/error status, and Raw JSONL outputs for the last 200 runs of any task.
- **Security-First Config**: Credentials never touch the Git repository. Your SSH keys and server configs are stored locally inside `~/.openclaw-cron-ui/config.json`.

---

## 🚀 Quick Start

### 1. Requirements

- **Node.js**: v18 or newer
- **OpenClaw**: Valid installation of `openclaw` binary on your remote target machine / VPS.

### 2. Installation

Clone this repository to your local machine:

```bash
git clone https://github.com/elliclee/openclaw-ui-board.git
cd openclaw-ui-board

# Install dependencies for both the Backend and Frontend
npm install
cd client && npm install
cd ..
```

### 3. Running the App

You can start both the backend Node.js server and the Vite React frontend concurrently with one command:

```bash
npm run dev
```

- The API server will run on `http://localhost:9009`
- The Frontend will open on `http://localhost:5173`

### 4. Configuration

Upon your first launch, the dashboard will prompt you to enter your Connection credentials. These settings are safely saved locally to `~/.openclaw-cron-ui/config.json` on your computer, keeping them completely out of the codebase.

**Mode A: Local Execution (Same Machine)**
If you are running this dashboard on the same machine where `openclaw` is installed (e.g. running directly on the VPS or on your local Mac):
- Simply leave **Host** empty (or enter `localhost`). 
- Enter the correct **OpenClaw Binary Path** (e.g. `openclaw` if globally accessible, or `/usr/local/bin/openclaw`).
- SSH credentials are ignored.

**Mode B: Remote Execution (over SSH)**
If running the dashboard on your laptop to manage a remote VPS:
- Enter the **Host**, **Port**, and **Username** of the remote server.
- Enter **Password** OR **SSH Private Key Path** (e.g. `~/.ssh/id_rsa`).
- Set the **OpenClaw Binary Path** on the remote server.

## 🛠️ Tech Stack

- **Frontend**: React 18, Vite, TypeScript, Vanilla CSS.
- **Backend**: Node.js, Express, `ssh2` (for bridging local UI commands directly to your secure server).
- **Communication**: REST API.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
