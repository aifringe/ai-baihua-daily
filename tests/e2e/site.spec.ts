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
  await expect(page.getByRole('button', {name: '返回新闻列表'})).toBeVisible();
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

test('手机 AI 面板可打开、回答并关闭', async ({page}) => {
  await page.setViewportSize({width:390,height:844});
  await page.route('**/api/chat.php', route=>route.fulfill({json:{answer:'这是当前新闻的**白话回答**。'}}));
  await page.goto('/');
  await page.locator('.news-card h2 a').first().click();
  await page.getByRole('button',{name:'问这条新闻',exact:true}).click();
  await expect(page.locator('dialog')).toBeVisible();
  await page.getByLabel('关于新闻的问题').fill('解释一下');
  await page.getByRole('button',{name:'发送问题'}).click();
  await expect(page.locator('.markdown-answer strong')).toHaveText('白话回答');
  await page.getByRole('button',{name:'关闭 AI 提问'}).click();
  await expect(page.locator('dialog')).not.toBeVisible();
  await page.getByRole('button',{name:'返回新闻列表'}).click();
  await expect(page.locator('.news-card').first()).toBeVisible();
});

test('桌面详情 AI 顶部对齐且大屏充分利用空间', async ({page}) => {
  await page.setViewportSize({width:1920,height:1080});
  await page.goto('/');
  expect(await page.locator('.shell').evaluate(el=>el.getBoundingClientRect().width)).toBeGreaterThan(1500);
  await page.locator('.news-card h2 a').first().click();
  await expect(page.locator('.detail')).toBeVisible();
  const tops=await page.evaluate(()=>({article:document.querySelector('.detail')!.getBoundingClientRect().top,chat:document.querySelector('.ask-card')!.getBoundingClientRect().top}));
  expect(Math.abs(tops.article-tops.chat)).toBeLessThan(3);
  await expect(page.getByLabel('关于新闻的问题')).toBeVisible();
});
