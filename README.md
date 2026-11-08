# 海选AI

刘海的 AI 精选站：今日情报、一人公司、免费资源、工具雷达。默认每日精选3—5条，重磅单独展示、每条配图；不足3条时明确说明，不凑数、不改写原文日期。人物对话与报告已并入情报，分类固定为产品动态、行业动态、人物对话、报告解读。

现有正式域名：`https://news.czrshe.com/`。当前改版在本地验收，尚未部署。网站源代码继续保留在此仓库，没有移动其他项目。

## 本地运行

```sh
pnpm install --frozen-lockfile
pnpm lint
pnpm test
pnpm build
pnpm preview
```

访问 `http://127.0.0.1:4173/`。预览使用 Python 3.9+ 标准库服务，同源提供页面与反馈、爆料、邮件确认接口；SQLite 位于 `.local-state/`，不会进入构建产物。开发界面仍可用 `pnpm dev`，但完整接口验证请用构建后的 preview。

`pnpm test:e2e` 覆盖七种屏宽与主要交互；`pnpm check:bundle` 检查包体。

## 内容与来源

- `public/news.json`：完整情报档案、当期 `dailyIds`、`editionDate`、原始发布日期和采集健康状态。
- `data/seed.json`：当前一期的离线降级内容，不把整个档案打进JS。
- `data/portal-content.json`：经编辑核对的国内案例与官方免费资源。`public/portal-content.json` 是发布副本，构建时自动同步。
- `data/radar-content.json`：工具目录与旧栏目原始资料。旧对话、报告已迁入情报档案；不再展示未经持续核验的“本月关注增长”数字。
- `data/domestic-sources.json`：腾讯新闻、微博、36氪、人民网、新华网和地方媒体的用途、域名限制、公开栏目及原文监测清单。
- `scripts/discover_domestic.py`：搜索发现、公开栏目链接、原文监测；结果存入**不对外发布**的 `data/domestic-candidates.json`，需编辑审核。搜索引擎只用于发现，不当作报道来源。
- `scripts/update_news.py`：官方国际源与国内可读正文合并，事件去重后整理，单个北京时间日最多生成5条；首页精选最多5条、同一主来源最多2条。不得绕过登录、付费墙或robots约定。

GitHub Actions沿用北京时间07:00、11:00、17:00、21:00的更新时段（GitHub调度可能延迟，另需采集和构建时间）。采集失败保留旧内容并记录状态；一人公司案例不因被发现而自动发布。资源条款超过7天未核对时自动显示“待重新核对”，固定活动截止后显示过期。

## 互动与邮件

- 收藏与“已领取”标记保存在本机；领取反馈、爆料进入SQLite待审核。
- 订阅/修改偏好/退订均需确认邮箱。确认令牌仅保存哈希、24小时有效、单次使用；访问链接不直接改变订阅。
- 支持每日、每周和编辑批准的高价值资源提醒；同一内容不会反复发送。即时频率每5分钟检查编辑批准的资源，不承诺零延迟。
- **未配置SMTP时不保存新订阅，也不假报发送成功。** 实际发信、送达率和邮箱DNS尚未在生产验证。
- 不提供公开管理员接口。审核只在可信终端执行：

```sh
python3 scripts/manage_portal.py pending
python3 scripts/manage_portal.py moderate feedback 1 --approve
python3 scripts/manage_portal.py moderate tips 1 --approve
# 标记爆料已审阅不会自动发布；核验后编辑 portal-content.json。
python3 scripts/manage_portal.py newsletter daily
# 默认仅预演，不发信；由正式定时服务显式传入 --send。
```

## 部署

前端沿用GitHub Actions至宝塔站点，见 `.github/workflows/deploy-baota.yml`。完整接口新增Python服务，安装说明见 [上线与邮件配置](docs/DEPLOYMENT.md)。生产启用需要服务器配置及真实SMTP信息；静态Sites托管不支持直接运行该Python服务，故本次不迁移既有域名与托管。

API Key仅用于离线采集，保留于GitHub Secrets；SMTP设置存放服务器 `/etc/haixuan.env`，均不写入前端、Git仓库或日志。待审原文、邮箱、数据库不进入 `public/`、`dist/`。
