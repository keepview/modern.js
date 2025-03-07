import { ensureArray, isOverriddenConfigKey } from '@modern-js/utils';
import { isFunction, mergeWith } from '@modern-js/utils/lodash';
import type { DeepPartial } from '../../../types/utils';

export const mergeConfig = <Config, NormalizedConfig>(
  configs: Array<DeepPartial<Config>>,
): NormalizedConfig =>
  mergeWith({}, ...configs, (target: any, source: any, key: string) => {
    // Do not use the following merge logic for some keys
    if (
      key === 'designSystem' ||
      (key === 'tailwindcss' && typeof source === 'object')
    ) {
      return mergeWith({}, target ?? {}, source ?? {});
    }

    // Some keys should use source to override target
    if (isOverriddenConfigKey(key)) {
      return source ?? target;
    }

    if (Array.isArray(target) || Array.isArray(source)) {
      if (target === undefined) {
        return source;
      }
      if (source === undefined) {
        return target;
      }
      return [...ensureArray(target), ...ensureArray(source)];
    }

    if (isFunction(target) || isFunction(source)) {
      if (source === undefined) {
        return target;
      }
      if (target === undefined) {
        return source;
      }
      return [target, source];
    }

    return undefined;
  });
