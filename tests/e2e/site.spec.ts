import { expect, test } from '@playwright/test';
const widths = [320, 375, 390, 430, 768, 1024, 1440];
for (const width of widths) {
  test(`四个栏目和详情在 ${width}px 无溢出且图片可读`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await expect(page.locator('.primary-nav button')).toHaveText([
      '今日情报',
      '一人公司',
      '免费资源',
      '工具雷达',
    ]);
    await expect(page.locator('.headline-card')).toHaveCount(1);
    await expect
      .poll(() => page.locator('.headline-card, .news-card').count())
      .toBeGreaterThanOrEqual(3);
    await expect
      .poll(() => page.locator('.headline-card, .news-card').count())
      .toBeLessThanOrEqual(5);
    for (const button of ['今日情报', '一人公司', '免费资源', '工具雷达']) {
      await page
        .locator('.primary-nav')
        .getByRole('button', { name: button, exact: true })
        .click();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      expect(
        await page
          .locator('main img')
          .evaluateAll((images) =>
            images.every(
              (i) =>
                (i as HTMLImageElement).complete &&
                (i as HTMLImageElement).naturalWidth > 0,
            ),
          ),
      ).toBe(true);
    }
    await page
      .locator('.primary-nav')
      .getByRole('button', { name: '今日情报', exact: true })
      .click();
    await page.locator('.headline-body h2 a').click();
    await expect(page.locator('.detail')).toBeVisible();
    await expect(
      page.getByRole('heading', { name: '发生了什么', exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: '换成人话', exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `test-results/haixuan-${width}.png`,
      fullPage: true,
    });
  });
}
test('四类筛选、搜索、档案分页和收藏持久化', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(page.locator('.filters button')).toHaveText([
    '全部',
    '产品动态',
    '行业动态',
    '人物对话',
    '报告解读',
  ]);
  await page
    .locator('.headline-card')
    .getByRole('button', { name: '收藏情报', exact: true })
    .click();
  await page.getByRole('button', { name: '我的收藏', exact: true }).click();
  await expect(page.locator('.news-card')).toHaveCount(1);
  await page.reload();
  await page.getByRole('button', { name: '我的收藏', exact: true }).click();
  await expect(page.locator('.news-card')).toHaveCount(1);
  await page.getByRole('button', { name: '历史档案', exact: true }).click();
  await expect(page.locator('.news-card')).toHaveCount(10);
  await page.getByRole('button', { name: '下一页', exact: true }).click();
  await expect(page.getByText(/第 2 \/ \d+ 页/)).toBeVisible();
  await page.getByLabel('情报排序').selectOption('importance');
  await expect(page.getByText(/第 1 \/ \d+ 页/)).toBeVisible();
  await page.getByLabel('搜索当前栏目').fill('OpenAI');
  await expect(page.locator('.news-card')).not.toHaveCount(0);
  await page.getByLabel('清空搜索').click();
  await page.getByRole('button', { name: '人物对话', exact: true }).click();
  await expect(page.locator('.news-card')).not.toHaveCount(0);
  expect(
    await page.locator('.news-card .category-label').allTextContents(),
  ).toEqual(expect.arrayContaining(['人物对话']));
  await page.getByRole('button', { name: '报告解读', exact: true }).click();
  await expect(page.locator('.news-card')).not.toHaveCount(0);
  expect(
    (await page.locator('.news-card .category-label').allTextContents()).every(
      (x) => x === '报告解读',
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});
test('案例来源与免费资源详情、领取标记可用', async ({ page }) => {
  await page.goto('/#section/business');
  await expect(page.locator('.business-card')).toHaveCount(5);
  await page.locator('.business-card h2 a').first().click();
  await expect(page.getByRole('heading', { name: '第一步怎么做' })).toHaveCount(
    0,
  );
  await expect(page.getByText('第一步怎么做', { exact: true })).toBeVisible();
  await expect(
    page.getByRole('link', { name: '查看原始报道' }),
  ).toHaveAttribute('href', /66wz.com/);
  await page.goto('/#section/resources');
  await page.locator('.resource-card h2 a').first().click();
  await expect(
    page.getByRole('link', { name: '前往官方入口' }),
  ).toHaveAttribute('href', /help.aliyun.com/);
  await page.getByRole('button', { name: '标记我已领取', exact: true }).click();
  await expect(
    page.getByRole('button', { name: '本机已标记领取' }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole('button', { name: '本机已标记领取' }),
  ).toBeVisible();
});
test('订阅不伪造发送成功、弹窗可退出并恢复焦点', async ({ page }) => {
  await page.goto('/');
  const button = page.getByRole('button', { name: '订阅精选', exact: true });
  await button.click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page
    .getByLabel('电子邮箱', { exact: true })
    .fill('ui-test@example.com');
  await page.getByLabel(/我同意/).check();
  await page.getByRole('button', { name: '发送确认邮件', exact: true }).click();
  await expect(page.locator('.form-result')).toContainText('邮件服务尚未开通');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(button).toBeFocused();
});
test('网络失败保留精选，坏ID、空结果和键盘入口有明确状态', async ({ page }) => {
  await page.route('**/news.json*', (r) => r.abort());
  await page.goto('/');
  await expect(page.locator('.notice')).toContainText('已保存的精选');
  await expect(page.locator('.headline-card')).toHaveCount(1);
  await page.getByLabel('搜索当前栏目').fill('找不到的任意关键词xyz');
  await expect(
    page.getByRole('heading', { name: '没有找到相关情报' }),
  ).toBeVisible();
  await page.goto('/#news/nonexistent');
  await expect(
    page.getByRole('heading', { name: '没有找到这条内容' }),
  ).toBeVisible();
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: '跳到主要内容' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#main-content')).toBeFocused();
});
test('审核服务不泄露未审核反馈、拒绝跨站和非法输入', async ({ request }) => {
  const feedback = await request.post('/api/feedback', {
    data: {
      resource: 'aliyun-bailian',
      status: '我领到了',
      message: '端到端测试反馈，尚未通过审核。',
    },
  });
  expect(feedback.status()).toBe(202);
  const rows = await (
    await request.get('/api/feedback?resource=aliyun-bailian')
  ).json();
  expect(
    rows.items.some(
      (r: { message: string }) =>
        r.message === '端到端测试反馈，尚未通过审核。',
    ),
  ).toBe(false);
  expect(
    (
      await request.post('/api/tips', {
        data: {},
        headers: { Origin: 'https://evil.example' },
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await request.post('/api/feedback', {
        data: {
          resource: 'invalid',
          status: '我领到了',
          message: '非法资源反馈测试',
        },
      })
    ).status(),
  ).toBe(400);
});

test('纯静态上线时明确提示订阅服务未开通', async ({ page }) => {
  await page.route('**/api/health', (route) =>
    route.fulfill({ status: 404, body: 'Not Found' }),
  );
  await page.goto('/');
  await page.getByRole('button', { name: '订阅精选', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('邮件订阅暂未开通');
  await expect(
    page.getByRole('button', { name: '发送确认邮件', exact: true }),
  ).toHaveCount(0);
});
