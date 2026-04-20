# 完整入门教程

这份教程面向当前版本的 `Storyforge / 叙影工场`，目标是带你从零完成部署、登录、模型配置，并跑通“小说工坊”到项目资产生成的最小闭环。

## 你会完成什么

1. 部署 Storyforge
2. 初始化管理员账号
3. 配置 Anthropic 或 OpenRouter
4. 配置至少一个图像或视频供应商
5. 进入 `小说工坊` 启动自动写小说流程
6. 把结果导回项目并继续做分镜和视频

## 先理解当前架构

当前线上和生产部署已经不是单体容器，而是四个工作负载：

- `storyforge-frontend`
- `storyforge-backend`
- `storyforge-postgres`
- `storyforge-redis`

本地开发默认仍可先用 SQLite 跑起来，生产环境建议直接用 PostgreSQL。

## 准备项

### 1. 运行环境

- Linux / macOS / Windows WSL2
- Docker 和 Docker Compose
- 至少 4GB 可用内存

### 2. 必需配置

你至少需要准备两类能力：

- 文本大模型
- 图像或视频生成模型

当前推荐路径：

- 文本模型：Anthropic 官方 API，或 OpenRouter
- 图像/视频模型：Gemini、火山方舟、Grok、OpenAI，或自定义兼容供应商

### 3. OpenRouter 和 Anthropic 的区别

如果你想用一把 key 统一走 Claude、GPT、Gemini 等文本模型，推荐直接使用 OpenRouter。

当前产品里：

- `Storyforge Agent` 支持 Anthropic 官方 API
- 也支持 OpenRouter 的 Anthropic-compatible 接法
- OpenRouter 推荐通过前端设置页完成，不需要你手改额外配置文件

## 部署方式一：默认部署（SQLite）

适合本地快速试用。

```bash
git clone https://github.com/hongsir457/storyforge.git
cd storyforge/deploy
cp .env.example .env
docker compose up -d
```

启动后访问：

- 本地：`http://localhost:1241`

## 部署方式二：生产部署（PostgreSQL）

适合正式使用或多人环境。

```bash
git clone https://github.com/hongsir457/storyforge.git
cd storyforge/deploy/production
cp .env.example .env
```

至少补齐这些环境变量：

```env
POSTGRES_PASSWORD=replace-me
AUTH_USERNAME=admin
AUTH_PASSWORD=replace-me
AUTH_EMAIL=admin@storyforge.local
AUTH_TOKEN_SECRET=replace-me-with-a-long-random-secret
```

然后启动：

```bash
docker compose up -d
```

如果你需要注册、邮箱验证、忘记密码真实可用，再继续补齐：

```env
SMTP_HOST=
SMTP_PORT=587
SMTP_USERNAME=
SMTP_PASSWORD=
SMTP_FROM_EMAIL=
SMTP_FROM_NAME=Storyforge
```

如果暂时没有 SMTP，可以先打开：

```env
AUTH_EMAIL_DEBUG=true
```

这样验证码和重置码会打印到后端日志。

## 首次登录

启动完成后访问登录页：

- `/login`

管理员账号来自环境变量：

- 用户名：`AUTH_USERNAME`
- 密码：`AUTH_PASSWORD`

当前账号体系完整入口包括：

- `/login`
- `/register`
- `/verify-email`
- `/forgot-password`
- `/app/account`

## 首次配置模型

登录后进入：

- `/app/settings`

### 路径 A：使用 OpenRouter

推荐给想统一调 Claude、GPT、Gemini 的用户。

1. 在设置页找到 `OpenRouter API Key`
2. 填入你的 OpenRouter key
3. 应用 OpenRouter 预设
4. 确认 Anthropic 兼容地址为 `https://openrouter.ai/api`

建议同时检查默认文本模型是否符合你的预算和质量要求。

### 路径 B：使用 Anthropic 官方 API

如果你只想先让 `Storyforge Agent` 和小说工坊跑起来，也可以直接填写 Anthropic API Key。

### 图像与视频供应商

自动写小说之外，后续角色图、分镜图、视频片段仍然依赖图像或视频供应商。你至少要配置其中一个：

- Gemini
- 火山方舟
- Grok
- OpenAI
- 自定义兼容供应商

## 跑通小说工坊

### 1. 创建项目

进入：

- `/app/projects`

你可以：

- 新建项目
- 上传小说源文件
- 导入历史项目 ZIP

### 2. 进入小说工坊

入口：

- `/app/novel-workbench`

需要填写的核心信息：

- 小说标题
- Seed 文案
- 风格
- 画幅
- 默认时长

然后点击启动小说流水线。

### 3. 流程实际做了什么

小说工坊会调用 `autonovel` 流程，生成结构化的叙事结果，并把结果导回 Storyforge 项目。你之后就可以继续：

- 生成角色设定图
- 生成线索或道具图
- 生成分镜图
- 生成宫格图
- 生成视频片段
- 导出项目 ZIP
- 导出剪映草稿

## 最小可用闭环

如果你想最快验证整条链路，建议按这个顺序：

1. 用 PostgreSQL 或默认 SQLite 部署成功
2. 用管理员登录
3. 在 `/app/settings` 配好 OpenRouter 或 Anthropic
4. 至少再配一个图像供应商
5. 在 `/app/novel-workbench` 启动小说流水线
6. 回到项目里验证角色、分镜和视频生成入口可用

## 常见问题

### 1. 为什么登录、注册、忘记密码没有邮件？

因为你还没配置 SMTP。
如果只是在本地联调，先开 `AUTH_EMAIL_DEBUG=true`。

### 2. 为什么小说工坊按钮不可用？

通常是因为 `Storyforge Agent` 没配置好。优先检查：

- 是否已填 Anthropic 或 OpenRouter
- 是否保存成功
- 后端日志里是否有认证错误

### 3. 为什么能写小说，但后续图像或视频生成失败？

因为小说工坊和媒体供应商是两套能力。
文本模型可用，不代表图像和视频供应商已经配置完成。

### 4. 为什么仓库和某些文件里还会看到 `autovideo`？

这是当前仓库内部兼容标识，用于迁移和历史文件命名。
对外品牌仍然是：

- `Storyforge`
- `叙影工场`

## 进一步阅读

- [README.md](../README.md)
- [deploy/sealos/README.md](../deploy/sealos/README.md)
- [deploy/production/MIGRATE-TO-POSTGRES.md](../deploy/production/MIGRATE-TO-POSTGRES.md)
- [docs/jianying-export-guide.md](jianying-export-guide.md)

如果部署后要接 Sealos 独立命名空间，请直接看 Sealos 部署文档，不要再沿用旧的单体 SQLite 迁移方式。
