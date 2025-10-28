import { type CorsOptions } from 'cors'
import { type HelmetOptions } from 'helmet'
import { type ErrorHandlerOptions } from './ErrorHandlerOptions.js'

/**
 * **MiddlewareOptions**
 *
 * Configuration parameters for the **global middleware stack** applied to
 * every TrackPlay service during application initialization.
 *
 * ### Responsibilities
 * - Control which core middlewares are globally enabled or disabled.
 * - Provide custom configuration for security (`helmet`), CORS, and error handling.
 * - Allow fine-grained control of Express behavior (e.g., JSON parsing, compression).
 *
 * ### Notes
 * - Intended for use inside the `createApp` or `bootstrap` pipeline.
 * - If any property is explicitly set to `false`, the corresponding middleware is **disabled**.
 * - Defaults are optimized for **production security** and **API performance**.
 *
 * ### Default Behavior
 * | Option               | Default | Description                                |
 * |----------------------|----------|--------------------------------------------|
 * | `helmet`             | `{}`     | Enables HTTP security headers              |
 * | `cors`               | `{}`     | Enables Cross-Origin Resource Sharing      |
 * | `enableCompression`  | `true`   | Enables gzip/deflate response compression  |
 * | `enableJson`         | `true`   | Enables JSON body parsing                  |
 * | `errorHandler`       | `{}`     | Enables structured global error handling   |
 *
 * @see {@link ErrorHandlerOptions}
 */
export interface MiddlewareOptions {
  /**
   * Configuration for **Helmet**, which sets secure HTTP headers.
   * Set to `false` to disable this middleware.
   *
   * @default {}
   */
  helmet?: HelmetOptions | false

  /**
   * Configuration for **Cross-Origin Resource Sharing (CORS)**.
   * Set to `false` to disable CORS entirely.
   *
   * @default {}
   */
  cors?: CorsOptions | false

  /**
   * Enables response compression (gzip/deflate).
   * Recommended for production to improve network efficiency.
   *
   * @default true
   */
  enableCompression?: boolean

  /**
   * Enables automatic JSON body parsing via `express.json()`.
   * Should typically remain enabled for API services.
   *
   * @default true
   */
  enableJson?: boolean

  /**
   * Configuration for the **global error-handling middleware**.
   * Allows environment-specific customization of error verbosity and formatting.
   *
   * @see {@link ErrorHandlerOptions}
   * @default {}
   */
  errorHandler?: ErrorHandlerOptions
}
