import { test, expect } from '@playwright/test';

test('home page loads static entrypoints', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/NBC Stormwater Tools/);
  await expect(page.locator('#gate')).toBeAttached();
  await expect(page.locator('link[href="./styles.css"]')).toHaveCount(1);
});

test('required local vendor globals are available', async ({ page }) => {
  await page.goto('/');
  const globals = await page.evaluate(() => ({
    leaflet: Boolean(window.L),
    jszip: Boolean(window.JSZip),
    xlsx: Boolean(window.XLSX),
    chart: Boolean(window.Chart),
    exceljs: Boolean(window.ExcelJS),
    boundaries: Boolean(window.NSW_LGA_BOUNDARIES),
    bomGauges: Boolean(window.BOM_NORTHERN_BEACHES_GAUGES),
    ifdCache: Boolean(window.BOM_IFD_CACHE)
  }));

  expect(globals).toEqual({
    leaflet: true,
    jszip: true,
    xlsx: true,
    chart: true,
    exceljs: true,
    boundaries: true,
    bomGauges: true,
    ifdCache: true
  });
});
