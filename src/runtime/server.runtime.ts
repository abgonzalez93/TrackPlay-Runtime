import { getBaseUrl } from '@trackplay/core'
import type { BaseURLOptions, Logger, i18n } from '@trackplay/core'
import compression from 'compression'
import cors from 'cors'
import express, { json, urlencoded } from 'express'
import { rateLimit } from 'express-rate-limit'
import helmet from 'helmet'
import { type MiddlewareManager } from './middleware.runtime.ts'
import { MIDDLEWARE_PHASES } from '#constants/phases.constant'
import { createErrorMiddleware } from '#middlewares/error.middleware'
import { createFaviconMiddleware } from '#middlewares/favicon.middleware'
import { createI18nMiddleware } from '#middlewares/i18n.middleware'
import { createNotFoundMiddleware } from '#middlewares/notFound.middleware'
import { createRequestIdMiddleware } from '#middlewares/requestId.middleware'
import { createRequestLoggerMiddleware } from '#middlewares/requestLogger.middleware'
import { type MiddlewareOptions } from '#types/middlewares.type'
import type { TrackPlayExpress, TrackPlayRouter } from '#types/trackplay.type'

const DEFAULT_OPTIONS = {
  compression: { threshold: 1024 },
  json: { limit: '1mb', strict: true },
  urlencoded: { extended: true, limit: '1mb' },
  queryParser: 'extended',
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    limit: 100,
    standardHeaders: true,
    legacyHeaders: false,
  },
} as const

interface HttpServerOptions<InterfaceLayer extends object> {
  logger: Logger
  i18n: i18n
  middlewareManager: MiddlewareManager
  corsOrigins: string[]
  isDevelopment: boolean
  serverOptions: BaseURLOptions
  routes?: (router: TrackPlayRouter, interfaceLayer: InterfaceLayer) => void
  interfaceLayer?: InterfaceLayer
  middlewares?: MiddlewareOptions
}

export interface HttpServerInstance {
  app: TrackPlayExpress
  start: () => void
}

export const createHttpServer = <InterfaceLayer extends object>(
  options: HttpServerOptions<InterfaceLayer>,
): HttpServerInstance => {
  const app = express()

  const {
    corsOrigins,
    isDevelopment,
    middlewares: middlewareOverrides,
    i18n,
    logger,
    middlewareManager,
    routes,
    interfaceLayer,
  } = options

  const config: MiddlewareOptions = {
    ...DEFAULT_OPTIONS,
    ...middlewareOverrides,
    cors: {
      origin: corsOrigins,
      credentials: true,
      ...middlewareOverrides?.cors,
    },
    errorHandler: {
      isDevelopment,
      ...middlewareOverrides?.errorHandler,
    },
    requestLogger: {
      logSuccessfulResponses: isDevelopment,
      ...middlewareOverrides?.requestLogger,
    },
  }

  // 0. CONFIG Phase
  if (config.queryParser !== false) app.set('query parser', config.queryParser)

  // 1. INIT Phase
  middlewareManager.add(MIDDLEWARE_PHASES.INIT, createFaviconMiddleware())
  middlewareManager.add(MIDDLEWARE_PHASES.INIT, createRequestIdMiddleware())
  middlewareManager.add(MIDDLEWARE_PHASES.INIT, createI18nMiddleware(i18n))

  // 2. SECURITY Phase
  if (config.helmet !== false) middlewareManager.add(MIDDLEWARE_PHASES.SECURITY, helmet(config.helmet))
  if (config.cors !== false) middlewareManager.add(MIDDLEWARE_PHASES.SECURITY, cors(config.cors))
  if (config.rateLimit !== false) middlewareManager.add(MIDDLEWARE_PHASES.SECURITY, rateLimit(config.rateLimit))

  // 3. OBSERVABILITY Phase
  middlewareManager.add(MIDDLEWARE_PHASES.OBSERVABILITY, createRequestLoggerMiddleware(logger, config.requestLogger))

  // 4. PARSING Phase
  if (config.compression !== false) middlewareManager.add(MIDDLEWARE_PHASES.PARSING, compression(config.compression))
  if (config.json !== false) middlewareManager.add(MIDDLEWARE_PHASES.PARSING, json(config.json))
  if (config.urlencoded !== false) middlewareManager.add(MIDDLEWARE_PHASES.PARSING, urlencoded(config.urlencoded))

  // 5. ROUTING Phase
  if (routes && interfaceLayer) {
    const router = express.Router()
    routes(router, interfaceLayer)
    middlewareManager.add(MIDDLEWARE_PHASES.ROUTING, router)
  }

  // 6. ERROR Phase
  middlewareManager.add(MIDDLEWARE_PHASES.ERROR, createNotFoundMiddleware())
  middlewareManager.add(MIDDLEWARE_PHASES.ERROR, createErrorMiddleware(i18n, config.errorHandler))

  // Apply all middlewares
  const sorted = middlewareManager.getSortedMiddlewares()
  sorted.forEach(({ handler }) => {
    app.use(handler)
  })

  const start = (): void => {
    const { serverOptions } = options

    app.listen(serverOptions.port, serverOptions.host, () =>
      logger.info(`✅ Server running at ${getBaseUrl(serverOptions)}`),
    )
  }

  return { app, start }
}
