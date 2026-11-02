import { expect, test, type Page } from '@playwright/test';

async function openWorker(page: Page): Promise<void> {
  await page.goto('/?src=worker');
  await expect(page.getByText('프로토타입 단계')).toBeVisible();
  await expect(page.locator('canvas')).toHaveCount(1);
  await expect(page.getByText(/LIVE|연결 중/).first()).toBeVisible({ timeout: 15_000 });
}

test('Worker 모드가 글로브와 실시간 관제 패널을 표시한다', async ({ page }) => {
  await openWorker(page);
  await expect(page.getByText('합성 데이터 · 공개 경계 데이터 · 실제 운송망 아님')).toBeVisible();
  await expect(page.getByRole('button', { name: '아시아·태평양', exact: true })).toBeVisible();
  await expect(page.getByText('Executive KPI')).toBeVisible();
});

test('권역 전환과 글로브 복귀가 동작한다', async ({ page }) => {
  await openWorker(page);
  await page.getByRole('button', { name: '아시아·태평양', exact: true }).click();
  await expect(page.getByRole('button', { name: '← 글로브', exact: true })).toBeVisible();
  await expect(page.getByText(/LOD 권역 흐름/)).toBeVisible({ timeout: 5_000 });

  await page.getByRole('button', { name: '← 글로브', exact: true }).click();
  await expect(page.getByRole('button', { name: '아시아·태평양', exact: true })).toBeVisible({ timeout: 5_000 });
  await expect(page.getByText(/LOD 글로브 집계/)).toBeVisible({ timeout: 5_000 });
});

test('화물 Drawer와 시나리오 및 진단 패널이 동작한다', async ({ page }) => {
  await openWorker(page);
  const shipment = page.locator('.ship-row').first();
  await expect(shipment).toBeVisible({ timeout: 15_000 });
  await shipment.click();
  await expect(page.locator('.drawer')).toBeVisible();

  await page.getByRole('button', { name: '항만 혼잡', exact: true }).click();
  await expect(page.getByRole('button', { name: '항만 혼잡', exact: true })).toHaveClass(/on/);

  await page.getByRole('button', { name: /진단/ }).click();
  await expect(page.getByText('FPS', { exact: true })).toBeVisible();
  await expect(page.getByText('msg/s', { exact: true })).toBeVisible();
});
