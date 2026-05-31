import { type TrackPlayRequestHandler } from '#types/trackplay.type'

export const createFaviconMiddleware = (): TrackPlayRequestHandler => {
  const faviconMiddleware: TrackPlayRequestHandler = (req, res, next): void => {
    if (req.originalUrl === '/favicon.ico') {
      res.status(204).end()
      return
    }

    next()
  }

  return faviconMiddleware
}
