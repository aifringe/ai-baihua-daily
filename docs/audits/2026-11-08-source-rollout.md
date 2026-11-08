# 信息源接入与四次定时更新

依据用户提供的2026-11-08调研报告、筛选CSV和网络核查摘要，结合本次真实HTTP/XML与正文检查。

## 接入选择

- 18个RSS/Atom入口：OpenAI、Google DeepMind、Google AI、Google Research、AWS AI、MIT News、Berkeley AI Research、Apple Machine Learning、Hugging Face、Microsoft Research、NVIDIA AI、GitHub、TechCrunch AI、MIT Technology Review、The Verge AI、量子位、Simon Willison、Latent Space。
- 新增量子位中文AI报道、Simon实测、Latent Space访谈与分析。保留原有官方/研究来源。不把HF社区文章一概当平台官方声明。
- 暂停返回429的VentureBeat，以及不能稳定取得原文的Google News聚合订阅。
- 腾讯新闻、微博、36氪、新华网、人民网、温州网继续发现国内案例。新增机器之心与智东西公开列表；本次未取得满足日期和正文门槛的文章，仅列线索，不声称完成自动发布验收。
- DeepSeek、Qwen等官方更新入口及更多平台仍待适配；未接入未获授权的社交API、付费墙或需要登录的内容。

## 实测与限制

记录见同目录 `2026-11-08-source-check.json`。18个订阅中17个可解析；15个取得近期正文样本。OpenAI样本正文未通过读取；DeepMind本次请求失败；Berkeley没有合格近期条目。部分文章虽然可读仍可能混有导航内容，编辑摘要应保留来源、条件与不确定性。HTTP可读或robots允许不代表全文再分发授权；只发布原创摘要及来源链接，自动新闻配编辑示意图。

统一检查国内外robots；未知/禁止规则不自动读取正文，404/410视为无robots规则。限制每源8个候选、正文池160篇、4路正文读取、每批最多12次模型调用。仅最近7天候选进入常规情报流程。来源失败保留旧版；全体无正文或模型密钥缺失时报错。单个生成失败不打印上游响应和密钥。

## 时段与发布

GitHub Actions cron `0 23,3,9,13 * * *`，UTC换算为北京时间07:00、11:00、17:00、21:00。此为开始检查时间，受Actions排队、采集与构建时间影响，不承诺整点页面即时变化。

一天最多新增5条精选；重复事件合并。四次是检查频率，不是每天发布20条。没有内容变化时保留本期时间，只更新最后检查时间。国内一人公司案例保留人工审核，不自动发布收益承诺。

合并远程56条本地未包含的历史新闻，保留614条（更新任务后可能继续去重或新增）。前端与采集发布到既有news.czrshe.com。邮件/在线提交API尚未开通，前端探测失败时明确提示；本次不发送邮件。
