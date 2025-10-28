import { TrackPlayError, getSecrets, getServerEnv, BaseServerEnvSchema } from '@trackplay/core'
import { createLogger, createI18n, initI18n } from '@trackplay/core'
import { getBaseUrl, getTranslationPath, translate } from '@trackplay/core'
import type { i18n, Logger, InferConfig, ConfigSchema, BaseURLOptions } from '@trackplay/core'
import express, { type Express } from 'express'
import { applyMiddlewares } from '#middlewares/applyMiddlewares'
import { createErrorHandler } from '#middlewares/createErrorHandler'
import { createNotFoundHandler } from '#middlewares/createNotFoundHandler'
import { type DependencyFactories } from '#types/container/DependencyFactories'
import { type DependencyLayers } from '#types/container/DependencyLayers'
import { type EnvSecretsBundle } from '#types/container/EnvSecretsBundle'
import { type MiddlewareOptions } from '#types/middlewares/MiddlewareOptions'

const path = getTranslationPath(import.meta.url)

/**
 * Describes the full runtime configuration object returned by {@link prepareRuntime}.
 * Includes environment variables, Docker secrets, and computed runtime options.
 *
 * @template EnvRawValue - The validated environment schema output.
 * @template SecretRawValue - The validated secret schema output.
 */
interface RuntimeConfig<EnvRawValue extends Record<string, unknown>, SecretRawValue extends Record<string, unknown>>
  extends EnvSecretsBundle<EnvRawValue, SecretRawValue> {
  /** Whether the current runtime is in development mode. */
  isDevelopment: boolean
  /** List of allowed CORS origins, parsed from the env variable. */
  corsOrigins: string[]
  /** Core server connection settings (protocol, host, port). */
  serverOptions: BaseURLOptions
}

type BaseServerEnv = InferConfig<typeof BaseServerEnvSchema>
type EnvSchema<T extends ConfigSchema | undefined> = Readonly<BaseServerEnv & SchemaOutput<T>>
export type SchemaOutput<T> = T extends ConfigSchema ? InferConfig<T> : Record<string, never>
type SecretSchema<T extends ConfigSchema | undefined> = Readonly<SchemaOutput<T>>

/**
 * Prepares the runtime environment by validating env variables and secrets,
 * merging the base server schema with custom schemas, and deriving
 * server-related options such as protocol, CORS, and host details.
 *
 * @template E - Optional Zod schema for environment variables.
 * @template S - Optional Zod schema for secrets.
 * @param {E} [envSchema] - Custom Zod schema for environment variables.
 * @param {S} [secretSchema] - Custom Zod schema for secrets.
 * @returns {Promise<RuntimeConfig<EnvSchema<E>, SecretSchema<S>>>}
 * The fully prepared runtime configuration.
 */
const prepareRuntime = async <E extends ConfigSchema | undefined, S extends ConfigSchema | undefined>(
  envSchema?: E,
  secretSchema?: S,
): Promise<RuntimeConfig<EnvSchema<E>, SecretSchema<S>>> => {
  const mixedEnvSchema = envSchema ? BaseServerEnvSchema.extend(envSchema.shape) : BaseServerEnvSchema
  const env = getServerEnv(mixedEnvSchema) as EnvSchema<E>
  const secrets = (secretSchema ? getSecrets(secretSchema) : {}) as SecretSchema<S>

  const isDevelopment = env.NODE_ENV === 'development'

  const serverOptions: BaseURLOptions = {
    protocol: isDevelopment ? 'http' : 'https',
    host: env.HOST,
    port: env.PORT,
  }

  const corsOrigins = env.CORS_ORIGINS.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)

  return { env, secrets, isDevelopment, corsOrigins, serverOptions }
}

/**
 * Builds the dependency graph defined by the service container.
 * The build order is deterministic: Adapters → Services → UseCases → Controllers.
 *
 * @template L - Dependency layer type definition.
 * @template E - Environment schema type.
 * @template S - Secret schema type.
 * @param {DependencyFactories<L, E, S>} factories - Factory functions for each layer.
 * @param {EnvSecretsBundle<E, S>} ctx - Context containing environment and secret data.
 * @returns {L} Fully constructed dependency graph.
 */
const buildDependencies = <
  L extends DependencyLayers,
  E extends Record<string, unknown>,
  S extends Record<string, unknown>,
>(
  factories: DependencyFactories<L, E, S>,
  ctx: EnvSecretsBundle<E, S>,
): L => {
  const adapters = factories.adapters(ctx)
  const services = factories.services({ adapters })
  const useCases = factories.useCases({ services })
  const controllers = factories.controllers({ useCases })
  return { adapters, services, useCases, controllers } as L
}

/**
 * Options for configuring the Express HTTP server.
 *
 * @template Controllers - Type of controller layer.
 */
interface HttpServerOptions<Controllers> {
  /** Optional route registration function. */
  routes?: (app: Express, deps: { controllers: Controllers }) => void
  /** The controller instances to inject into the routes. */
  controllers: Controllers
  /** Initialized i18n instance. */
  i18n: i18n
  /** Application logger. */
  logger: Logger
  /** Optional middleware configuration. */
  middlewares?: Partial<MiddlewareOptions>
}

