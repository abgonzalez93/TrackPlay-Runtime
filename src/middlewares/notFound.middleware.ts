import { NotFoundError } from '@trackplay/core'
import { type TrackPlayRequestHandler } from '#types/trackplay.type'

export const createNotFoundMiddleware = (): TrackPlayRequestHandler => {
  const notFoundMiddleware: TrackPlayRequestHandler = (req, _res, next): void => {
    const safeUrl = encodeURI(req.originalUrl)

    next(
      new NotFoundError({
        i18nKey: 'core.errors.route_not_found',
        i18nArgs: { url: safeUrl },
      }),
    )
  }

  return notFoundMiddleware
}
