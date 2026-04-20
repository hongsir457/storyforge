# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

## 语言规范

- 回答用户时使用中文
- 代码、命令、路径、环境变量保留原始英文标识

## 项目概览

对外产品品牌：

- `Storyforge`
- `叙影工场`

仓库内部兼容标识：

- `autovideo`

Storyforge 是一个面向“小说 -> 分镜 -> 视频”的 AI 工作台。当前主干能力包括：

- 小说工坊与 `autonovel` 自动写小说流程
- 项目、角色、线索、分镜、宫格图、视频片段生成
- 注册、登录、邮箱验证、忘记密码、账号页
- OpenRouter / Anthropic 文本模型接入
- PostgreSQL + Redis 的分层部署

## 代码结构

```text
frontend/   React 19 + TypeScript + wouter + zustand
server/     FastAPI 路由、认证、服务层、agent runtime
lib/        核心能力：配置、数据库、媒体后端、队列、项目管理
autonovel/  自动写小说流水线
deploy/     Docker Compose、生产部署、Sealos 清单
```

## 常用命令

```bash
# 安装依赖
uv sync
cd frontend && pnpm install

# 数据库迁移
uv run alembic upgrade head

# 后端
uv run uvicorn server.app:app --reload --port 1241

# 前端
cd frontend
pnpm dev

# 检查
uv run ruff check .
cd frontend && pnpm check
```

## 关键运行入口

前端主要页面：

- `/login`
- `/register`
- `/verify-email`
- `/forgot-password`
- `/app/account`
- `/app/settings`
- `/app/projects`
- `/app/novel-workbench`

后端 API 统一挂在：

- `/api/v1`

核心路由位于：

- `server/routers/`

## 架构要点

### 认证与账号

- 管理员账号由环境变量初始化
- 普通用户、配置和凭据存储在 PostgreSQL
- SMTP 未配置时可通过 `AUTH_EMAIL_DEBUG=true` 调试验证和重置流程

### 文本模型

`Storyforge Agent` 当前支持：

- Anthropic 官方 API
- OpenRouter 的 Anthropic-compatible 路径

相关配置入口：

- 前端：`/app/settings`
- 后端：`server/routers/system_config.py`
- 配置服务：`lib/config/service.py`

### 小说工坊

- 页面入口：`/app/novel-workbench`
- 服务层：`server/services/autonovel_workbench.py`
- 流水线目录：`autonovel/`

### 数据存储

- 开发默认：`projects/.autovideo.db`
- 生产默认：PostgreSQL
- 异步支撑：Redis

ORM 和仓储位于：

- `lib/db/models/`
- `lib/db/repositories/`

### 媒体生成

统一抽象位于：

- `lib/image_backends/`
- `lib/video_backends/`
- `lib/text_backends/`

内置或兼容的供应商能力包括：

- Gemini
- 火山方舟
- Grok
- OpenAI
- OpenRouter
- 自定义兼容供应商

## 文档约定

- 更新用户可见文案时，同时检查 `README.md`、`README.en.md`、`docs/getting-started.md`
- 更新部署能力时，同时检查 `deploy/sealos/README.md` 和生产部署说明
- 变更品牌时，区分清楚“对外品牌 Storyforge / 叙影工场”和“内部兼容标识 autovideo”

## 质量要求

- Python 代码改动前后优先跑 `ruff`
- 前端改动优先跑 `pnpm check`
- 新增用户可见文本时，同时补齐中英文 i18n key
