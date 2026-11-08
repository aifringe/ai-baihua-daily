'use client';
/* oxlint-disable next/no-img-element -- Static Vite build uses local image files. */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Bookmark,
  Check,
  ChevronDown,
  Clock3,
  Gift,
  Lightbulb,
  Mail,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  X,
} from 'lucide-react';
import seed from '../data/seed.json';
import portalSeed from '../data/portal-content.json';
import radar from '../data/radar-content.json';
import sources from '../data/domestic-sources.json';
import feedSources from '../data/sources.json';
import {
  dailyStories,
  newsCategory,
  safeImage,
  safeUrl,
  validEdition,
  type Edition,
} from '@/lib/content';

type Section = 'briefing' | 'business' | 'resources' | 'tools';
type Resource = (typeof portalSeed.resources)[number];
type Modal = 'subscribe' | 'tip' | 'sources' | null;
const sections: { id: Section; label: string; en: string }[] = [
  { id: 'briefing', label: '今日情报', en: 'DAILY BRIEF' },
  { id: 'business', label: '一人公司', en: 'SOLO BUSINESS' },
  { id: 'resources', label: '免费资源', en: 'FREE RESOURCES' },
  { id: 'tools', label: '工具雷达', en: 'TOOLBOX' },
];
const newsCategories = ['全部', '产品动态', '行业动态', '人物对话', '报告解读'];
const today = () =>
  new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Shanghai' });
function dateLabel(value: string, precision?: string) {
  return precision === 'year'
    ? value.slice(0, 4) + '年'
    : precision === 'month'
      ? value.slice(0, 7)
      : value;
}
function External({
  url,
  children,
  className = '',
}: {
  url: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <a
      className={className}
      href={safeUrl(url)}
      target="_blank"
      rel="noreferrer"
    >
      {children}
      <ArrowUpRight size={15} />
    </a>
  );
}
// Static Vite output uses local optimized assets, not the Next image server.
function Picture({
  src,
  alt,
  priority = false,
  className = '',
}: {
  src?: string;
  alt: string;
  priority?: boolean;
  className?: string;
}) {
  return (
    <img
      className={className}
      src={safeImage(src)}
      alt={alt}
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : 'auto'}
      onError={(e) => {
        e.currentTarget.onerror = null;
        e.currentTarget.src = './illustrations/product.svg';
      }}
    />
  );
}

