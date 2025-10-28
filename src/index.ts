import { registerRoute } from '#routes/registerRoute'
import { bootstrap } from '#runtime/bootstrap'

/**
 * The executable runtime layer of the **TrackPlay** framework.
 *
 * Provides the minimal runtime API surface for initializing the application,
 * bootstrapping dependency containers, and registering routes in a
 * hexagonal and modular architecture.
 *
 * Serves as the primary entry point for building and running services
 * using the TrackPlay ecosystem.
 *
 * @module trackplay
 */
export const trackplay = Object.freeze({
  // --- Runtime ---
  bootstrap,

  // --- Routes ---
  registerRoute,
})

export default trackplay

// --- External Types ---
export type { Request, Response, Express } from 'express'

// --- Routes ---
export { registerRoute } from '#routes/registerRoute'

// --- Runtime ---
export { bootstrap } from '#runtime/bootstrap'

// --- Types ---
export { type DependencyFactories } from '#types/container/DependencyFactories'
export { type DependencyLayers } from '#types/container/DependencyLayers'
export { type EnvSecretsBundle } from '#types/container/EnvSecretsBundle'
export { type ErrorHandlerOptions } from '#types/middlewares/ErrorHandlerOptions'
export { type MiddlewareOptions } from '#types/middlewares/MiddlewareOptions'
