<h1 align="center">
  <br>
  <picture>
    <source media="(prefers-color-scheme: light)" srcset="frontend/public/frametale-logo.png">
    <source media="(prefers-color-scheme: dark)" srcset="frontend/public/frametale-logo.png">
    <img src="frontend/public/frametale-logo.png" alt="Frametale Logo" width="168" style="border-radius: 16px;">
  </picture>
  <br>
  Frametale
  <br>
</h1>

<h4 align="center">叙影工场 · 小说与视频自动生成工作台</h4>

<p align="center">
  <a href="README.md"><img src="https://img.shields.io/badge/lang-中文-red?style=flat-square" alt="中文"></a>
  <a href="README.en.md"><img src="https://img.shields.io/badge/lang-English-blue?style=flat-square" alt="English"></a>
</p>

<p align="center">
  <a href="https://github.com/hongsir457/frametale/actions/workflows/docker.yml"><img src="https://img.shields.io/github/actions/workflow/status/hongsir457/frametale/docker.yml?style=for-the-badge&label=Docker" alt="Docker"></a>
  <a href="https://github.com/hongsir457/frametale"><img src="https://img.shields.io/github/stars/hongsir457/frametale?style=for-the-badge" alt="Stars"></a>
  <a href="https://github.com/hongsir457/frametale/blob/main/LICENSE"><img src="https://img.shields.io/badge/License-AGPL--3.0-green?style=for-the-badge" alt="License"></a>
</p>

## 在线地址

- 公网地址：`https://bjmmuazhczom.cloud.sealos.io`
- 当前独立命名空间：`ns-qkcc8vj1`
- 对外品牌：`Frametale / 叙影工场`
- 仓库内部兼容标识：`autovideo`

## 首页预览

<p align="center">
  <img src="docs/assets/hero-screenshot.png" alt="Frametale 首页与工作台预览" width="960">
</p>

## 核心能力

- 小说到视频的一体化工作流：从 seed、长篇章节、人物资产，到分镜、宫格和视频片段
- 小说工坊自动化：直接在 `/app/novel-workbench` 发起整本小说生成，再自动导入项目
- 多模型接入：支持 OpenRouter、Anthropic，以及多家图像/视频供应商
- 多智能体生产：围绕故事一致性、角色复用和章节改编展开
- 托管账号体系：注册、登录、邮箱验证、忘记密码、账号页
- 生产级存储：PostgreSQL 统一存用户、配置、任务、用量；Redis 支撑缓存和异步任务
- 项目资产闭环：ZIP 导入导出、剪映草稿导出、项目级设置与媒体资产管理

## 首次配置

首次启动后，建议按这个顺序完成：

1. 使用管理员账号登录
2. 打开 `/app/admin`
3. 配置文本模型
   - 推荐：OpenRouter
   - 也支持直接配置 Anthropic
4. 配置至少一个图像或视频供应商
5. 如需真实注册邮件，补齐 `SMTP_*` 配置
6. 打开 `/app/novel-workbench` 做第一条小说工坊任务

## 快速开始

> 建议环境：Linux、macOS 或 Windows WSL2。部分 Claude Agent SDK 依赖不适合原生 Windows shell。

### 默认部署（SQLite）

```bash
git clone https://github.com/hongsir457/frametale.git
cd frametale/deploy
cp .env.example .env
docker compose up -d
```

启动后访问：`http://localhost:1241`

### 生产部署（PostgreSQL）

```bash
cd frametale/deploy/production
cp .env.example .env
```

至少设置这些环境变量：

```env
POSTGRES_PASSWORD=replace-me
AUTH_USERNAME=admin
AUTH_PASSWORD=replace-me
AUTH_EMAIL=admin@frametale.local
AUTH_TOKEN_SECRET=replace-me-with-a-long-random-secret
```

然后启动：

```bash
docker compose up -d
```

如果要真实发送注册验证和重置密码邮件，再补齐：

```env
SMTP_HOST=
SMTP_PORT=587
SMTP_USERNAME=
SMTP_PASSWORD=
SMTP_FROM_EMAIL=
SMTP_FROM_NAME=Frametale
```

如果暂时不接 SMTP，可以先用：

```env
AUTH_EMAIL_DEBUG=true
```

## 使用流程

1. 在 `/app/projects` 新建项目，或导入已有项目 ZIP
2. 在 `/app/novel-workbench` 输入标题和 seed，启动小说工坊
3. 等待小说生成、修订、导出，并自动导回项目
4. 回到项目页继续做角色图、线索图、分镜图、宫格图和视频片段
5. 最后导出项目 ZIP 或剪映草稿

## 文档

- [docs/getting-started.md](docs/getting-started.md)：首次部署与配置全流程
- [deploy/sealos/README.md](deploy/sealos/README.md)：Sealos 线上部署说明
- [deploy/production/MIGRATE-TO-POSTGRES.md](deploy/production/MIGRATE-TO-POSTGRES.md)：从 SQLite 迁移到 PostgreSQL
- [docs/jianying-export-guide.md](docs/jianying-export-guide.md)：剪映草稿导出说明
- [CONTRIBUTING.md](CONTRIBUTING.md)：本地开发、测试与提交规范
- [CLAUDE.md](CLAUDE.md)：仓库结构与 agent 开发说明

## 许可证

[AGPL-3.0](LICENSE)
