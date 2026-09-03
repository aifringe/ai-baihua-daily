# AI 白话日报

面向普通人的 AI 新闻阅读站。短标题、摘要、白话详情、原文链接、搜索、分类、收藏，以及基于当前文章的本地模型问答。

- 在线阅读：https://aifringe.github.io/ai-baihua-daily/
- 本机完整功能：http://127.0.0.1:8766/
- 模型：Ollama `qwen3:8b`，没有 OpenAI API 调用或云模型费用。

## 使用

在线地址可直接阅读已发布新闻。问答需要在运行 Ollama 和小助手的同一台 Mac 上使用。打开文章后在右侧提问；如果浏览器询问本地网络访问，允许当前网站访问。若浏览器限制 HTTPS 页面访问本地 HTTP 服务，使用本机完整功能地址。

小助手只监听 `127.0.0.1:8766`；不会把 Ollama 暴露到公网。只接受明确允许的网站来源，不提供任意 URL 代理、模型管理、文件读写或命令执行接口。对话仅在页面内存中保留，刷新即清空；收藏在本浏览器保存。公开发布的只有新闻解读和源链接，不包含聊天或凭据。

## 每日更新

小助手以 `--scheduled` 启动后，每日北京时间 08:00 之后检查一次；睡眠或离线后下一次检查会补做。关闭电脑时保留上次已发布内容，不会伪造更新时间。每次最多整理 6 条新消息，每个来源最多 2 条，保留最近 60 条。自动选题不是全网穷尽报道。

来源：OpenAI、Google、Google DeepMind、Hugging Face、Microsoft Research 的公开 RSS。仅处理近 10 天、有日期、有来源摘要的内容，拒绝未来日期和非 HTTPS 链接。模型只基于源摘要生成，标注这一限制；失败时保留旧版。需要全文核对时点击原文。

`BAIHUA_PUBLISH=1` 时通过当前用户 `gh` 登录，将 `public/news.json` 和 `gh-pages` 分支的 `news.json` 更新到固定仓库 `aifringe/ai-baihua-daily`。不推送其他本地修改，不将聊天内容发送到 GitHub。密钥不写入源码。GitHub Pages 发布通常有短暂延迟。

## 开发

Node 22.13+、pnpm、Python 3.11+，无需 Python 第三方依赖。

```sh
pnpm install
pnpm dev
pnpm build
python3 scripts/companion.py
# 手动更新，默认不发布
python3 scripts/companion.py --refresh
# 每日自动更新并发布
BAIHUA_PUBLISH=1 python3 scripts/companion.py --scheduled
# 测试
python3 -m unittest discover -s scripts -p 'test_*.py'
```

构建为静态文件，适用于 GitHub Pages 与 Sites。网页使用 hash 详情路由，因此 GitHub Pages 不需要额外 rewrite。小助手只提供白名单静态文件与 `/api/status`、`/api/chat`、`/api/news`、`/api/refresh`。

## 停止自动运行（本机已配置时）

```sh
launchctl bootout gui/$(id -u) ~/Library/LaunchAgents/com.aifringe.ai-baihua.plist
```

删除该 LaunchAgent 文件可取消以后的登录自动启动。Ollama 本身保持你原有的设置。

## 验证范围

构建、RSS 过滤和模型输出结构测试；实际本地 Ollama 问答、更新和 GitHub Pages HTTP 检查。不将模型输出视为独立事实核验。WebMCP 搜索工具已验证有效输入与无效输入，输入错误不会修改搜索状态。
