export type Article = {
  id: string;
  title: string;
  summary: string;
  category: string;
  source: string;
  url: string;
  publishedAt: string;
  importance: number;
  why: string;
  sections: { heading: string; text: string }[];
  editor: string;
  image?: string;
  imageAlt?: string;
  imageKind?: string;
  datePrecision?: string;
  accessNote?: string;
  sources?: { name: string; url: string }[];
};
export type Edition = {
  updatedAt: string;
  lastCheckedAt: string;
  editionDate?: string;
  editionUpdatedAt?: string;
  dailyIds?: string[];
  articles: Article[];
};
export function safeUrl(value: string) {
  try {
    const u = new URL(value);
    return u.protocol === 'https:' && !u.username && !u.password
      ? u.href
      : undefined;
  } catch {
    return undefined;
  }
}
export function safeImage(value?: string) {
  return value &&
    /^\.\/(news-images|illustrations|people)\/[a-zA-Z0-9_.-]+$/.test(value)
    ? value
    : './illustrations/product.svg';
}
export function newsCategory(value: string) {
  return ['产品动态', '行业动态', '人物对话', '报告解读'].includes(value)
    ? value
    : ['行业变化', '安全与规则'].includes(value)
      ? '行业动态'
      : '产品动态';
}
export function validEdition(value: unknown): value is Edition {
  if (!value || typeof value !== 'object') return false;
  const d = value as Edition;
  return (
    typeof d.lastCheckedAt === 'string' &&
    !Number.isNaN(Date.parse(d.lastCheckedAt)) &&
    Array.isArray(d.articles) &&
    d.articles.every(
      (a) =>
        a &&
        [
          'id',
          'title',
          'summary',
          'source',
          'category',
          'url',
          'publishedAt',
          'editor',
        ].every((k) => typeof a[k as keyof Article] === 'string') &&
        /^\d{4}-\d{2}-\d{2}$/.test(a.publishedAt) &&
        !!safeUrl(a.url) &&
        Number.isFinite(a.importance) &&
        Array.isArray(a.sections) &&
        a.sections.every(
          (s) => typeof s.heading === 'string' && typeof s.text === 'string',
        ),
    )
  );
}
export function dailyStories(data: Edition) {
  const date = new Date().toLocaleDateString('sv-SE', {
    timeZone: 'Asia/Shanghai',
  });
  const eligible = data.articles.filter((a) => a.publishedAt <= date);
  const ids = data.dailyIds;
  if (Array.isArray(ids))
    return ids
      .map((id) => eligible.find((a) => a.id === id))
      .filter((a): a is Article => !!a)
      .slice(0, 5);
  return [...eligible]
    .sort(
      (a, b) =>
        b.publishedAt.localeCompare(a.publishedAt) ||
        b.importance - a.importance,
    )
    .slice(0, 5);
}
