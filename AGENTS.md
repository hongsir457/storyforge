# AGENTS.md

This file provides guidance to Codex when working with this repository.

## 语言规范

- 面向用户的回复统一使用中文
- 代码、命令、路径、环境变量沿用英文原名

## 产品定位

对外产品品牌：

- `Storyforge`
- `叙影工场`

内部兼容标识：

- `autovedio`

Storyforge 不是通用视频编辑器，而是围绕“小说 -> 分镜 -> 视频”的叙事生产工作台。重点是：

- 长篇小说生成与导回项目
- 角色、线索、世界观一致性
- 从章节到分镜和视频片段的连续生产

## 仓库结构

```text
frontend/   React 工作台
server/     FastAPI API、认证、系统配置、agent runtime
lib/        核心库、数据库、供应商抽象、任务队列
autonovel/  小说自动生成流程
deploy/     Docker、生产部署、Sealos
docs/       用户文档与设计文档
```

## 常用命令

```bash
uv sync
uv run alembic upgrade head
uv run uvicorn server.app:app --reload --port 1241

cd frontend
pnpm install
pnpm dev
pnpm check
```

## 关键页面与配置入口

页面：

- `/login`
- `/register`
- `/verify-email`
- `/forgot-password`
- `/app/account`
- `/app/settings`
- `/app/projects`
- `/app/novel-workbench`

说明：

- 不要再把设置页写成旧的 `/settings`
- 用户不需要手改 `.env` 才能配置模型；常规入口是前端设置页

## 后端重点

主要路由目录：

- `server/routers/`

重点模块：

- `auth.py` / `api_keys.py`
- `system_config.py`
- `providers.py`
- `projects.py`
- `generate.py`
- `assistant.py`
- `agent_chat.py`

服务层：

- `server/services/autonovel_workbench.py`
- `server/services/generation_tasks.py`
- `server/services/project_archive.py`
- `server/services/jianying_draft_service.py`

## 数据与部署

- 开发默认 SQLite：`projects/.autovedio.db`
- 生产部署使用 PostgreSQL
- Redis 用于异步任务和缓存
- Sealos 当前为前后端分离部署

线上公共地址：

- `https://bjmmuazhczom.cloud.sealos.io`

## 模型与供应商

文本模型：

- Anthropic 官方 API
- OpenRouter Anthropic-compatible

媒体供应商：

- Gemini
- 火山方舟
- Grok
- OpenAI
- 自定义兼容供应商

相关实现位于：

- `lib/text_backends/`
- `lib/image_backends/`
- `lib/video_backends/`
- `lib/config/`

## 文档同步要求

如果改动以下内容，必须同步文档：

- 品牌、产品定位
- 部署拓扑
- 登录/注册/忘记密码/验证流程
- 设置页模型配置方式
- OpenRouter、Anthropic、供应商接入方式

优先检查：

- `README.md`
- `README.en.md`
- `docs/getting-started.md`
- `deploy/sealos/README.md`

## 质量要求

- Python 改动先跑 `uv run ruff check .`
- 前端改动先跑 `pnpm check`
- 新的用户文案需要同步中英文 i18n
