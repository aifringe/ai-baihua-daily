import {expect, test} from '@playwright/test';

const widths = [320, 375, 390, 430, 768, 1024, 1440];

for (const width of widths) {
  test(`首页在 ${width}px 无横向溢出`, async ({page}) => {
    await page.setViewportSize({width, height: width < 700 ? 844 : 900});
    await page.goto('/');
    await expect(page.getByRole('heading', {name: '今天，AI 又发生了什么？'})).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(overflow).toBe(false);
    await expect(page.locator('.news-card').first()).toBeVisible();
    await page.locator('.news-card h2 a').first().click();
    await expect(page.locator('.detail')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
  });
}

test('搜索、分类、排序、分页和详情流程可用', async ({page}) => {
  const errors: string[] = [];
  page.on('console', (message) => {if (message.type() === 'error') errors.push(message.text());});
  await page.goto('/');
  await page.getByLabel('搜索情报').fill('OpenAI');
  await expect(page.locator('.news-card')).not.toHaveCount(0);
  await expect(page.getByText(/全年共 \d+ 条/)).toBeVisible();
  await page.getByLabel('搜索情报').fill('');
  await page.getByRole('button', {name: '日常应用', exact: true}).click();
  await expect(page.locator('.news-card').first().locator('.meta').getByText('日常应用')).toBeVisible();
  await page.getByRole('button', {name: '近期精选', exact: true}).click();
  await page.getByRole('button', {name: '全年档案', exact: true}).click();
  await expect(page.locator('.news-card').first()).toBeVisible();
  await page.getByRole('button', {name: '近期精选', exact: true}).click();
  await page.getByRole('button', {name: '最新发布'}).click();
  await expect(page.getByRole('menu', {name: '新闻排序'})).toBeVisible();
  await page.getByRole('menuitemradio', {name: '重要优先'}).click();
  await expect(page.getByRole('button', {name: '重要优先'})).toBeVisible();
  await page.getByRole('button', {name: '重要优先'}).click();
  await page.getByRole('menuitemradio', {name: '最新发布'}).click();
  await page.getByRole('button', {name: '下一页'}).click();
  await expect(page.getByText(/第 2 \/ \d+ 页/)).toBeVisible();
  await page.getByRole('button', {name: '上一页'}).click();
  await page.locator('.news-card h2 a').first().click();
  await expect(page.getByRole('button', {name: '返回情报列表'})).toBeVisible();
  await expect(page.getByRole('heading', {name: '发生了什么', exact: true})).toBeVisible();
  await expect(page.getByRole('heading', {name: '换成人话'})).toBeVisible();
  expect(errors).toEqual([]);
});

test('键盘焦点与跳转主内容入口可用', async ({page}) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', {name: '跳到主要内容'})).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#main-content')).toBeFocused();
});

test('桌面详情充分利用空间且没有问答入口', async ({page}) => {
  await page.setViewportSize({width:1920,height:1080});
  await page.goto('/');
  expect(await page.locator('.shell').evaluate(el=>el.getBoundingClientRect().width)).toBeGreaterThan(1500);
  await page.locator('.news-card h2 a').first().click();
  await expect(page.locator('.detail')).toBeVisible();
  await expect(page.getByText(/云端 AI|不懂就问|发送问题/)).toHaveCount(0);
});

test('来源说明可展开，列表每页最多十条', async ({page}) => {
  await page.goto('/');
  await expect(page.locator('.news-card')).toHaveCount(10);
  await page.getByText('内容来源与筛选规则').click();
  await expect(page.locator('.source-catalog a')).not.toHaveCount(0);
});

test('五个主栏目顺序正确且都有实际内容', async ({page}) => {
  await page.goto('/');
  const labels = await page.locator('.primary-nav button').allTextContents();
  expect(labels.map(label => label.replace(/^0\d/, ''))).toEqual(['今日情报', '人物对话', '工具雷达', '报告趋势', '行动建议']);
  await page.getByRole('button', {name: /02人物对话/}).click();
  await expect(page.locator('.feature-card')).toHaveCount(3);
  await expect(page.locator('.person-image')).toHaveCount(3);
  expect(await page.locator('.person-image').evaluateAll(images => images.every(image => (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0))).toBe(true);
  await page.getByRole('button', {name: /03工具雷达/}).click();
  await expect(page.locator('.tool-row')).toHaveCount(11);
  await expect(page.getByRole('heading', {name: 'GitHub 本月热门'})).toBeVisible();
  await page.getByRole('button', {name: /04报告趋势/}).click();
  await expect(page.locator('.report-card')).toHaveCount(4);
  await expect(page.locator('.report-card h2 a')).toHaveCount(4);
  await expect(page.getByRole('link', {name: '阅读原报告'})).toHaveCount(4);
  await page.getByRole('button', {name: /05行动建议/}).click();
  await expect(page.locator('.advice-card')).toHaveCount(3);
});
