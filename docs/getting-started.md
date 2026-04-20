# Storyforge 入门指南

这份文档面向第一次部署和第一次使用 `Storyforge / 叙影工场` 的用户，目标是帮你完成：

1. 部署服务
2. 初始化管理员账号
3. 配置文本模型与媒体供应商
4. 跑通小说工坊
5. 把结果导回项目继续做视频生产

## 首页预览

<p align="center">
  <img src="assets/hero-screenshot.png" alt="Storyforge 首页与工作台预览" width="960">
</p>

## 核心能力

- 小说 seed 到长篇章节的自动生成
- 小说到项目的自动导入
- 角色、线索、分镜、宫格、视频片段的连续生产
- 多模型路由与多供应商媒体生成
- 托管式注册、登录、邮箱验证、忘记密码
- PostgreSQL + Redis 的生产级后端支撑

## 部署方式

### 本地快速启动（SQLite）

```bash
git clone https://github.com/hongsir457/storyforge.git
cd storyforge/deploy
cp .env.example .env
docker compose up -d
```

访问：`http://localhost:1241`

### 生产部署（PostgreSQL）

```bash
cd storyforge/deploy/production
cp .env.example .env
```

至少补齐：

```env
POSTGRES_PASSWORD=replace-me
AUTH_USERNAME=admin
AUTH_PASSWORD=replace-me
AUTH_EMAIL=admin@storyforge.local
AUTH_TOKEN_SECRET=replace-me-with-a-long-random-secret
```

启动：

```bash
docker compose up -d
```

## 首次配置

### 1. 管理员登录

登录页：`/login`

管理员账号来自环境变量：

- 用户名：`AUTH_USERNAME`
- 密码：`AUTH_PASSWORD`

### 2. 配置文本模型

入口：`/app/admin`

推荐顺序：

1. 配置 OpenRouter
2. 或直接配置 Anthropic

如果走 OpenRouter，建议：

1. 填入 `OpenRouter API Key`
2. 应用 OpenRouter 预设
3. 确认 Anthropic-compatible base URL 为 `https://openrouter.ai/api`

### 3. 配置图像 / 视频供应商

至少配置一个可用供应商，例如：

- Gemini
- 火山方舟
- Grok
- OpenAI
- 自定义兼容供应商

### 4. 配置邮件

如果要启用真实注册验证和忘记密码邮件，再补齐：

```env
SMTP_HOST=
SMTP_PORT=587
SMTP_USERNAME=
SMTP_PASSWORD=
SMTP_FROM_EMAIL=
SMTP_FROM_NAME=Storyforge
```

如果暂时不接 SMTP，可先用：

```env
AUTH_EMAIL_DEBUG=true
```

## 跑通小说工坊

### 1. 创建项目

进入：`/app/projects`

你可以：

- 新建项目
- 导入项目 ZIP
- 上传已有小说源文件

### 2. 启动小说工坊

进入：`/app/novel-workbench`

填写：

- 小说标题
- Seed 文本
- 写作语言

然后启动任务。

### 3. 等待自动流程完成

小说工坊会依次执行：

1. foundation
2. drafting
3. revision
4. export
5. import into Storyforge project

成功后，结果会自动导入项目。

## 后续视频生产

小说导入项目后，可以继续做：

- 角色图
- 线索和道具图
- 分镜图
- 宫格图
- 视频片段
- 项目 ZIP 导出
- 剪映草稿导出

## 相关文档

- [../README.md](../README.md)
- [../deploy/sealos/README.md](../deploy/sealos/README.md)
- [../deploy/production/MIGRATE-TO-POSTGRES.md](../deploy/production/MIGRATE-TO-POSTGRES.md)
- [jianying-export-guide.md](jianying-export-guide.md)
