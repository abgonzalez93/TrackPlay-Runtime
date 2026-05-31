import { randomUUID } from 'crypto'
import { type TrackPlayRequestHandler } from '#types/trackplay.type'

const HEADER_NAME = 'x-request-id'

export const createRequestIdMiddleware = (): TrackPlayRequestHandler => {
  const requestIdMiddleware: TrackPlayRequestHandler = (req, res, next): void => {
    const requestId = req.header(HEADER_NAME)?.trim() || randomUUID()

    req.id = requestId
    res.locals.requestId = requestId
    res.setHeader(HEADER_NAME, requestId)

    next()
  }

  return requestIdMiddleware
}
