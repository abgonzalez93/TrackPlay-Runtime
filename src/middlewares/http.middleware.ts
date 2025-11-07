import compression from 'compression'
import cors from 'cors'
import { type Express, json, type RequestHandler } from 'express'
import helmet from 'helmet'
import { type HttpMiddlewareOptions } from '#types/middlewares.type'

const useIfEnabled = <Options>(
  app: Express,
  middleware: (options?: Options) => RequestHandler | RequestHandler[],
  options?: Options | false,
): void => {
  if (options === false) return

  const handler = middleware(options)
  const handlers = Array.isArray(handler) ? handler : [handler]
  handlers.forEach((h) => app.use(h))
}

export const applyHttpMiddlewares = (app: Express, options: HttpMiddlewareOptions = {}): void => {
  const { helmet: helmetOpts = {}, cors: corsOpts = {}, enableCompression = true, enableJson = true } = options

  useIfEnabled(app, helmet, helmetOpts)
  useIfEnabled(app, cors, corsOpts)

  if (enableCompression) app.use(compression())
  if (enableJson) app.use(json())
}
