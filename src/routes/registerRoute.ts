import { Router, type Express } from 'express'

/**
 * **RouteRegistration**
 *
 * Defines the structure required to register a modular route group
 * within an Express application.
 *
 * ### Responsibilities
 * - Provide a **URL prefix** for all routes within the module.
 * - Expose a `setup` callback to define endpoints on an isolated router.
 *
 */
export interface RouteRegistration {
  /**
   * URL prefix under which all registered routes will be mounted.
   * Example: `"/users"` → routes become `/users/:id`, `/users/list`, etc.
   */
  prefix: string

  /**
   * Function responsible for defining the module’s routes.
   * Receives an isolated {@link Router} instance.
   *
   * @param router - Express router used to attach endpoints.
   */
  setup: (router: Router) => void
}

/**
 * **registerRoute**
 *
 * Registers a namespaced router within the main Express application.
 *
 * ### Responsibilities
 * - Create an isolated Express router.
 * - Apply all endpoints through the provided `setup` function.
 * - Mount the router under the given `prefix`.
 *
 * @param app - The root Express application.
 * @param registration - Configuration object containing the `prefix` and `setup` callback.
 *
 */
export const registerRoute = (app: Express, { prefix, setup }: RouteRegistration): void => {
  const router = Router()
  setup(router)
  app.use(prefix, router)
}