export default function Home() {
  const [data, setData] = useState<Edition>(seed as Edition),
    [portal, setPortal] = useState(portalSeed);
  const [section, setSection] = useState<Section>('briefing'),
    [detail, setDetail] = useState(''),
    [query, setQuery] = useState(''),
    [category, setCategory] = useState('全部'),
    [view, setView] = useState('本期精选'),
    [sort, setSort] = useState('latest'),
    [page, setPage] = useState(1);
  const [saved, setSaved] = useState<string[]>([]),
    [claimed, setClaimed] = useState<string[]>([]),
    [notice, setNotice] = useState(''),
    [modal, setModal] = useState<Modal>(null),
    [refreshing, setRefreshing] = useState(false);
  const closeModal = useCallback(() => setModal(null), []);
  const heading = useRef<HTMLHeadingElement>(null),
    lastDetail = useRef(''),
    scroll = useRef(0);
  async function refresh() {
    setRefreshing(true);
    try {
      const r = await fetch('./news.json?t=' + Date.now(), {
        cache: 'no-store',
      });
      if (!r.ok) throw Error();
      const next = await r.json();
      if (!validEdition(next)) throw Error();
      setData(next);
      return true;
    } catch {
      setNotice('暂时无法读取更新，正在显示已保存的精选。请稍后重试。');
      return false;
    } finally {
      setRefreshing(false);
    }
  }
  useEffect(() => {
    void refresh();
    fetch('./portal-content.json')
      .then((r) => {
        if (!r.ok) throw Error();
        return r.json();
      })
      .then((value) => {
        const d = value as typeof portalSeed;
        if (Array.isArray(d.cases) && Array.isArray(d.resources)) setPortal(d);
      })
      .catch(() => {});
    try {
      const read = (key: string) => {
        const x = JSON.parse(localStorage.getItem(key) || '[]');
        return Array.isArray(x) ? x.filter((v) => typeof v === 'string') : [];
      };
      setSaved(read('ai-baihua-saved'));
      setClaimed(read('haixuan-claimed'));
    } catch {
      setNotice('本地存储不可用，收藏与领取标记仅在本次访问中保留。');
    }
    const route = () => {
      let hash = location.hash.slice(1);
      try {
        hash = decodeURIComponent(hash);
      } catch {
        hash = '';
      }
      const [kind, value] = hash.split('/');
      if (kind === 'confirm') {
        setModal('subscribe');
      }
      const aliases: Record<string, string> = {
        dialogues: '人物对话',
        reports: '报告解读',
        advice: '行业动态',
      };
      const nextSection = sections.some((s) => s.id === value)
        ? (value as Section)
        : 'briefing';
      if (kind === 'section' && aliases[value]) {
        setCategory(aliases[value]);
        setView('历史档案');
      }
      const nextDetail = ['news', 'case', 'resource'].includes(kind)
        ? hash
        : '';
      if (nextDetail && !lastDetail.current) scroll.current = window.scrollY;
      if (nextDetail) {
        window.scrollTo(0, 0);
        requestAnimationFrame(() => heading.current?.focus());
      } else if (lastDetail.current)
        requestAnimationFrame(() => window.scrollTo(0, scroll.current));
      lastDetail.current = nextDetail;
      setDetail(nextDetail);
      setSection(
        nextDetail
          ? kind === 'case'
            ? 'business'
            : kind === 'resource'
              ? 'resources'
              : 'briefing'
          : nextSection,
      );
      setQuery('');
      setPage(1);
    };
    route();
    window.addEventListener('hashchange', route);
    return () => window.removeEventListener('hashchange', route);
  }, []);
  const story = detail.startsWith('news/')
    ? data.articles.find((a) => a.id === detail.slice(5))
    : undefined;
  const company = detail.startsWith('case/')
    ? portal.cases.find((a) => a.id === detail.slice(5))
    : undefined;
  const resource = detail.startsWith('resource/')
    ? portal.resources.find((a) => a.id === detail.slice(9))
    : undefined;
  useEffect(() => {
    document.title = `${story?.title || company?.title || resource?.title || sections.find((s) => s.id === section)?.label} · 海选AI`;
  }, [story, company, resource, section]);
  useEffect(() => setPage(1), [category, query, view, sort]);
  function toggle(id: string, key = 'ai-baihua-saved') {
    const setter = key === 'haixuan-claimed' ? setClaimed : setSaved;
    setter((prev) => {
      const next = prev.includes(id)
        ? prev.filter((x) => x !== id)
        : [...prev, id];
      try {
        localStorage.setItem(key, JSON.stringify(next));
      } catch {
        setNotice('浏览器禁止本地存储，这次操作仅在当前页面有效。');
      }
      return next;
    });
  }
  const daily = useMemo(() => dailyStories(data), [data]);
  const news = useMemo(() => {
    const pool = view === '本期精选' && !query ? daily : data.articles;
    return pool
      .filter(
        (a) =>
          a.publishedAt <= today() &&
          (view !== '我的收藏' || saved.includes(a.id)) &&
          (category === '全部' || newsCategory(a.category) === category) &&
          (a.title + a.summary + a.source)
            .toLowerCase()
            .includes(query.trim().toLowerCase()),
      )
      .sort((a, b) =>
        sort === 'importance'
          ? b.importance - a.importance ||
            b.publishedAt.localeCompare(a.publishedAt)
          : b.publishedAt.localeCompare(a.publishedAt),
      );
  }, [data, daily, view, query, category, saved, sort]);
  const pageCount = Math.max(1, Math.ceil(news.length / 10)),
    paged = news.slice((page - 1) * 10, page * 10);
  const showHero =
    view === '本期精选' && category === '全部' && !query && page === 1;
  const lead = showHero
    ? [...paged].sort((a, b) => b.importance - a.importance)[0]
    : undefined;
  const other = lead ? paged.filter((a) => a.id !== lead.id) : paged;
  const editionDate = data.editionDate || data.lastCheckedAt.slice(0, 10),
    isStale = editionDate < today();
  const match = (text: string) =>
    text.toLowerCase().includes(query.trim().toLowerCase());
  const cases = portal.cases.filter((a) =>
    match(a.title + a.summary + a.tag + a.source),
  );
  const resources = portal.resources.filter((a) =>
    match(a.title + a.summary + a.tag),
  );
  const saveButton = (id: string) => (
    <button
      className={'icon-button save ' + (saved.includes(id) ? 'is-saved' : '')}
      aria-label={saved.includes(id) ? '取消收藏' : '收藏情报'}
      aria-pressed={saved.includes(id)}
      onClick={() => toggle(id)}
    >
      {saved.includes(id) ? <Check size={18} /> : <Bookmark size={18} />}
    </button>
  );
  const go = (s: Section) => {
    location.hash = `section/${s}`;
    setCategory('全部');
    setView('本期精选');
    window.scrollTo(0, 0);
  };
  return (
    <>
      <a
        className="skip-link"
        href="#main-content"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById('main-content')?.focus();
        }}
      >
        跳到主要内容
      </a>
      <header className="site-header">
        <div className="header-inner">
          <a
            className="brand"
            href="#section/briefing"
            aria-label="海选AI 首页"
          >
            <span className="brand-mark">
              h<span>ai</span>
              <i />
            </span>
            <span className="brand-name">
              海选<span>AI</span>
              <small>刘海的 AI 精选站</small>
            </span>
          </a>
          <nav className="primary-nav" aria-label="主要栏目">
            {sections.map((s) => (
              <button
                key={s.id}
                aria-current={section === s.id ? 'page' : undefined}
                onClick={() => go(s.id)}
              >
                {s.label}
              </button>
            ))}
          </nav>
          <div className="header-actions">
            <div className="nav-edition" aria-label="本期精选日期（北京时间）">
              <span>本期</span>
              <time dateTime={editionDate}>
                {editionDate.replaceAll('-', '.')}
              </time>
            </div>
            <button
              className="text-button tip-top"
              onClick={() => setModal('tip')}
            >
              <Lightbulb size={16} />
              提交线索
            </button>
            <button
              className="button dark subscribe-top"
              onClick={() => setModal('subscribe')}
            >
              <Mail size={16} />
              <span>订阅精选</span>
            </button>
          </div>
        </div>
      </header>
      <main className="shell" id="main-content" tabIndex={-1}>
        {notice && (
          <output className="notice">
            <span>{notice}</span>
            <button
              className="icon-button"
              aria-label="关闭提示"
              onClick={() => setNotice('')}
            >
              <X size={17} />
            </button>
          </output>
        )}
        {detail ? (
          <>
            <button
              className="back-button"
              onClick={() => {
                location.hash = `section/${section}`;
              }}
            >
              <ArrowLeft size={16} />
              返回{sections.find((s) => s.id === section)?.label}
            </button>
            {story ? (
              <article className="detail">
                <div className="meta">
                  <span className="badge">{newsCategory(story.category)}</span>
                  <time>
                    {dateLabel(story.publishedAt, story.datePrecision)}
                  </time>
                  <span>{story.source}</span>
                </div>
                <h1 ref={heading} tabIndex={-1}>
                  {story.title}
                </h1>
                <p className="detail-lead">{story.summary}</p>
                <figure className="detail-image">
                  <Picture
                    src={story.image}
                    alt={story.imageAlt || '情报编辑示意图'}
                    priority
                  />
                  <figcaption>
                    {story.imageKind || '来源配图'} · 原文日期{' '}
                    {dateLabel(story.publishedAt, story.datePrecision)}
                  </figcaption>
                </figure>
                <div className="detail-actions">
                  <External url={story.url} className="button dark">
                    阅读原文
                  </External>
                  {saveButton(story.id)}
                </div>
                {story.sections
                  .filter((s) => /发生了什么|换成人话/.test(s.heading))
                  .map((s, i) => (
                    <section className="prose" key={s.heading}>
                      <span className="eyebrow">0{i + 1}</span>
                      <h2>{i === 0 ? '发生了什么' : '换成人话'}</h2>
                      <p>{s.text}</p>
                    </section>
                  ))}
                {story.why && (
                  <div className="takeaway">
                    <Lightbulb size={20} />
                    <div>
                      <strong>这与你有什么关系</strong>
                      <p>{story.why}</p>
                    </div>
                  </div>
                )}
                <div className="source-note">
                  {story.accessNote && <p>{story.accessNote}</p>}
                  {story.editor}。整理可能有误，以原始资料为准。
                </div>
                {story.sources && story.sources.length > 1 && (
                  <div className="source-links">
                    <strong>同一事件的其他来源</strong>
                    {story.sources.map((s) => (
                      <External key={s.url} url={s.url}>
                        {s.name}
                      </External>
                    ))}
                  </div>
                )}
              </article>
            ) : company ? (
              <article className="detail">
                <div className="meta">
                  <span className="badge">{company.tag}</span>
                  <span>
                    {company.source} · {company.publishedAt}
                  </span>
                </div>
                <h1 ref={heading} tabIndex={-1}>
                  {company.title}
                </h1>
                <p className="detail-lead">{company.summary}</p>
                <Picture
                  className="case-banner"
                  src={company.image}
                  alt="一人公司编辑示意图"
                />
                <dl className="fact-grid">
                  {[
                    ['谁会付钱', company.customer],
                    ['需要的能力', company.skills],
                    ['成本与投入', company.cost],
                    ['证据与边界', company.evidence],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <dt>{k}</dt>
                      <dd>{v}</dd>
                    </div>
                  ))}
                </dl>
                <div className="takeaway">
                  <Lightbulb />
                  <div>
                    <strong>第一步怎么做</strong>
                    <p>{company.firstStep}</p>
                  </div>
                </div>
                <p className="risk-note">需要考虑：{company.risk}</p>
                <External className="button dark" url={company.url}>
                  查看原始报道
                </External>
                <p className="source-note">
                  案例资料核对于 {portal.updatedAt}
                  。行动建议为本站编辑分析，未承诺或独立验证收益。
                </p>
              </article>
            ) : resource ? (
              <article className="detail">
                <div className="meta">
                  <span className="badge">{resource.tag}</span>
                  <span>{resource.provider}</span>
                </div>
                <h1 ref={heading} tabIndex={-1}>
                  {resource.title}
                </h1>
                <p className="detail-lead">{resource.summary}</p>
                <ResourceStatus resource={resource} />
                <dl className="fact-grid">
                  {[
                    ['能获得什么', resource.benefit],
                    ['适合谁', resource.audience],
                    ['适用地区', resource.region],
                    ['支付与认证', resource.payment],
                    ['有效期限', resource.deadline],
                    [
                      '最后核对',
                      resource.checkedAt +
                        ' · 核对官方规则，未代替用户实际领取',
                    ],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <dt>{k}</dt>
                      <dd>{v}</dd>
                    </div>
                  ))}
                </dl>
                <p className="risk-note">
                  <strong>计费提醒：</strong>
                  {resource.billing}
                </p>
                <section className="prose">
                  <h2>领取前的三个步骤</h2>
                  <ol>
                    {resource.steps.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ol>
                </section>
                <div className="detail-actions">
                  <External className="button dark" url={resource.url}>
                    前往官方入口
                  </External>
                  <button
                    className="button outline"
                    aria-pressed={claimed.includes(resource.id)}
                    onClick={() => toggle(resource.id, 'haixuan-claimed')}
                  >
                    {claimed.includes(resource.id) ? (
                      <Check size={17} />
                    ) : (
                      <Bookmark size={17} />
                    )}{' '}
                    {claimed.includes(resource.id)
                      ? '本机已标记领取'
                      : '标记我已领取'}
                  </button>
                </div>
                <p className="source-note">
                  领取标记保存在本机。下面的反馈会提交审核，通过后公开。
                </p>
                <Feedback resource={resource} />
              </article>
            ) : (
              <Empty
                title="没有找到这条内容"
                text="链接可能有误，返回栏目继续浏览。"
              />
            )}
          </>
        ) : (
          <>
            <h1 className="sr-only">
              {sections.find((s) => s.id === section)?.label} · 海选AI
            </h1>
            <div className="content-layout">
              <div className="content-main">
                {section === 'briefing' ? (
                  <>
                    <div className="brief-toolbar">
                      <div className="view-switch" aria-label="情报视图">
                        {['本期精选', '历史档案', '我的收藏'].map((v) => (
                          <button
                            key={v}
                            aria-pressed={view === v}
                            onClick={() => setView(v)}
                          >
                            {v}
                          </button>
                        ))}
                      </div>
                      <button
                        className="text-button"
                        disabled={refreshing}
                        onClick={async () => {
                          if (await refresh())
                            setNotice('已读取最新一期精选。');
                        }}
                      >
                        {refreshing ? '读取中…' : '检查更新'}
                        <Clock3 size={14} />
                      </button>
                    </div>
                    <div className="filter-line">
                      <nav className="filters" aria-label="情报分类">
                        {newsCategories.map((c) => (
                          <button
                            key={c}
                            aria-pressed={category === c}
                            onClick={() => {
                              setCategory(c);
                              if (c !== '全部') setView('历史档案');
                            }}
                          >
                            {c}
                          </button>
                        ))}
                      </nav>
                      <button
                        className="icon-button"
                        aria-label="搜索情报"
                        onClick={() =>
                          document.getElementById('site-search')?.focus()
                        }
                      >
                        <Search size={19} />
                      </button>
                    </div>
                    {(isStale || daily.length < 3) && view === '本期精选' && (
                      <p className="edition-note">
                        {isStale
                          ? `当前展示 ${editionDate} 的最近一期精选。`
                          : ''}
                        {daily.length < 3
                          ? '本期优质内容不足3条，暂不凑数。'
                          : ''}
                      </p>
                    )}
                    {(view !== '本期精选' || query) && (
                      <div className="results-bar">
                        <span>
                          找到 {news.length} 条{query ? '相关内容' : '情报'}
                        </span>
                        <label>
                          <SlidersHorizontal size={14} />
                          <select
                            aria-label="情报排序"
                            value={sort}
                            onChange={(e) => setSort(e.target.value)}
                          >
                            <option value="latest">最新发布</option>
                            <option value="importance">重要优先</option>
                          </select>
                          <ChevronDown size={14} />
                        </label>
                      </div>
                    )}
                    {lead && (
                      <article className="headline-card">
                        <a className="headline-image" href={'#news/' + lead.id}>
                          <Picture
                            src={lead.image}
                            alt={lead.imageAlt || '重磅情报配图'}
                            priority
                          />
                          <span className="image-caption">
                            {lead.imageKind || '来源配图'}
                          </span>
                        </a>
                        <div className="headline-body">
                          <div className="meta">
                            <span className="badge solid">本期重磅</span>
                            <span>{newsCategory(lead.category)}</span>
                            <span>约 2 分钟</span>
                          </div>
                          <h2>
                            <a href={'#news/' + lead.id}>{lead.title}</a>
                          </h2>
                          <p>{lead.summary}</p>
                          <div className="article-bottom">
                            <span>
                              {lead.source} · {lead.publishedAt}
                            </span>
                            <div>
                              {saveButton(lead.id)}
                              <a
                                className="circle-link"
                                aria-label={'阅读：' + lead.title}
                                href={'#news/' + lead.id}
                              >
                                <ArrowUpRight size={21} />
                              </a>
                            </div>
                          </div>
                        </div>
                      </article>
                    )}
                    {lead && (
                      <div className="section-heading">
                        <h2>还有这些，值得一看</h2>
                        <span>{daily.length} 条精选 · 原文日期分别标注</span>
                      </div>
                    )}
                    <div className="news-list">
                      {other.map((a, i) => (
                        <article className="news-card" key={a.id}>
                          <a className="story-image" href={'#news/' + a.id}>
                            <Picture
                              src={a.image}
                              alt={a.imageAlt || '情报配图'}
                            />
                            <span>
                              {String(
                                i + (lead ? 2 : 1) + (page - 1) * 10,
                              ).padStart(2, '0')}
                            </span>
                          </a>
                          <div className="story-content">
                            <div className="meta">
                              <span className="category-label">
                                {newsCategory(a.category)}
                              </span>
                              <span>
                                {dateLabel(a.publishedAt, a.datePrecision)}
                              </span>
                            </div>
                            <h2>
                              <a href={'#news/' + a.id}>{a.title}</a>
                            </h2>
                            <p>{a.summary}</p>
                            <div className="article-bottom">
                              <span>{a.source}</span>
                              {saveButton(a.id)}
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>
                    {news.length === 0 && (
                      <Empty
                        title={
                          view === '我的收藏'
                            ? '还没有符合条件的收藏'
                            : '没有找到相关情报'
                        }
                        text="试试其他关键词或分类，也可以在历史档案中查找。"
                      />
                    )}
                    {pageCount > 1 && (
                      <nav className="pagination" aria-label="情报分页">
                        <button
                          className="button outline"
                          disabled={page === 1}
                          onClick={() => setPage((p) => p - 1)}
                        >
                          上一页
                        </button>
                        <span>
                          第 {page} / {pageCount} 页
                        </span>
                        <button
                          className="button outline"
                          disabled={page === pageCount}
                          onClick={() => setPage((p) => p + 1)}
                        >
                          下一页
                        </button>
                      </nav>
                    )}
                    {showHero && (
                      <div className="end-note">
                        <span>✓</span>{' '}
                        本期精选读完了，去发现一个能用上的工具吧。
                        <button onClick={() => go('tools')}>
                          逛逛工具雷达 <ArrowRight size={15} />
                        </button>
                      </div>
                    )}
                  </>
                ) : section === 'business' ? (
                  <>
                    <div className="section-heading">
                      <h2>国内案例，拆开来看</h2>
                      <span>{cases.length} 个编辑精选案例</span>
                    </div>
                    <div className="case-grid">
                      {cases.map((c, i) => (
                        <article className="business-card" key={c.id}>
                          <a className="case-cover" href={'#case/' + c.id}>
                            <Picture src={c.image} alt="一人公司编辑示意图" />
                            <span className="case-number">0{i + 1}</span>
                            <span className="case-cover-label">{c.tag}</span>
                          </a>
                          <div className="business-body">
                            <div className="meta">
                              <span>{c.source}</span>
                              <span>{c.publishedAt}</span>
                            </div>
                            <h2>
                              <a href={'#case/' + c.id}>{c.title}</a>
                            </h2>
                            <p>{c.summary}</p>
                            <dl>
                              <div>
                                <dt>谁会付钱</dt>
                                <dd>{c.customer}</dd>
                              </div>
                              <div>
                                <dt>需要什么</dt>
                                <dd>{c.skills}</dd>
                              </div>
                            </dl>
                            <a className="read-link" href={'#case/' + c.id}>
                              看案例与第一步 <ArrowRight size={16} />
                            </a>
                          </div>
                        </article>
                      ))}
                    </div>
                    {!cases.length && (
                      <Empty title="没有找到相关案例" text="换个关键词试试。" />
                    )}
                    <p className="source-note">
                      收入、成本缺乏证据时明确留空。创业者的个别经历不代表普遍收益。
                    </p>
                  </>
                ) : section === 'resources' ? (
                  <>
                    <div className="section-heading">
                      <h2>先看条件，再去领取</h2>
                      <span>只链接官方入口</span>
                    </div>
                    <div className="resource-list">
                      {resources.map((r) => (
                        <article className="resource-card" key={r.id}>
                          <div className="resource-top">
                            <span className="resource-icon">
                              <Gift size={24} />
                            </span>
                            <ResourceStatus resource={r} />
                          </div>
                          <div className="meta">
                            <span className="badge">{r.tag}</span>
                            <span>{r.provider}</span>
                          </div>
                          <h2>
                            <a href={'#resource/' + r.id}>{r.title}</a>
                          </h2>
                          <p>{r.summary}</p>
                          <dl>
                            <div>
                              <dt>可获得</dt>
                              <dd>{r.benefit}</dd>
                            </div>
                            <div>
                              <dt>适用人群</dt>
                              <dd>{r.audience}</dd>
                            </div>
                            <div>
                              <dt>有效期限</dt>
                              <dd>{r.deadline}</dd>
                            </div>
                          </dl>
                          <p className="billing-note">{r.billing}</p>
                          <div className="article-bottom">
                            <span>规则核对 {r.checkedAt}</span>
                            <a className="read-link" href={'#resource/' + r.id}>
                              查看条件 <ArrowRight size={16} />
                            </a>
                          </div>
                        </article>
                      ))}
                    </div>
                    {!resources.length && (
                      <Empty
                        title="没有找到相关资源"
                        text="试试搜索 Token 或开发工具。"
                      />
                    )}
                  </>
                ) : (
                  <Tools query={query} />
                )}
              </div>
              <aside className="sidebar">
                <label className="search-box" htmlFor="site-search">
                  <Search size={18} />
                  <input
                    id="site-search"
                    aria-label="搜索当前栏目"
                    placeholder={
                      section === 'briefing'
                        ? '搜索情报、公司、关键词'
                        : '搜索当前栏目'
                    }
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                  {query && (
                    <button
                      className="icon-button"
                      aria-label="清空搜索"
                      onClick={() => setQuery('')}
                    >
                      <X size={15} />
                    </button>
                  )}
                </label>
                <section className="editor-note">
                  <div className="note-top">
                    <span className="avatar">海</span>
                    <div>
                      <strong>刘海的海选笔记</strong>
                      <span>替你筛一遍，再讲人话。</span>
                    </div>
                    <Sparkles size={18} />
                  </div>
                  <p>
                    不必追上所有 AI
                    消息。每天看懂几件重要的事，找到一个用得上的点子，就很好。
                  </p>
                  <div className="note-sign">
                    保持好奇，动手试试。<span>刘海</span>
                  </div>
                </section>
                <section className="side-resources">
                  <div className="side-heading">
                    <h2>
                      <Gift size={17} />
                      资源补给
                    </h2>
                    <button
                      aria-label="查看全部免费资源"
                      onClick={() => go('resources')}
                    >
                      <ArrowUpRight size={18} />
                    </button>
                  </div>
                  {portal.resources.slice(0, 2).map((r) => (
                    <a
                      key={r.id}
                      className="mini-resource"
                      href={'#resource/' + r.id}
                    >
                      <span className="mini-icon">
                        {r.id.startsWith('aliyun') ? '阿' : '腾'}
                      </span>
                      <div>
                        <strong>{r.title.split(' · ')[0]}</strong>
                        <p>{r.benefit}</p>
                        <small>先核对资格与计费</small>
                      </div>
                      <ArrowUpRight size={15} />
                    </a>
                  ))}
                </section>
                <section className="subscribe-card">
                  <Mail size={24} />
                  <h2>让好内容，主动找到你。</h2>
                  <p>选择你关心的情报与资源，少一点刷屏，多一点收获。</p>
                  <button
                    className="button dark"
                    onClick={() => setModal('subscribe')}
                  >
                    设置订阅 <ArrowRight size={15} />
                  </button>
                  <small>自主选择频率，随时退订</small>
                </section>
                <button
                  className="source-policy"
                  onClick={() => setModal('sources')}
                >
                  <ShieldCheck size={17} />
                  <span>
                    来源透明，条件说清<small>了解我们的海选标准</small>
                  </span>
                  <ArrowUpRight size={16} />
                </button>
              </aside>
            </div>
          </>
        )}
      </main>
      <footer className="site-footer">
        <div className="footer-inner">
          <div>
            <a className="footer-logo" href="#section/briefing">
              海选AI<span>少一点噪声，多一点收获。</span>
            </a>
            <p>刘海的 AI 精选站 · 看懂变化，发现资源，动手做点东西。</p>
          </div>
          <div className="footer-links">
            <button onClick={() => setModal('sources')}>来源与筛选标准</button>
            <button onClick={() => setModal('tip')}>提交线索 / 纠错</button>
            <button onClick={() => setModal('subscribe')}>订阅管理</button>
          </div>
          <div className="footer-bottom">
            <span>
              © {new Date().getFullYear()} 海选AI · 收藏仅保存在当前浏览器
            </span>
            <span>AI 辅助整理，重要信息请核对原文。</span>
          </div>
        </div>
      </footer>
      {modal && <ModalPanel kind={modal} close={closeModal} />}
    </>
  );
}
function Empty({ title, text }: { title: string; text: string }) {
  return (
    <div className="empty">
      <Search size={28} />
      <h2>{title}</h2>
      <p>{text}</p>
    </div>
  );
}
function ResourceStatus({ resource: r }: { resource: Resource }) {
  const expired = !!r.endsAt && r.endsAt < today();
  const old =
    Date.now() - Date.parse(r.checkedAt + 'T00:00:00+08:00') > 7 * 86400000;
  return (
    <span
      className={'resource-status ' + (expired || old ? 'needs-check' : '')}
    >
      <span />
      {expired ? '已过截止日期' : old ? '规则待重新核对' : r.status}
    </span>
  );
}
function Tools({ query }: { query: string }) {
  return (
    <div className="tool-groups">
      {[
        { name: '发现新工具', items: radar.tools.new },
        { name: '常用工具箱', items: radar.tools.essential },
      ].map((g) => {
        const items = g.items.filter((t) =>
          (t.name + t.description + t.tag)
            .toLowerCase()
            .includes(query.toLowerCase()),
        );
        return (
          <section key={g.name}>
            <div className="section-heading">
              <h2>{g.name}</h2>
              <span>{items.length} 个工具</span>
            </div>
            <div className="tool-grid">
              {items.map((t, i) => (
                <article className="tool-card" key={t.name}>
                  <div className="tool-card-top">
                    <span className="tool-monogram">
                      {t.name
                        .split('/')
                        .pop()
                        ?.trim()
                        .slice(0, 1)
                        .toUpperCase()}
                    </span>
                    <span className="badge">{t.tag}</span>
                    <span className="tool-index">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                  </div>
                  <h3>
                    <External url={t.url}>{t.name}</External>
                  </h3>
                  <p>{t.description}</p>
                  <External className="read-link" url={t.url}>
                    查看官方项目
                  </External>
                </article>
              ))}
            </div>
            {!items.length && <p className="source-note">本组没有匹配工具。</p>}
          </section>
        );
      })}
      <p className="source-note">
        工具目录资料日期：{radar.updatedAt}
        。实际价格、许可证、维护状态与地域可用性请在官方页面确认。
      </p>
    </div>
  );
}

