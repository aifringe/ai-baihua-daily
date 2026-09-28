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
  });
}

test('搜索、分类、排序、分页和详情流程可用', async ({page}) => {
  const errors: string[] = [];
  page.on('console', (message) => {if (message.type() === 'error') errors.push(message.text());});
  await page.goto('/');
  await page.getByLabel('搜索新闻').fill('OpenAI');
  await expect(page.locator('.news-card')).not.toHaveCount(0);
  await page.getByLabel('搜索新闻').fill('');
  await page.getByRole('button', {name: '日常应用', exact: true}).click();
  await expect(page.locator('.news-card').first().locator('.meta').getByText('日常应用')).toBeVisible();
  await page.getByRole('button', {name: '近期精选', exact: true}).click();
  await page.getByLabel('新闻排序').selectOption('important');
  await expect(page.getByLabel('新闻排序')).toHaveValue('important');
  await page.getByLabel('新闻排序').selectOption('latest');
  await page.getByRole('button', {name: '下一页'}).click();
  await expect(page.getByText(/第 2 \/ \d+ 页/)).toBeVisible();
  await page.getByRole('button', {name: '上一页'}).click();
  await page.locator('.news-card h2 a').first().click();
  await expect(page.getByRole('link', {name: '返回新闻列表'})).toBeVisible();
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
