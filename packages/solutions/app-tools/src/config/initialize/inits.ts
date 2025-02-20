import path, { isAbsolute } from 'path';
import { findExists } from '@modern-js/utils';
import type { AppNormalizedConfig } from '../../types';
import type { AppToolsContext } from '../../types/new';

export function initHtmlConfig(
  config: AppNormalizedConfig<'shared'>,
  appContext: AppToolsContext<'shared'>,
): AppNormalizedConfig<'shared'>['html'] {
  const ICON_EXTENSIONS = ['png', 'jpg', 'jpeg', 'svg', 'ico'];
  config.html.appIcon = createBuilderAppIcon(config, appContext);
  config.html.favicon = createBuilderFavicon(config, appContext);

  return config.html;

  function createBuilderAppIcon(
    config: AppNormalizedConfig<'shared'>,
    appContext: AppToolsContext<'shared'>,
  ) {
    const { appIcon } = config.html;
    const { configDir } = config.source;
    const getDefaultAppIcon = () =>
      findExists(
        ICON_EXTENSIONS.map(ext =>
          path.resolve(
            appContext.appDirectory,
            configDir || './config',
            `icon.${ext}`,
          ),
        ),
      );
    return appIcon || getDefaultAppIcon() || undefined;
  }
  function createBuilderFavicon(
    config: AppNormalizedConfig<'shared'>,
    appContext: AppToolsContext<'shared'>,
  ) {
    const { configDir } = config.source;
    const { favicon } = config.html;
    const getDefaultFavicon = () =>
      findExists(
        ICON_EXTENSIONS.map(ext =>
          path.resolve(
            appContext.appDirectory,
            configDir || './config',
            `favicon.${ext}`,
          ),
        ),
      );
    return favicon || getDefaultFavicon() || undefined;
  }
}

export function initSourceConfig(
  config: AppNormalizedConfig<'shared'>,
  appContext: AppToolsContext<'shared'>,
  bundler: 'webpack' | 'rspack',
) {
  config.source.include = createBuilderInclude(config, appContext);

  if (bundler === 'webpack') {
    config.source.moduleScopes = createBuilderModuleScope(config);
  }
}

function createBuilderInclude(
  config: AppNormalizedConfig<'shared'>,
  appContext: AppToolsContext<'shared'>,
) {
  const { include } = config.source;
  const defaultInclude = [appContext.internalDirectory];
  const transformInclude = (include || [])
    .map(include => {
      if (typeof include === 'string') {
        if (isAbsolute(include)) {
          return include;
        }
        return new RegExp(include);
      }
      return include;
    })
    .concat(defaultInclude); // concat default Include

  return transformInclude;
}

export function createBuilderModuleScope(
  config: AppNormalizedConfig<'webpack'>,
) {
  type ModuleScopes = Array<string | RegExp>;

  const { moduleScopes } = config.source;
  if (moduleScopes) {
    const DEFAULT_SCOPES: ModuleScopes = ['./src', './shared', /node_modules/];

    const builderModuleScope = applyScopeOptions(DEFAULT_SCOPES, moduleScopes);
    return builderModuleScope;
  } else {
    return undefined;
  }

  function isPrimitiveScope(items: unknown[]): items is ModuleScopes {
    return items.every(
      item =>
        typeof item === 'string' ||
        Object.prototype.toString.call(item) === '[object RegExp]',
    );
  }

  type ScopesOptions = NonNullable<
    AppNormalizedConfig<'webpack'>['source']['moduleScopes']
  >;

  function applyScopeOptions(defaults: ModuleScopes, options: ScopesOptions) {
    if (Array.isArray(options)) {
      if (isPrimitiveScope(options)) {
        return defaults.concat(options);
      }
      return options.reduce<ModuleScopes>(applyScopeOptions, defaults);
    }
    return options(defaults) || defaults;
  }
}
