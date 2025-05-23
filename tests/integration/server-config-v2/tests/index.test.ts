import dns from 'node:dns';
import path from 'path';
import {
  getPort,
  killApp,
  launchApp,
  modernBuild,
  modernServe,
} from '../../../utils/modernTestUtils';
import 'isomorphic-fetch';

dns.setDefaultResultOrder('ipv4first');

const supportServerPlugins = async ({
  host,
  port,
}: {
  host: string;
  port: number;
}) => {
  const res = await fetch(`${host}:${port}/`);
  expect(res.status).toBe(200);
  const text = await res.text();
  expect(text).toMatch('bytedance');
};

const supportServerMiddleware = async ({
  host,
  port,
}: {
  host: string;
  port: number;
}) => {
  const res = await fetch(`${host}:${port}/`);
  expect(res.status).toBe(200);

  const { headers } = res;
  expect(headers.get('x-middleware')).toMatch('request');
};

const supportServerRenderMiddleware = async ({
  host,
  port,
}: {
  host: string;
  port: number;
}) => {
  const res = await fetch(`${host}:${port}/`);
  expect(res.status).toBe(200);

  const { headers } = res;
  expect(headers.get('Server-Timing')).toMatch('render');
};

describe('server config', () => {
  describe('dev', () => {
    let port = 8080;
    const host = `http://localhost`;
    const appPath = path.resolve(__dirname, '../');
    let app: any;

    beforeAll(async () => {
      jest.setTimeout(1000 * 60 * 2);
      port = await getPort();
      app = await launchApp(appPath, port, {
        cwd: appPath,
      });
    });

    test('plugins should works', async () => {
      // await new Promise(resolve => setTimeout(resolve, 1000));
      await supportServerPlugins({
        host,
        port,
      });
      await supportServerMiddleware({
        host,
        port,
      });
      await supportServerRenderMiddleware({
        host,
        port,
      });
    });

    afterAll(async () => {
      await killApp(app);
    });
  });

  describe('prod', () => {
    let port = 8080;
    const host = `http://localhost`;
    const appPath = path.resolve(__dirname, '../');
    let app: any;

    beforeAll(async () => {
      port = await getPort();

      await modernBuild(appPath, [], {
        cwd: appPath,
      });

      app = await modernServe(appPath, port, {
        cwd: appPath,
      });
    });

    test('plugins should works', async () => {
      await supportServerPlugins({
        host,
        port,
      });
      await supportServerMiddleware({
        host,
        port,
      });
      await supportServerRenderMiddleware({
        host,
        port,
      });
    });

    afterAll(async () => {
      await killApp(app);
    });
  });
});
