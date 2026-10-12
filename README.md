# 刘海儿的 AI 新闻

面向普通人的 AI 新闻阅读站，提供短标题、三行预览、白话详情、可追溯原文、搜索、分类、排序、分页和浏览器本地收藏。

- 正式网站：<https://news.czrshe.com/>
- 质量标准：[`docs/QUALITY_STANDARD.md`](docs/QUALITY_STANDARD.md)
- 选题规则：[`docs/EDITORIAL_POLICY.md`](docs/EDITORIAL_POLICY.md)

## 架构

- 前端：React 19、TypeScript、Vite、Tailwind CSS、shadcn/ui。
- 新闻：`public/news.json`，由 GitHub Actions 每天北京时间 08:00 更新。
- 编辑整理：DeepSeek Flash 仅在离线更新任务中根据公开可读正文生成中文摘要；网站不提供模型问答接口。
- 收藏：仅保存在当前浏览器 `localStorage`。
- 部署：推送 `main` 后，通过 GitHub Actions 部署到宝塔 `/www/wwwroot/news.czrshe.com/`。

API Key 只存于 GitHub Secret `DEEPSEEK_API_KEY`，仅供离线更新任务使用，不会部署到网站服务器、仓库或前端包。

## 新闻更新

日常任务读取最近 30 天的候选；所有已经入选的新闻永久保存，并可在“全年档案”中浏览。历史回补可指定起始日期。内容必须使用 HTTPS 且正文可公开读取；候选按来源权威性、事件影响、AI 相关性和多来源印证评分，排除荐股、促销、活动预告与教程。规范化 URL 后，再依据日期、实体、模型版本和动作概念进行事件级去重；同一事件合并为一条并保留多个来源。

每次最多新增 20 条，同一主要来源最多 3 条、同一分类最多 6 条。更新失败时保留上一版，不伪造更新时间。

## 本地开发

```sh
pnpm install
pnpm lint
pnpm test
pnpm build
pnpm test:e2e
```

手动更新：`DEEPSEEK_API_KEY=你的密钥 python3 scripts/update_news.py 20`。

`quality.yml` 执行全部质量检查；`update-news.yml` 每日更新新闻；`deploy-baota.yml` 部署静态站点，同时删除历史问答接口和服务器密钥文件。每次修改必须遵循 [`AGENTS.md`](AGENTS.md) 和质量标准。
