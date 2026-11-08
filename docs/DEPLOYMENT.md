# 海选AI上线与邮件配置

前端、Python接口、SQLite审核库与发信程序已准备。此次发布前端与四次定时采集；现有部署仅上传静态网站。API与SMTP尚未安装，页面探测失败时显示未开通，不发送真实邮件。不要将纯静态部署误认为完整邮件服务已上线。

## 1. 前端

沿用现有域名与宝塔目录 `/www/wwwroot/news.czrshe.com`。先执行lint、单元测试、生产构建和端到端测试，通过后再提交推送。现有 `deploy-baota.yml` 只发布构建产物并安装原有安全响应头，不会自动安装新API或读取SMTP信息。

## 2. API服务

服务器需要Python3.9+，使用标准库，无额外pip依赖。将下列非公开文件部署到 `/opt/haixuan`：

- `server/app.py`
- `scripts/manage_portal.py`
- `data/portal-content.json`、`data/radar-content.json`
- `public/news.json`（仅供邮件程序读取的副本）

将 `deploy/haixuan-api.service` 安装到systemd，按实际宝塔运行用户调整 `User`/`Group`。数据库固定到 `/var/lib/haixuan/haixuan.sqlite3`，目录仅服务用户可读写，定期备份。**不得把数据库、候选队列或源代码放到站点公开目录。**

将 `server/.env.example` 的字段填写到 `/etc/haixuan.env`，由root管理并限制权限。真实SMTP密码不进入仓库。`HAIXUAN_PUBLIC_URL` 必须为正式HTTPS域名。

将 `deploy/haixuan-api.nginx.conf` 放进现有域名server块，检查nginx配置通过后重载。代理只访问127.0.0.1:4180，不将Python端口对公网开放。确认 `X-Real-IP` 由nginx覆盖，再启用 `TRUST_LOCAL_PROXY=1`。

## 3. 邮件

配置发信域名的SPF、DKIM和DMARC，先用站长自己的测试邮箱走通订阅确认、修改偏好、退订，再启用 `haixuan-mail.service` 和 `.timer`。请勿对尚未同意的地址发送邮件。

定时服务每5分钟检查编辑批准的资源；每日精选在北京时间09:00窗口发送，周精选在周日同一窗口发送。不是连续监听的秒级提醒。相同内容按收件人去重，静默无新增。生产送达与退订尚待实际验收。SMTP成功提交只代表发信服务器接受，不代表一定送达收件箱。

内容更新后，要同步 `/opt/haixuan` 内的资源与情报副本，否则邮件数据会陈旧。现有Actions未自动修改此新服务，避免在API未部署时造成误更新。

## 4. 审核

在受信任的服务器终端加载同一环境后运行 `scripts/manage_portal.py pending`。审核通过才公开反馈；爆料标为已审阅后，需人工核验并编辑正式内容数据。没有公开后台或默认管理员密码。

## 5. 发布验收

核对首页四栏、3—5条精选、图片、原文日期、搜索收藏、历史分类、反馈与爆料。验证订阅确认前不激活，退订前不泄露邮箱存在性。检查接口限流、400/403/415/413/503、静态目录隔离，检查生产HTTPS和旧问答接口仍关闭。未完成API和SMTP配置时应明确标记尚未开通，不能承诺完整线上服务。
