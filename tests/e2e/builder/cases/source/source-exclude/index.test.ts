import path from 'path';
import { expect, test } from '@modern-js/e2e/playwright';
import { build, proxyConsole } from '@scripts/shared';

test('should not compile specified file when source.exclude', async () => {
  const { restore } = proxyConsole();
  await expect(
    build({
      cwd: __dirname,
      entry: { index: path.resolve(__dirname, './src/index.js') },
      builderConfig: {
        source: {
          exclude: [path.resolve(__dirname, './src/test.js')],
        },
        security: {
          checkSyntax: true,
        },
      },
    }),
  ).rejects.toThrowError('incompatible syntax');

  restore();
});
