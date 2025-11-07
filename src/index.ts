import { registerRoute } from '#routes/register.routes'
import { bootstrap } from '#runtime/bootstrap.runtime'

export const trackplay = Object.freeze({
  bootstrap,
  registerRoute,
})

export default trackplay

export type { Request, Response, Express } from 'express'

export { registerRoute } from '#routes/register.routes'
export { bootstrap } from '#runtime/bootstrap.runtime'

export type { BuildContext, DependencyFactories, DependencyLayers } from '#types/container.type'
export type { ErrorHandlerOptions, MiddlewareOptions } from '#types/middlewares.type'
