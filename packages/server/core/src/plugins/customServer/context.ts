import type {
  AfterMatchContext,
  AfterRenderContext,
  AfterStreamingRenderContext,
  HookContext,
  MiddlewareContext,
  ModernResponse,
  ServerRoute,
} from '@modern-js/types';
import type { ServerNodeEnv } from '../../adapters/node/hono';
import type { Context, ServerEnv } from '../../types';
import { type ResArgs, createBaseHookContext } from './base';
import { RouterAPI } from './routerApi';
import { TemplateApi } from './template';

export function getAfterMatchCtx(
  entryName: string,
  baseHookCtx: HookContext,
): AfterMatchContext {
  const afterMatchCtx = baseHookCtx as unknown as AfterMatchContext;

  afterMatchCtx.router = new RouterAPI(entryName);

  return afterMatchCtx;
}

export async function getAfterRenderCtx(
  c: Context,
  baseHookCtx: HookContext,
  route: Partial<ServerRoute>,
): Promise<AfterRenderContext> {
  const afterRenderCtx = baseHookCtx as unknown as AfterRenderContext;

  const resBody = await c.res.text();
  afterRenderCtx.template = new TemplateApi(resBody);
  afterRenderCtx.route = route;

  return afterRenderCtx;
}

export function createCustomMiddlewaresCtx(
  c: Context<ServerNodeEnv & ServerEnv>,
  locals: Record<string, any>,
  resArgs?: ResArgs,
): MiddlewareContext {
  const baseContext = createBaseHookContext(
    c as unknown as Context<ServerEnv>,
    resArgs,
  );

  const response = baseContext.response as ModernResponse & {
    locals: Record<string, any>;
  };
  response.locals = locals;

  return {
    ...baseContext,
    response,
    source: {
      req: c.env.node?.req,
      res: c.env.node?.res,
    },
  };
}

export function createAfterStreamingRenderContext(
  baseHookCtx: HookContext,
  route: Partial<ServerRoute>,
): (chunk: string) => AfterStreamingRenderContext {
  const streamingRenderCtx =
    baseHookCtx as unknown as AfterStreamingRenderContext;

  streamingRenderCtx.route = route;
  return (chunk: string) => {
    streamingRenderCtx.chunk = chunk;
    return streamingRenderCtx;
  };
}
