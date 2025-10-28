import compression from 'compression'
import cors from 'cors'
import { type Express, json, type RequestHandler } from 'express'
import helmet from 'helmet'
import { type MiddlewareOptions } from '#types/middlewares/MiddlewareOptions'

/**
 * **useIfEnabled**
 *
 * Conditionally registers a middleware factory when its configuration
 * is not explicitly set to `false`.
 *
 * This prevents unnecessary registration of disabled features,
 * while keeping the flexibility to pass custom configuration objects.
 *
 * @template TOptions - Type of the middleware configuration.
 * @param app - Express application instance.
 * @param factory - Middleware factory (e.g., `helmet`, `cors`).
 * @param options - Configuration options or `false` to disable.
 *
 */
const useIfEnabled = <Options>(
  app: Express,
  middleware: (options?: Options) => RequestHandler | RequestHandler[],
  options?: Options | false,
): void => {
  if (options === false) return

  const handler = middleware(options)
  const handlers = Array.isArray(handler) ? handler : [handler]
  handlers.forEach((h) => app.use(h))
}

/**
 * **applyMiddlewares**
 *
 * Registers the global middleware stack for the Express application.
 *
 * ### Responsibilities
 * - Secure HTTP headers using {@link helmet}.
 * - Enable CORS for cross-origin requests using {@link cors}.
 * - Compress responses with {@link compression}.
 * - Parse JSON bodies automatically using Express’s built-in middleware.
 *
 * ### Notes
 * - Middleware can be selectively disabled by passing `false`
 *   in the corresponding option (e.g. `helmet: false`).
 * - Error handling middleware should be applied **after**
 *   route registration, not here.
 *
 * @param app - Express application instance.
 * @param options - Middleware configuration options.
 */
export const applyMiddlewares = (app: Express, options: MiddlewareOptions = {}): void => {
  const { helmet: helmetOpts = {}, cors: corsOpts = {}, enableCompression = true, enableJson = true } = options

  useIfEnabled(app, helmet, helmetOpts)
  useIfEnabled(app, cors, corsOpts)

  if (enableCompression) app.use(compression())
  if (enableJson) app.use(json())
}
