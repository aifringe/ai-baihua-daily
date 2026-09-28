# 刘海儿的 AI 新闻

面向普通人的 AI 新闻阅读站。提供短标题、三行内预览、白话详情、可追溯原文、搜索、分类、排序、分页、收藏，以及围绕当前新闻的云端 AI 问答。

- 正式网站：<https://news.czrshe.com/>
- GitHub：<https://github.com/aifringe/ai-baihua-daily>
- AI：DeepSeek Flash，通过服务器端 PHP 接口调用，访客无需登录
- 质量标准：[`docs/QUALITY_STANDARD.md`](docs/QUALITY_STANDARD.md)
- 最近完整审计：[`docs/audits/2026-09-28-full-site-audit.md`](docs/audits/2026-09-28-full-site-audit.md)
- 审计修复记录：[`docs/audits/2026-09-28-remediation.md`](docs/audits/2026-09-28-remediation.md)

## 架构

- 前端：React 19、TypeScript、Vite、Tailwind CSS、shadcn/ui。
- 新闻：`public/news.json`，由 GitHub Actions 每日北京时间 08:00 更新。
- 热点：`data/hotspots.json`，构建时同时发布为 `hotspots.json` 供服务端核验。
- AI 接口：`public/api/chat.php`。浏览器只提交新闻 ID 与最近对话；服务器从已发布新闻中读取可信正文，再调用 DeepSeek。
- 收藏：仅保存在当前浏览器 `localStorage`；聊天只保留在当前页面内存。
- 部署：推送 `main` 后，GitHub Actions 构建并通过 SSH 部署到宝塔 `/www/wwwroot/news.czrshe.com/`。

API Key 只存于 GitHub Secret `DEEPSEEK_API_KEY`，部署时写入服务器 `/www/wwwroot/.ai-baihua-deepseek-key`，不会进入仓库或前端包。接口限制每个 IP 每小时 50 次、全站每日 300 次。

## 新闻更新

更新程序读取官方博客与专业媒体 RSS，抓取可公开阅读的正文，排除明显订阅墙和过短页面，再由 DeepSeek 根据正文生成中文摘要。候选内容仅保留最近 30 天，最终最多保存 120 条，每页显示 10 条。

更新流程会：

1. 规范化 URL 并去除追踪参数。
2. 检查 HTTPS、发布日期和正文可读性。
3. 根据标题、实体、时间和已有中文标题进行事件级去重。
4. 同一事件合并为一条，保留多个来源。
5. 生成“发生了什么”和“换成人话”两段解读。
6. 失败时保留上一版新闻，不伪造更新时间。

自动选题不是全网穷尽报道，AI 摘要也不是独立事实核验；具体功能、价格和开放范围以原文为准。

## 本地开发

要求 Node.js 22.13+、pnpm 和 Python 3.11+。

```sh
pnpm install
pnpm dev
pnpm lint
pnpm test
pnpm build
pnpm test:e2e
```

手动生成新闻需要环境变量 `DEEPSEEK_API_KEY`：

```sh
DEEPSEEK_API_KEY=你的密钥 python3 scripts/update_news.py 15
```

## GitHub Actions

- `quality.yml`：对推送和 Pull Request 执行 lint、单元测试、构建、性能预算与浏览器冒烟测试。
- `update-news.yml`：每天更新并提交 `public/news.json`，然后触发部署。
- `deploy-baota.yml`：质量检查通过后构建并部署到宝塔。

部署任务还会在宝塔采用标准 Nginx extension 目录时自动安装安全响应头，并在重载前运行 `nginx -t`；校验失败会回滚配置。若服务器不是标准目录结构，Actions 会给出警告，需按 [`deploy/nginx-security-headers.conf`](deploy/nginx-security-headers.conf) 在宝塔站点配置中手动启用。

仓库需要配置：`BAOTA_SSH_HOST`、`BAOTA_SSH_PORT`、`BAOTA_SSH_USER`、`BAOTA_SSH_PRIVATE_KEY`、`BAOTA_SSH_KNOWN_HOSTS` 和 `DEEPSEEK_API_KEY`。

## 上线验收

每次修改必须遵循 [`AGENTS.md`](AGENTS.md) 和质量标准。至少检查相关功能、390px 手机、1440px 桌面、浏览器控制台、API 成功/错误响应以及 GitHub Actions。只有部署成功并验证生产域名后，才能报告“已上线”。
