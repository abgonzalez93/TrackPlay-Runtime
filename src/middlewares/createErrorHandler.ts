import { HTTP_STATUS, LOGGER, TrackPlayError, getTranslationPath, translate } from '@trackplay/core'
import type { i18n, Logger, LogLevel } from '@trackplay/core'
import type { Request, Response } from 'express'
import { type ErrorHandlerOptions } from '#types/middlewares/ErrorHandlerOptions'

const path = getTranslationPath(import.meta.url)

/**
 * Internal metadata extracted from an error instance.
 */
interface ErrorMetadata {
  statusCode: number
  name: string
  isTrackPlayError: boolean
}

/**
 * Derives metadata such as status code and name from an error instance.
 */
const resolveErrorMetadata = (error: unknown): ErrorMetadata => {
  if (error instanceof TrackPlayError) return { statusCode: error.statusCode, name: error.name, isTrackPlayError: true }
  return {
    statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
    name: 'Error',
    isTrackPlayError: false,
  }
}

/**
 * Resolves a translatable or fallback error message.
 */
const resolveErrorMessage = (i18n: i18n, logger: Logger, error: unknown): string => {
  const fallbackKey = `${path}.unexpected_error`
  if (error instanceof TrackPlayError) return translate(i18n, logger, error.i18n ?? error.message, fallbackKey)
  return translate(i18n, logger, fallbackKey)
}

/**
 * JSON structure returned as error body.
 */
interface ErrorBody {
  error: string
  message: string
  stack?: string
  details?: unknown
}

/**
 * Builds a structured and translated error body.
 */
const buildErrorBody = (i18n: i18n, logger: Logger, error: unknown, isDevelopment: boolean, name: string): ErrorBody => {
  const message = resolveErrorMessage(i18n, logger, error)
  const body: ErrorBody = { error: name, message }

  if (isDevelopment) {
    if (error instanceof Error && error.stack) body.stack = error.stack.replace(/\s+/g, ' ')
    if (error instanceof TrackPlayError && error.details) body.details = error.details
  }

  return body
}

/**
 * Shape of the final error response.
 */
interface ErrorResponse {
  statusCode: number
  response: ErrorBody
}

/**
 * Constructs the HTTP response body and status code from the error.
 */
const buildErrorResponse = (i18n: i18n, logger: Logger, error: unknown, isDevelopment: boolean): ErrorResponse => {
  const { statusCode, name } = resolveErrorMetadata(error)
  const response = buildErrorBody(i18n, logger, error, isDevelopment, name)
  return { statusCode, response }
}

/**
 * Structured logging options for HTTP errors.
 */
interface LogHttpErrorOptions extends Pick<ErrorResponse, 'statusCode' | 'response'> {
  error?: unknown
  isDevelopment?: boolean
}

/**
 * Logs HTTP errors using appropriate severity levels.
 *
 * ### Logic
 * - **5xx** → `error` (critical server errors)
 * - **401–403** → `warn` (auth or permission issues)
 * - **400 / 404** → `info` in development only
 */
const logHttpError = (
  logger: Logger,
  { statusCode, response, error, isDevelopment = false }: LogHttpErrorOptions,
): void => {
  let level: LogLevel | null = null

  if (statusCode >= HTTP_STATUS.INTERNAL_SERVER_ERROR) {
    level = 'error'
  } else if (statusCode >= HTTP_STATUS.BAD_REQUEST) {
    switch (statusCode) {
      case HTTP_STATUS.UNAUTHORIZED:
      case HTTP_STATUS.FORBIDDEN:
        level = 'warn'
        break
      case HTTP_STATUS.BAD_REQUEST:
      case HTTP_STATUS.NOT_FOUND:
      default:
        level = isDevelopment ? 'info' : null
        break
    }
  }

  if (!level) return

  logger[level](`${LOGGER.EMOJIS[level]} [${response.error}] ${response.message}`, {
    statusCode,
    ...(level === 'error' ? { error } : undefined),
  })
}

/**
 * **createErrorHandler**
 *
 * Factory for a centralized Express error-handling middleware.
 *
 * ### Responsibilities
 * - Catch and normalize thrown errors during the request lifecycle.
 * - Translate messages via {@link i18n}.
 * - Hide internal stack traces in production for safety.
 * - Log structured error data via Winston.
 *
 * ### Behavior
 * - Handles {@link TrackPlayError} instances gracefully with localized messages.
 * - Falls back to a generic 500 error for unexpected exceptions.
 *
 * @param i18n - Initialized i18n instance for translations.
 * @param logger - Winston logger for structured logging.
 * @param options - Optional configuration (e.g., `isDevelopment`).
 * @returns Express error-handling middleware function.
 */
export const createErrorHandler =
  (i18n: i18n, logger: Logger, options: ErrorHandlerOptions = {}) =>
  (error: unknown, _req: Request, res: Response): void => {
    if (res.headersSent) return

    const { isDevelopment = false } = options
    const { statusCode, response } = buildErrorResponse(i18n, logger, error, isDevelopment)

    logHttpError(logger, { statusCode, response, error, isDevelopment })

    res.status(statusCode).json(response)
  }
