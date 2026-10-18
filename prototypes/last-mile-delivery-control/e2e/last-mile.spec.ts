import { expect, test } from '@playwright/test';

test('기본 Worker 모드가 라이더·지도·운영 패널을 표시한다', async ({ page }) => {
  await page.goto('/?src=worker');
  await expect(page.getByLabel('운영 KPI').getByText('활성 라이더')).toBeVisible();
  await expect(page.locator('.kpi-grid').getByText('40', { exact: true }).first()).toBeVisible({ timeout: 10_000 });
  await expect(page.getByLabel('강남 일대 배송 운영 지도')).toBeVisible();
  await expect(page.getByText(/LOD ·/)).toBeVisible();
});

test('운영 조치는 실행 전 확인 후 취소할 수 있다', async ({ page }) => {
  await page.goto('/?src=worker');
  const rider = page.getByRole('button', { name: /RDR-1000/ }).first();
  await expect(rider).toBeVisible({ timeout: 10_000 });
  await rider.click();
  await page.getByRole('button', { name: '재배차 요청', exact: true }).click();
  await expect(page.getByText('실행 전 확인')).toBeVisible();
  await expect(page.getByRole('button', { name: '확인 실행', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '취소', exact: true }).click();
  await expect(page.getByText('실행 전 확인')).toHaveCount(0);
});
