import { registerRoute } from '#routes/registerRoute'
import { bootstrap } from '#runtime/bootstrap'

export const trackplay = Object.freeze({
  bootstrap,
  registerRoute,
})

export default trackplay

export type { Request, Response, Express } from 'express'

export { registerRoute } from '#routes/registerRoute'
export { bootstrap } from '#runtime/bootstrap'

export { type BuildContext } from '#types/container/BuildContext'
export { type DependencyFactories } from '#types/container/DependencyFactories'
export { type DependencyLayers } from '#types/container/DependencyLayers'
export { type ErrorHandlerOptions } from '#types/middlewares/ErrorHandlerOptions'
export { type MiddlewareOptions } from '#types/middlewares/MiddlewareOptions'
