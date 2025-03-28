import path from 'path';
import puppeteer, { type Browser, type Page } from 'puppeteer';
import {
  getPort,
  killApp,
  launchApp,
  launchOptions,
} from '../../../utils/modernTestUtils';

const appDir = path.resolve(__dirname, '../');

describe('dev', () => {
  let app: unknown;
  let appPort: number;
  let page: Page;
  let browser: Browser;
  const errors: string[] = [];
  beforeAll(async () => {
    appPort = await getPort();
    app = await launchApp(appDir, appPort, {}, {});
    browser = await puppeteer.launch(launchOptions as any);
    page = await browser.newPage();
    page.on('pageerror', error => {
      errors.push(error.message);
    });
  });

  test('should return response header set in before correctly', async () => {
    const response = await page.goto(`http://localhost:${appPort}`);
    const headers = response!.headers();
    expect(headers['x-config']).toBe('test-config');
    expect(headers['x-plugin']).toBe('test-plugin');
    expect(headers['x-push-middleware']).toBe('test-middleware');
    expect(headers['x-unshift-middleware']).toBe('test-middleware');
  });

  test('should provide history api fallback correctly', async () => {
    await page.goto(`http://localhost:${appPort}`);
    expect(await page.content()).toContain('<div>home<div>');

    await page.goto(`http://localhost:${appPort}/a`);
    expect(await page.content()).toContain('<div>A</div>');

    await page.goto(`http://localhost:${appPort}/b`);
    expect(await page.content()).toContain('<div>B</div>');
  });

  afterAll(async () => {
    await killApp(app);
    await page.close();
    await browser.close();
  });
});