/**
 * Represents a running HTTP server instance.
 */
interface HttpServerInstance {
  /** Express application instance. */
  app: Express
  /** Starts the server with the given options. */
  start: (serverOptions: BaseURLOptions) => void
}

/**
 * Creates and configures an Express HTTP server with predefined
 * middleware, error handling, and route registration.
 *
 * @template Controllers - Type of controller layer.
 * @param {HttpServerOptions<Controllers>} options - HTTP server setup options.
 * @returns {HttpServerInstance} Configured HTTP server.
 */
const createHttpServer = <Controllers extends Record<string, unknown>>(
  options: HttpServerOptions<Controllers>,
): HttpServerInstance => {
  const { routes, controllers, i18n, logger, middlewares = {} } = options
  const app = express()

  applyMiddlewares(app, middlewares)
  if (routes) routes(app, { controllers })

  app.use(createNotFoundHandler())
  app.use(createErrorHandler(i18n, logger, middlewares.errorHandler))

  const start = (serverOptions: BaseURLOptions): void => {
    app.listen(serverOptions.port, serverOptions.host, () =>
      logger.info(`✅ Server running at ${getBaseUrl(serverOptions)}`),
    )
  }

  return { app, start }
}

/**
 * Configuration options for {@link bootstrap}.
 *
 * @template L - Dependency layers type.
 * @template E - Environment schema type.
 * @template S - Secret schema type.
 */
export interface BootstrapConfig<
  L extends DependencyLayers,
  E extends ConfigSchema | undefined = undefined,
  S extends ConfigSchema | undefined = undefined,
> {
  /** Name of the service, used in logging and diagnostics. */
  serviceName: string
  /** Optional Zod schema for environment variables. */
  envSchema?: E
  /** Optional Zod schema for Docker secrets. */
  secretSchema?: S
  /** Dependency container factory definitions. */
  container: DependencyFactories<L, EnvSchema<E>, SecretSchema<S>>
  /** Route registration function. */
  routes: (app: Express, container: { controllers: L['controllers'] }) => void
  /** Global middleware configuration. */
  middlewareOptions?: MiddlewareOptions
}

/**
 * Represents a fully bootstrapped TrackPlay service runtime.
 *
 * @template L - Dependency layer type definition.
 * @template E - Environment schema type.
 * @template S - Secret schema type.
 */
export interface ServiceRuntime<
  L extends DependencyLayers,
  E extends Record<string, unknown> = Record<string, unknown>,
  S extends Record<string, unknown> = Record<string, unknown>,
> extends EnvSecretsBundle<E, S> {
  /** Express application instance. */
  app: Express
  /** Starts the service. */
  start: () => void
  /** Logger instance. */
  logger: Logger
  /** i18n instance. */
  i18n: i18n
  /** Dependency container. */
  container: L
  /** Whether the runtime is in development mode. */
  isDevelopment: boolean
}

/**
 * Initializes and starts a TrackPlay service.
 *
 * Performs the following:
 * 1. Validates environment variables and secrets.
 * 2. Initializes i18n and logger.
 * 3. Builds the dependency container.
 * 4. Configures Express with routes and middleware.
 * 5. Returns a fully initialized runtime ready to start.
 *
 * @template L - Dependency layer type definition.
 * @template E - Optional environment schema type.
 * @template S - Optional secret schema type.
 * @param {BootstrapConfig<L, E, S>} options - Bootstrap configuration.
 * @returns {Promise<ServiceRuntime<L, EnvSchema<E>, SecretSchema<S>>>}
 * The fully bootstrapped service runtime.
 */
export const bootstrap = async <
  L extends DependencyLayers,
  E extends ConfigSchema | undefined = undefined,
  S extends ConfigSchema | undefined = undefined,
>(
  options: BootstrapConfig<L, E, S>,
): Promise<ServiceRuntime<L, EnvSchema<E>, SecretSchema<S>>> => {
  const { serviceName, envSchema, secretSchema, container, routes, middlewareOptions } = options

  const logger = createLogger({ label: serviceName })
  const i18n = createI18n()
  await initI18n(i18n)

  try {
    const runtime = await prepareRuntime(envSchema, secretSchema)

    const builtContainer = buildDependencies(container, {
      env: runtime.env,
      secrets: runtime.secrets,
    })

    const { app, start } = createHttpServer({
      routes,
      controllers: builtContainer.controllers,
      i18n,
      logger,
      middlewares: {
        cors: { origin: runtime.corsOrigins, credentials: true },
        errorHandler: { isDevelopment: runtime.isDevelopment },
        ...middlewareOptions,
      },
    })

    return {
      app,
      start: () => start(runtime.serverOptions),
      logger,
      i18n,
      env: runtime.env,
      secrets: runtime.secrets,
      container: builtContainer,
      isDevelopment: runtime.isDevelopment,
    }
  } catch (error: unknown) {
    const messageKey = error instanceof TrackPlayError ? (error.i18n ?? error.message) : `${path}.bootstrap_failed`
    const message = translate(i18n, logger, messageKey)
    logger.error(`💥 [${serviceName}] ${message}`, { error })
    process.exit(1)
  }
}
