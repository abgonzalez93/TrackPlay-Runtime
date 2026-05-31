import type { Logger } from '@trackplay/core'
import { isRecord, type LogLevel } from '@trackplay/core'
import { CONTEXT_KEYS } from '#constants/keys.constant'
import type { ErrorBody, RequestLoggerOptions } from '#types/middlewares.type'
import type { TrackPlayRequestHandler, TrackPlayResponse } from '#types/trackplay.type'

interface LoggedErrorContext {
  status: number
  body: ErrorBody
  error: unknown
  isDevelopment: boolean
}

const isLoggedErrorContext = (value: unknown): value is LoggedErrorContext => {
  if (!isRecord(value)) return false
  return (
    'status' in value && typeof value.status === 'number' && 'body' in value && 'error' in value && 'isDevelopment' in value
  )
}

const resolveErrorContext = (res: TrackPlayResponse): LoggedErrorContext | null => {
  const value = res.locals[CONTEXT_KEYS.ERROR]
  if (!isLoggedErrorContext(value)) return null
  return value
}

const shouldSkipBecauseErrorWasLogged = (res: TrackPlayResponse, options: RequestLoggerOptions): boolean => {
  const value = res.locals[CONTEXT_KEYS.ERROR_LOGGED]
  if (options.skipIfErrorAlreadyLogged === false) return false
  return isLoggedErrorContext(value)
}

const parseContentLength = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : undefined
  }

  return undefined
}

const resolveLevel = (statusCode: number, options: RequestLoggerOptions): LogLevel | null => {
  if (statusCode >= 500) return options.level5xx ?? 'error'
  if (statusCode >= 400) return options.level4xx ?? 'warn'
  if (statusCode >= 300) return options.logRedirects ? (options.level3xx ?? 'info') : null
  return options.logSuccessfulResponses ? (options.level2xx ?? 'info') : null
}

export const createRequestLoggerMiddleware = (
  logger: Logger,
  options: RequestLoggerOptions = {},
): TrackPlayRequestHandler => {
  const requestLoggerMiddleware: TrackPlayRequestHandler = (req, res, next): void => {
    const start = process.hrtime.bigint()

    res.on('finish', () => {
      if (shouldSkipBecauseErrorWasLogged(res, options)) return

      const errorContext = resolveErrorContext(res)

      const status = errorContext?.status ?? res.statusCode
      const level = resolveLevel(status, options)
      if (!level) return

      const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000
      const durationMsRounded = Math.round(durationMs)

      const requestId = req.id
      const method = req.method
      const path = req.originalUrl ?? req.url

      const contentLength = parseContentLength(res.getHeader('content-length'))

      const errorSuffix = errorContext?.body?.code ? ` [${errorContext.body.code}]` : ''

      const logPayload: Record<string, unknown> = {
        context: {
          method,
          path,
          status,
          durationMs: durationMsRounded,
          ...(requestId && { requestId }),
          ...(contentLength !== undefined && { contentLength }),
        },
      }

      if (errorContext?.body) {
        logPayload.error = {
          code: errorContext.body.code,
          title: errorContext.body.title,
          message: errorContext.body.message,
          ...(errorContext.body.errors ? { errors: errorContext.body.errors } : undefined),
          ...(errorContext.body.stack ? { stack: errorContext.body.stack } : undefined),
        }
      }

      logger[level](`HTTP Request${errorSuffix}`, logPayload)
    })

    next()
  }

  return requestLoggerMiddleware
}
