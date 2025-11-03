import { t, getTranslationPath, NotFoundError } from '@trackplay/core'
import type { Request, Response, NextFunction } from 'express'

const path = getTranslationPath(import.meta.url)

export const createNotFoundHandler =
  () =>
  (req: Request, _res: Response, next: NextFunction): void => {
    next(new NotFoundError(t(`${path}.route_not_found`, { url: req.originalUrl })))
  }
