import { t, getTranslationPath, NotFoundError } from '@trackplay/core'
import type { Request, Response, NextFunction } from 'express'

const path = getTranslationPath(import.meta.url)

/**
 * **createNotFoundHandler**
 *
 * Factory function that creates an Express middleware for handling
 * **unmatched routes (404 Not Found)**.
 *
 * ### Responsibilities
 * - Capture all requests that do not match any defined route.
 * - Forward a localized {@link NotFoundError} to the global error handler.
 * - Preserve the original URL in the error context for debugging.
 *
 * ### Notes
 * - This middleware should be registered **after all route definitions**,
 *   but **before** the global error handler.
 * - The message key (`core.middlewares.createNotFoundHandler.route_not_found`)
 *   allows translation into multiple languages using the app’s i18n setup.
 *
 * @returns An Express middleware that forwards a {@link NotFoundError}
 *          to the centralized error handler.
 */
export const createNotFoundHandler =
  () =>
  (req: Request, _res: Response, next: NextFunction): void => {
    next(new NotFoundError(t(`${path}.route_not_found`, { url: req.originalUrl })))
  }