async function post(path: string, body: unknown) {
  const controller = new AbortController(),
    timer = setTimeout(() => controller.abort(), 15000);
  try {
    const r = await fetch('./api/' + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    let d;
    try {
      d = (await r.json()) as {
        message: string;
        items?: { status: string; message: string; createdAt: string }[];
      };
    } catch {
      throw Error('服务暂时不可用，请稍后重试。');
    }
    if (!r.ok) throw Error(d.message || '提交未完成，请稍后重试。');
    return d;
  } finally {
    clearTimeout(timer);
  }
}
function useSubmissionService() {
  const [available, setAvailable] = useState<boolean | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    fetch('./api/health', { signal: controller.signal })
      .then(
        async (response) =>
          response.ok &&
          ((await response.json()) as { ok?: boolean }).ok === true,
      )
      .then(setAvailable)
      .catch(() => setAvailable(false))
      .finally(() => clearTimeout(timer));
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, []);
  return available;
}
function Feedback({ resource }: { resource: Resource }) {
  const available = useSubmissionService();
  const [status, setStatus] = useState('我领到了'),
    [message, setMessage] = useState(''),
    [busy, setBusy] = useState(false),
    [result, setResult] = useState(''),
    [rows, setRows] = useState<
      { status: string; message: string; createdAt: string }[]
    >([]);
  useEffect(() => {
    setRows([]);
    setResult('');
    fetch('./api/feedback?resource=' + encodeURIComponent(resource.id))
      .then((r) => r.json())
      .then((value) => {
        const d = value as {
          items?: { status: string; message: string; createdAt: string }[];
        };
        if (Array.isArray(d.items)) setRows(d.items);
      })
      .catch(() => {});
  }, [resource.id]);
  return (
    <section className="feedback">
      <h2>领取反馈与补充</h2>
      <p>只分享你亲自尝试的结果，帮助下一位用户少走弯路。</p>
      {rows.map((x, i) => (
        <div className="feedback-row" key={i}>
          <strong>{x.status}</strong>
          <time>{x.createdAt.slice(0, 10)}</time>
          <p>{x.message}</p>
        </div>
      ))}
      {!rows.length && (
        <p className="source-note">暂未展示已审核的用户反馈。</p>
      )}
      {available === false ? (
        <p className="source-note">在线反馈暂未开通。</p>
      ) : (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setResult('');
            try {
              const d = await post('feedback', {
                resource: resource.id,
                status,
                message,
              });
              setResult(d.message);
              setMessage('');
            } catch (e) {
              setResult((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            领取结果
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              {[
                '我领到了',
                '没有领到',
                '还在审核',
                '活动失效',
                '条件有变化',
              ].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <label>
            补充说明
            <textarea
              required
              minLength={5}
              maxLength={1000}
              placeholder="例如领取日期、所在地区、遇到的问题。请勿填写账号、密钥或支付信息。"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </label>
          <button className="button dark" disabled={busy}>
            {busy ? '提交中…' : '提交反馈，等待审核'}
          </button>
          <output className="form-result">{result}</output>
        </form>
      )}
    </section>
  );
}
function ModalPanel({
  kind,
  close,
}: {
  kind: Exclude<Modal, null>;
  close: () => void;
}) {
  const available = useSubmissionService();
  const box = useRef<HTMLDialogElement>(null),
    [result, setResult] = useState(''),
    [busy, setBusy] = useState(false),
    [topics, setTopics] = useState(['免费资源']),
    [mode, setMode] = useState('subscribe'),
    [confirmToken] = useState(() =>
      location.hash.startsWith('#confirm/') ? location.hash.slice(9) : '',
    );
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    box.current?.showModal();
    box.current?.focus();
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      if (e.key === 'Tab') {
        const list = box.current?.querySelectorAll<HTMLElement>(
          'button,a,input,select,textarea',
        );
        if (!list?.length) return;
        const first = list[0],
          last = list[list.length - 1];
        if (
          e.shiftKey &&
          (document.activeElement === first ||
            document.activeElement === box.current)
        ) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', handler);
    const old = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handler);
      document.body.style.overflow = old;
      previous?.focus();
    };
  }, [close]);
  return (
    <>
      <dialog
        className="modal"
        onCancel={close}
        aria-labelledby="modal-title"
        tabIndex={-1}
        ref={box}
      >
        <button
          className="icon-button modal-close"
          aria-label="关闭窗口"
          onClick={close}
        >
          <X />
        </button>
        <p className="eyebrow">HAIXUAN AI</p>
        <h2 id="modal-title">
          {kind === 'subscribe'
            ? '把有用的，送到邮箱。'
            : kind === 'tip'
              ? '发现好线索，一起海选。'
              : '每一条，都有来处。'}
        </h2>
        {kind === 'sources' ? (
          <>
            <p>先看原始资料，再做白话整理。报道事实与编辑建议分别标明。</p>
            <p className="source-note">
              北京时间每日 07:00、11:00、17:00、21:00
              检查更新；采集与发布需要时间，每天精选最多 5 条。
            </p>
            <div className="policy-list">
              {feedSources.map((s) => (
                <div key={s.name}>
                  <External url={s.home}>{s.name}</External>
                  <span>{s.kind}</span>
                  <p>自动检查订阅，仅依据可读取正文整理；受限内容暂缓发布。</p>
                </div>
              ))}
              {sources.map((s) => (
                <div key={s.name}>
                  <External url={s.home}>{s.name}</External>
                  <span>{s.role}</span>
                  <p>{s.policy}</p>
                </div>
              ))}
            </div>
            <p className="source-note">
              微博与聚合平台用于发现线索，不以热度或单一截图作为收入证据；登录或访问受限时不绕过限制。免费资源以厂商条款为准，图片注明来源或编辑示意图。
            </p>
          </>
        ) : available === false ? (
          <p className="source-note">
            {kind === 'subscribe'
              ? '邮件订阅暂未开通，请先在网站查看每日精选。'
              : '在线爆料暂未开通。'}
          </p>
        ) : (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget),
                body = Object.fromEntries(f.entries());
              setBusy(true);
              setResult('');
              try {
                const d = await post(
                  confirmToken ? 'confirm' : kind === 'tip' ? 'tips' : mode,
                  confirmToken ? { token: confirmToken } : { ...body, topics },
                );
                setResult(d.message);
                if (confirmToken)
                  history.replaceState(null, '', '#section/briefing');
              } catch (e) {
                setResult((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            {confirmToken ? (
              <>
                <p>
                  请确认本次邮箱操作。只有点击下方按钮后，订阅或退订才会生效。
                </p>
              </>
            ) : kind === 'subscribe' ? (
              <>
                <p>按你的兴趣接收精选，基础订阅免费。确认邮箱后生效。</p>
                <div className="view-switch">
                  {[
                    ['subscribe', '订阅 / 修改偏好'],
                    ['unsubscribe', '退订'],
                  ].map(([v, label]) => (
                    <button
                      type="button"
                      key={v}
                      aria-pressed={mode === v}
                      onClick={() => {
                        setMode(v);
                        setResult('');
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <label>
                  电子邮箱
                  <input
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    maxLength={254}
                    placeholder="you@example.com"
                  />
                </label>
                {mode === 'subscribe' && (
                  <>
                    <fieldset>
                      <legend>你关心什么</legend>
                      {['今日情报', '一人公司', '免费资源', '工具雷达'].map(
                        (t) => (
                          <label className="check-label" key={t}>
                            <input
                              type="checkbox"
                              checked={topics.includes(t)}
                              onChange={() =>
                                setTopics((p) =>
                                  p.includes(t)
                                    ? p.filter((x) => x !== t)
                                    : [...p, t],
                                )
                              }
                            />
                            {t}
                          </label>
                        ),
                      )}
                    </fieldset>
                    <label>
                      提醒频率
                      <select name="frequency" defaultValue="weekly">
                        <option value="weekly">每周精选 · 少打扰</option>
                        <option value="daily">每日精选</option>
                        <option value="instant">高价值资源即时提醒</option>
                      </select>
                    </label>
                    <label className="check-label consent">
                      <input type="checkbox" required />
                      我同意仅为订阅与退订接收邮件，可随时撤回。
                    </label>
                  </>
                )}
              </>
            ) : (
              <>
                <p>
                  提交后进入审核，不会直接发布。请优先附上官方入口或原始报道。
                </p>
                <label>
                  线索类型
                  <select name="kind">
                    {[
                      '免费资源',
                      '一人公司',
                      '今日情报',
                      '工具雷达',
                      '信息纠错',
                    ].map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </label>
                <label>
                  标题
                  <input
                    name="title"
                    required
                    minLength={5}
                    maxLength={120}
                    placeholder="用一句话说明发现了什么"
                  />
                </label>
                <label>
                  原始链接
                  <input
                    name="url"
                    type="url"
                    pattern="https://.*"
                    required
                    placeholder="https://"
                  />
                </label>
                <label>
                  说明
                  <textarea
                    name="message"
                    required
                    minLength={10}
                    maxLength={3000}
                    placeholder="适用对象、截止时间、是否亲自验证，以及需要注意的条件。"
                  />
                </label>
                <label>
                  联系邮箱（选填）
                  <input name="email" type="email" maxLength={254} />
                </label>
              </>
            )}
            <div className="honeypot" aria-hidden="true">
              <label>
                Website
                <input name="website" tabIndex={-1} autoComplete="off" />
              </label>
            </div>
            <button
              className="button dark full-width"
              disabled={
                busy ||
                (kind === 'subscribe' && mode === 'subscribe' && !topics.length)
              }
            >
              {busy
                ? '提交中…'
                : confirmToken
                  ? '确认邮箱操作'
                  : kind === 'tip'
                    ? '提交线索'
                    : mode === 'subscribe'
                      ? '发送确认邮件'
                      : '发送退订确认邮件'}
              <ArrowRight size={16} />
            </button>
            <output className="form-result">{result}</output>
            <p className="source-note">
              {kind === 'subscribe'
                ? '邮箱仅用于你选择的提醒与订阅管理，不公开展示。'
                : '请勿提交密码、API Key、身份证明或银行卡信息。'}
            </p>
          </form>
        )}
      </dialog>
    </>
  );
}
