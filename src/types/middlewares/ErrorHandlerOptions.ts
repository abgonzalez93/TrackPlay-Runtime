/**
 * **ErrorHandlerOptions**
 *
 * Configuration parameters for the global **error-handling middleware**.
 *
 * Controls verbosity, formatting, and diagnostic output of error responses
 * depending on the current runtime environment.
 *
 * ### Responsibilities
 * - Enable detailed stack traces and verbose logs in development.
 * - Restrict sensitive error details in production for security.
 * - Provide flexibility for integrating external telemetry (e.g., Sentry, Datadog).
 *
 * ### Notes
 * - Passed into {@link createErrorHandler} during middleware initialization.
 * - The `isDevelopment` flag should typically derive from `NODE_ENV === "development"`.
 * - When `true`, stack traces are logged and optionally included in API responses.
 *
 */
export interface ErrorHandlerOptions {
  /**
   * Enables verbose logging and inclusion of stack traces in error responses.
   *
   * @default false
   * @recommended Set to `true` only in development environments.
   */
  isDevelopment?: boolean
}
