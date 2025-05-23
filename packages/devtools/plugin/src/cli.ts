import {
  type AppTools,
  type CliPlugin,
  type UserConfig,
  mergeConfig,
} from '@modern-js/app-tools';
import type { ClientDefinition } from '@modern-js/devtools-kit/node';
import { logger } from '@modern-js/utils';
import type { RsbuildPlugin, RsbuildPluginAPI } from '@rsbuild/core';
import { createHooks } from 'hookable';
import createDeferred from 'p-defer';
import { proxy } from 'valtio';
import { type DevtoolsPluginOptions, resolveContext } from './options';
import { pluginCleanup } from './plugins/cleanup';
import { pluginDebug } from './plugins/debug';
import { pluginHtml } from './plugins/html';
import { pluginHttp } from './plugins/http';
import { pluginManifest } from './plugins/manifest';
import { pluginRpc } from './plugins/rpc';
import { pluginServiceWorker } from './plugins/service-worker';
import { pluginSettleState } from './plugins/settle';
import { pluginState } from './plugins/state';
import { pluginWatcher } from './plugins/watcher';
import type { CliPluginAPI, Plugin, PluginApi } from './types';

export type { DevtoolsPluginOptions };

export type DevtoolsPlugin = CliPlugin<AppTools> & {
  setClientDefinition: (def: ClientDefinition) => void;
  plugins: Plugin[];
};

export const BUILTIN_PLUGINS: Plugin[] = [
  pluginDebug,
  pluginWatcher,
  pluginServiceWorker,
  // --- //
  pluginHttp,
  pluginHtml,
  pluginState,
  pluginRpc,
  pluginSettleState,
  pluginManifest,
  // --- //
  pluginCleanup,
];

export const devtoolsPlugin = (
  inlineOptions: DevtoolsPluginOptions = {},
): DevtoolsPlugin => {
  const ctx = proxy(resolveContext(inlineOptions));
  const setupBuilder = createDeferred<RsbuildPluginAPI>();
  const setupFramework = createDeferred<CliPluginAPI>();
  const _sharedVars: Record<string, unknown> = {};
  const api: PluginApi = {
    builderHooks: createHooks(),
    frameworkHooks: createHooks(),
    hooks: createHooks(),
    setupBuilder: () => setupBuilder.promise,
    setupFramework: () => setupFramework.promise,
    get context() {
      return ctx;
    },
    get vars() {
      return _sharedVars as any;
    },
  };

  api.hooks.hook('cleanup', () => {
    setupBuilder.reject(new Error('Devtools Plugin is disabled'));
    setupFramework.reject(new Error('Devtools Plugin is disabled'));
    // api.builderHooks.removeAllHooks();
    // api.frameworkHooks.removeAllHooks();
    // api.hooks.removeAllHooks();
  });

  const instance: DevtoolsPlugin = {
    name: '@modern-js/plugin-devtools',
    usePlugins: [],
    plugins: [...BUILTIN_PLUGINS],
    setClientDefinition(def) {
      Object.assign(ctx.def, def);
    },
    async setup(frameworkApi) {
      if (!ctx.enable) return {};

      setupFramework.resolve(frameworkApi);

      for (const plugin of instance.plugins) {
        await plugin.setup(api);
      }

      await api.frameworkHooks.callHook('setup', frameworkApi);

      return {
        async prepare() {
          await api.frameworkHooks.callHook('prepare');
        },
        async modifyFileSystemRoutes(params) {
          await api.frameworkHooks.callHook('modifyFileSystemRoutes', params);
          return params;
        },
        async afterCreateCompiler(params) {
          await api.frameworkHooks.callHook('afterCreateCompiler', params);
        },
        async modifyServerRoutes(params) {
          await api.frameworkHooks.callHook('modifyServerRoutes', params);
          return params;
        },
        async beforeRestart() {
          await api.frameworkHooks.callHook('beforeRestart');
        },
        beforeExit() {
          api.frameworkHooks.callHookWith(
            hooks => hooks.forEach(hook => hook()),
            'beforeExit',
          );
        },
        async afterDev(params) {
          await api.frameworkHooks.callHook('afterDev', params);
        },
        async afterBuild(params) {
          api.frameworkHooks.callHook('afterBuild', params);
        },
        async config() {
          logger.info(`${ctx.def.name.formalName} DevTools is enabled`);
          const configs: UserConfig<AppTools>[] =
            await api.frameworkHooks.callHookParallel('config');

          const builderPlugin: RsbuildPlugin = {
            name: 'builder-plugin-devtools',
            async setup(builderApi) {
              await api.builderHooks.callHook('setup', builderApi);
              setupBuilder.resolve(builderApi);

              builderApi.modifyBundlerChain(async (options, utils) => {
                await api.builderHooks.callHook(
                  'modifyBundlerChain',
                  options,
                  utils,
                );
              });
              builderApi.modifyWebpackConfig(async (config, utils) => {
                await api.builderHooks.callHook(
                  'modifyWebpackConfig',
                  config,
                  utils,
                );
              });
              builderApi.modifyRspackConfig(async (config, utils) => {
                await api.builderHooks.callHook(
                  'modifyRspackConfig',
                  config,
                  utils,
                );
              });
              builderApi.onBeforeCreateCompiler(async params => {
                await api.builderHooks.callHook(
                  'onBeforeCreateCompiler',
                  params,
                );
              });
              builderApi.onAfterCreateCompiler(async params => {
                await api.builderHooks.callHook(
                  'onAfterCreateCompiler',
                  params,
                );
              });
              builderApi.onDevCompileDone(async params => {
                await api.builderHooks.callHook('onDevCompileDone', params);
              });
              builderApi.onAfterBuild(async params => {
                await api.builderHooks.callHook('onAfterBuild', params);
              });
              builderApi.onExit(() => {
                api.builderHooks.callHookWith(
                  hooks => hooks.forEach(hook => hook()),
                  'onExit',
                  { exitCode: 0 },
                );
              });
            },
          };
          configs.push({ builderPlugins: [builderPlugin] });
          return mergeConfig(configs) as unknown as UserConfig<AppTools>;
        },
      };
    },
  };
  return instance;
};

export default devtoolsPlugin;
