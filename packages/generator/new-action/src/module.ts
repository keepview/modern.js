import { CodeSmith } from '@modern-js/codesmith';
import { FormilyAPI } from '@modern-js/codesmith-formily';
import { merge } from '@modern-js/codesmith-utils/lodash';
import {
  type ActionFunction,
  ActionType,
  ModuleActionFunctions,
  ModuleActionFunctionsDependencies,
  ModuleActionFunctionsDevDependencies,
  ModuleActionFunctionsPeerDependencies,
  ModuleNewActionGenerators,
  ModuleNewActionPluginDependence,
  ModuleNewActionPluginName,
  Solution,
  getModuleNewActionSchema,
  i18n,
} from '@modern-js/generator-common';
import {
  getModernPluginVersion,
  getPackageManager,
} from '@modern-js/generator-utils';
import { enableAlreadyText } from './constants';
import {
  alreadyRepo,
  getGeneratorPath,
  hasEnabledFunction,
  usePluginNameExport,
} from './utils';

interface IModuleNewActionOption {
  locale?: string;
  distTag?: string;
  debug?: boolean;
  registry?: string;
  config?: string;
  cwd?: string;
  needInstall?: boolean;
}

export const ModuleNewAction = async (options: IModuleNewActionOption) => {
  const {
    locale = 'zh',
    distTag = '',
    debug = false,
    registry,
    config = '{}',
    cwd = process.cwd(),
    needInstall = true,
  } = options;

  let UserConfig: Record<string, unknown> = {};

  try {
    UserConfig = JSON.parse(config);
  } catch (e) {
    throw new Error('config is not a valid json');
  }

  const language = (UserConfig.locale as string) || locale;
  i18n.changeLanguage({ locale: language });

  const smith = new CodeSmith({
    debug,
    registryUrl: registry === '' ? undefined : registry,
  });

  if (!alreadyRepo(cwd)) {
    smith.logger.warn('not valid modern.js repo');
  }

  smith.logger?.timing('🕒 Run Module New Tools');

  const prepareGlobalPromise = smith.prepareGlobal();

  const prepareGeneratorPromise = smith.prepareGenerators([
    `@modern-js/dependence-generator@${distTag || 'latest'}`,
    `@modern-js/module-doc-generator@${distTag || 'latest'}`,
    `@modern-js/storybook-next-generator@${distTag || 'latest'}`,
  ]);

  const formilyAPI = new FormilyAPI({
    materials: {},
    config: {},
    data: {},
    current: null,
  });

  let hasOption = false;

  const funcMap: Partial<Record<ActionFunction, boolean>> = {};
  ModuleActionFunctions.forEach(func => {
    const enable = hasEnabledFunction(
      func,
      ModuleActionFunctionsDependencies,
      ModuleActionFunctionsDevDependencies,
      ModuleActionFunctionsPeerDependencies,
      cwd,
    );
    funcMap[func] = enable;
    if (!enable) {
      hasOption = true;
    }
  });

  if (!hasOption) {
    smith.logger.warn('No option can be enabled, exit 1.', funcMap);
    process.exit(1);
  }

  const ans = await formilyAPI.getInputBySchemaFunc(getModuleNewActionSchema, {
    ...UserConfig,
  });

  const actionType = ans.actionType as ActionType;

  const action = ans[actionType] as string;

  if (actionType === ActionType.Function && funcMap[action as ActionFunction]) {
    smith.logger.error(enableAlreadyText[language]);
    return;
  }

  const generator = getGeneratorPath(
    ModuleNewActionGenerators[actionType]![action],
    distTag,
  );
  if (!generator) {
    throw new Error(`no valid option`);
  }

  const devDependency =
    ModuleActionFunctionsDevDependencies[action as ActionFunction];
  const dependency =
    ModuleActionFunctionsDependencies[action as ActionFunction];
  const peerDependency =
    ModuleActionFunctionsPeerDependencies[action as ActionFunction];

  const getModulePluginVersion = (packageName: string) => {
    return getModernPluginVersion(Solution.Module, packageName, {
      registry,
      distTag,
      cwd,
    });
  };

  const shouldUsePluginNameExport = await usePluginNameExport(Solution.Module, {
    registry,
    distTag,
    cwd,
  });

  const finalConfig = merge(
    UserConfig,
    { noNeedInstall: !needInstall },
    ans,
    {
      locale: (UserConfig.locale as string) || locale,
      packageManager:
        UserConfig.packageManager || (await getPackageManager(cwd)),
      distTag,
    },
    {
      devDependencies: devDependency
        ? { [devDependency]: `${await getModulePluginVersion(devDependency)}` }
        : {},
      dependencies: dependency
        ? { [dependency]: `${await getModulePluginVersion(dependency)}` }
        : {},
      peerDependencies: peerDependency
        ? {
            [peerDependency]: `${await getModulePluginVersion(peerDependency)}`,
          }
        : {},
      pluginName: ModuleNewActionPluginName[actionType]![action],
      pluginDependence: ModuleNewActionPluginDependence[actionType]![action],
      shouldUsePluginNameExport,
      isModuleProject: true,
    },
  );

  const task = [
    {
      name: generator,
      config: finalConfig,
    },
  ];

  await Promise.all([prepareGlobalPromise, prepareGeneratorPromise]);
  await smith.forge({
    tasks: task.map(runner => ({
      generator: runner.name,
      config: runner.config,
    })),
    pwd: cwd,
  });

  smith.logger?.timing('🕒 Run Module New Tools', true);
};
