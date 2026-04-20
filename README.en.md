<h1 align="center">
  <br>
  <picture>
    <source media="(prefers-color-scheme: light)" srcset="frontend/public/storyforge-logo.png">
    <source media="(prefers-color-scheme: dark)" srcset="frontend/public/storyforge-logo.png">
    <img src="frontend/public/storyforge-logo.png" alt="Storyforge Logo" width="168" style="border-radius: 16px;">
  </picture>
  <br>
  Storyforge
  <br>
</h1>

<h4 align="center">AI novel&video studio</h4>

<p align="center">
  <a href="README.md"><img src="https://img.shields.io/badge/lang-中文-red?style=flat-square" alt="Chinese"></a>
  <a href="README.en.md"><img src="https://img.shields.io/badge/lang-English-blue?style=flat-square" alt="English"></a>
</p>

<p align="center">
  <a href="https://github.com/hongsir457/storyforge/actions/workflows/docker.yml"><img src="https://img.shields.io/github/actions/workflow/status/hongsir457/storyforge/docker.yml?style=for-the-badge&label=Docker" alt="Docker"></a>
  <a href="https://github.com/hongsir457/storyforge"><img src="https://img.shields.io/github/stars/hongsir457/storyforge?style=for-the-badge" alt="Stars"></a>
  <a href="https://github.com/hongsir457/storyforge/blob/main/LICENSE"><img src="https://img.shields.io/badge/License-AGPL--3.0-green?style=for-the-badge" alt="License"></a>
</p>

<p align="center">
  <img src="docs/assets/hero-screenshot.png" alt="Storyforge Workspace" width="800">
</p>

---

## Live Workspace

- Public URL: `https://bjmmuazhczom.cloud.sealos.io`
- Chinese brand shown in the UI: `叙影工场`
- Product subtitle: `AI novel&video studio`
- Current isolated Sealos namespace: `ns-qkcc8vj1`

## What Storyforge Is

Storyforge is a narrative production workspace for the pipeline from novel seed to chapters, then from chapters to storyboards and video clips. It is not a general-purpose video editor. The core value is narrative consistency: worldbuilding, recurring characters, clue reuse, and controlled long-form generation.

## Brand vs Internal Identifier

- Public product brand: `Storyforge / 叙影工场`
- Internal compatibility identifier: `autovideo`
- You will still see `autovideo` in a few internal filenames and migration tools, for example:
  - `projects/.autovideo.db`
  - `autovideo-export.json`
  - `tools/import_autonovel_to_autovideo.py`

If you are migrating older data or grepping the repo, search `autovideo` first.

## Production Topology

The current deployment is a split stack:

- `storyforge-frontend`: React 19 workspace UI
- `storyforge-backend`: FastAPI API, auth, project services, agent runtime
- `storyforge-postgres`: unified PostgreSQL database
- `storyforge-redis`: cache and async task support

Sealos deployment notes are in [deploy/sealos/README.md](deploy/sealos/README.md).

## Managed Auth Flows

The hosted frontend now includes:

- `/login`
- `/register`
- `/verify-email`
- `/forgot-password`
- `/app/account`

Bootstrap admin comes from environment variables. Regular users and runtime settings are stored in PostgreSQL. If SMTP is not wired yet, `AUTH_EMAIL_DEBUG=true` can log verification and reset codes in backend logs.

## Models and OpenRouter

`Storyforge Agent` supports:

- Anthropic official API
- OpenRouter via Anthropic-compatible routing

Recommended OpenRouter setup:

1. Open `/app/settings`
2. Paste `OpenRouter API Key`
3. Apply the OpenRouter preset
4. Confirm the Anthropic-compatible base URL becomes `https://openrouter.ai/api`

Image and video generation still require at least one configured provider such as Gemini, Volcengine Ark, Grok, OpenAI, or a custom compatible provider.

## Quick Start

> Recommended platform: Linux, macOS, or Windows WSL2. Some Claude Agent SDK dependencies are not supported on native Windows shells.

### Default deployment (SQLite)

```bash
git clone https://github.com/hongsir457/storyforge.git
cd storyforge/deploy
cp .env.example .env
docker compose up -d
```

Then open `http://localhost:1241`.

### Production deployment (PostgreSQL)

```bash
cd storyforge/deploy/production
cp .env.example .env
# Set POSTGRES_PASSWORD and other required env vars
docker compose up -d
```

### First-time setup

1. Sign in as `admin`
2. Open `/app/settings`
3. Configure Anthropic or OpenRouter for `Storyforge Agent`
4. Configure at least one image or video provider
5. Configure SMTP if you need real registration and password-reset email delivery

## Usage Flow

1. Create a project in `/app/projects`
2. Upload a source novel or import an existing project ZIP
3. Open `/app/novel-workbench`
4. Fill title, seed prompt, style, aspect ratio, and default duration
5. Launch the automated novel pipeline
6. Import the generated narrative output back into the project
7. Continue with characters, clues, storyboards, grids, video clips, and export

## Core Capabilities

- Novel-to-video workflow in one workspace
- Multi-agent orchestration on top of Claude Agent SDK
- OpenRouter support for Claude, GPT, Gemini, and other routed text models
- Multi-provider image and video generation
- Managed auth flows with registration and password reset
- PostgreSQL-backed configuration, users, tasks, and usage data
- Redis-backed async queue and caching support
- Project ZIP import and export
- CapCut draft export
- Cost tracking across providers

## Docs

- [docs/getting-started.md](docs/getting-started.md): deployment and first-run guide
- [deploy/sealos/README.md](deploy/sealos/README.md): Sealos split-stack deployment notes
- [deploy/production/MIGRATE-TO-POSTGRES.md](deploy/production/MIGRATE-TO-POSTGRES.md): migrate from SQLite to PostgreSQL
- [docs/jianying-export-guide.md](docs/jianying-export-guide.md): CapCut draft export guide
- [CONTRIBUTING.md](CONTRIBUTING.md): contributor workflow
- [CLAUDE.md](CLAUDE.md): repository map for coding agents

## Contributing

Issues, PRs, and documentation fixes are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a change.

## License

[AGPL-3.0](LICENSE)
