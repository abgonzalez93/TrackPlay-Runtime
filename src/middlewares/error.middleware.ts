import { HTTP_STATUS, TrackPlayError, translateErrorMessage } from '@trackplay/core'
import type { i18n, TFunction } from '@trackplay/core'
import { CONTEXT_KEYS } from '#constants/keys.constant'
import type { ErrorBody, ErrorHandlerOptions } from '#types/middlewares.type'
import { type TrackPlayErrorRequestHandler } from '#types/trackplay.type'

interface ErrorMetadata {
  status: number
  title: string
  code: string
}

const resolveErrorMetadata = (error: unknown): ErrorMetadata => {
  if (error instanceof TrackPlayError) return { status: error.status, title: error.title, code: error.code }
  return {
    status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
    title: 'Internal Server Error',
    code: 'INTERNAL_SERVER_ERROR',
  }
}

interface ErrorContext {
  i18n: i18n
  isDevelopment: boolean
}

interface ErrorResponse {
  status: number
  body: ErrorBody
}

const buildErrorResponse = (ctx: ErrorContext, t: TFunction, error: unknown, path: string): ErrorResponse => {
  const { status, title, code } = resolveErrorMetadata(error)
  const message = translateErrorMessage(t, error)
  const errorSlug = code.toLowerCase()

  const body: ErrorBody = {
    type: `https://docs.trackplay.com/errors/${errorSlug}`,
    title,
    status,
    message,
    instance: path,
    code,
  }

  if (error instanceof TrackPlayError) {
    const exposeClientContext = ctx.isDevelopment || error.status < 500
    if (exposeClientContext && error.errors) body.errors = error.errors
  }

  if (ctx.isDevelopment) {
    if (error instanceof Error && error.stack) {
      body.stack = error.stack.split('\n').map((line) => line.trim())
    }
  }

  return { status, body }
}

export const createErrorMiddleware = (i18n: i18n, options: ErrorHandlerOptions = {}): TrackPlayErrorRequestHandler => {
  const isDevelopment = options.isDevelopment ?? false
  const context: ErrorContext = { i18n, isDevelopment }

  const errorMiddleware: TrackPlayErrorRequestHandler = (error, req, res, next): void => {
    if (res.headersSent) return next(error)

    const t = req.t ?? context.i18n.t.bind(context.i18n)
    const { status, body } = buildErrorResponse(context, t, error, req.originalUrl)

    res.locals[CONTEXT_KEYS.ERROR] = {
      status,
      body,
      error,
      isDevelopment,
    }

    res.header('Content-Type', 'application/problem+json')
    res.status(status).json(body)
  }

  return errorMiddleware
}
