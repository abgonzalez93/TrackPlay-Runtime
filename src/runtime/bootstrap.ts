import { TrackPlayError, getSecrets, getServerEnv, BaseServerEnvSchema } from '@trackplay/core'
import { createLogger, createI18n, initI18n } from '@trackplay/core'
import { getBaseUrl, getTranslationPath, translate } from '@trackplay/core'
import type { i18n, Logger, InferConfig, ConfigSchema, BaseURLOptions } from '@trackplay/core'
import express, { type Express } from 'express'
import { applyMiddlewares } from '#middlewares/applyMiddlewares'
import { createErrorHandler } from '#middlewares/createErrorHandler'
import { createNotFoundHandler } from '#middlewares/createNotFoundHandler'
import type { BuildContext } from '#types/container/BuildContext'
import { type DependencyFactories } from '#types/container/DependencyFactories'
import { type DependencyLayers } from '#types/container/DependencyLayers'
import { type MiddlewareOptions } from '#types/middlewares/MiddlewareOptions'

const path = getTranslationPath(import.meta.url)

/**
 * **SchemaOutput**
 *
 * Infers the output type of a configuration schema, or returns an empty object
 * (`Record<string, never>`) when the schema is undefined.
 *
 * @template T - The schema type or `undefined`.
 */
export type SchemaOutput<T extends ConfigSchema | undefined> = T extends ConfigSchema
  ? InferConfig<T>
  : Record<string, never>

/**
 * **EnvValues**
 *
 * Represents the complete environment configuration validated at runtime.
 * Always includes the {@link BaseServerEnvSchema}, optionally extended with
 * a user-provided schema.
 *
 * @template T - Custom environment schema type.
 */
type EnvValues<T extends ConfigSchema | undefined> = Readonly<InferConfig<typeof BaseServerEnvSchema> & SchemaOutput<T>>

/**
 * **SecretValues**
 *
 * Represents the validated runtime secrets configuration, derived only
 * from the user-provided schema (if any).
 *
 * @template T - Custom secrets schema type.
 */
type SecretValues<T extends ConfigSchema | undefined> = Readonly<SchemaOutput<T>>

/**
 * **RuntimeConfig**
 *
 * Represents the complete configuration context produced by {@link prepareRuntime}.
 * It merges validated environment variables, runtime secrets, and computed
 * runtime parameters such as CORS origins and server connection settings.
 *
 * @template EnvValues - Type of the validated environment variables.
 * @template SecretValues - Type of the validated secret variables.
 */
interface RuntimeConfig<
  EnvValues extends Record<string, unknown> = Record<string, never>,
  SecretValues extends Record<string, unknown> = Record<string, never>,
> {
  env: EnvValues
  secrets: SecretValues
  isDevelopment: boolean
  corsOrigins: string[]
  serverOptions: BaseURLOptions
}

/**
 * **prepareRuntime**
 *
 * Initializes the runtime configuration by:
 * - Validating environment variables and secrets.
 * - Merging the base server schema with any custom schemas.
 * - Deriving runtime options such as protocol, host, port, and CORS origins.
 *
 * @template EnvConfig - Optional Zod schema defining environment variables.
 * @template SecretConfig - Optional Zod schema defining runtime secrets.
 * @param envSchema - Custom Zod schema for environment variables.
 * @param secretSchema - Custom Zod schema for runtime secrets.
 * @returns A promise resolving to the fully prepared {@link RuntimeConfig}.
 */
const prepareRuntime = async <EnvConfig extends ConfigSchema | undefined, SecretConfig extends ConfigSchema | undefined>(
  envSchema?: EnvConfig,
  secretSchema?: SecretConfig,
): Promise<RuntimeConfig<EnvValues<EnvConfig>, SecretValues<SecretConfig>>> => {
  const mixedEnvSchema = envSchema ? BaseServerEnvSchema.extend(envSchema.shape) : BaseServerEnvSchema
  const env = getServerEnv(mixedEnvSchema) as EnvValues<EnvConfig>
  const secrets = (secretSchema ? getSecrets(secretSchema) : {}) as SecretValues<SecretConfig>

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
 * **buildDependencies**
 *
 * Constructs the dependency graph following the canonical layer order:
 * `Adapters → Services → UseCases → Controllers`.
 *
 * Each layer is initialized using the output of the previous one, ensuring
 * a strict unidirectional dependency flow.
 *
 * @template Layers - Structure of the dependency layers.
 * @template EnvValues - Type of the validated environment configuration.
 * @template SecretValues - Type of the validated secrets configuration.
 * @param factories - Factory functions responsible for constructing each layer.
 * @param ctx - Context object containing validated env and secrets.
 * @returns The fully constructed dependency graph.
 */
const buildDependencies = <
  Layers extends DependencyLayers,
  EnvValues extends Record<string, unknown> = Record<string, never>,
  SecretValues extends Record<string, unknown> = Record<string, never>,
>(
  factories: DependencyFactories<Layers, EnvValues, SecretValues>,
  ctx: BuildContext<EnvValues, SecretValues>,
): Layers => {
  const adapters = factories.adapters(ctx)
  const services = factories.services({ adapters })
  const useCases = factories.useCases({ services })
  const controllers = factories.controllers({ useCases })
  return { adapters, services, useCases, controllers } as Layers
}

/**
 * **HttpServerOptions**
 *
 * Configuration options for creating and initializing the HTTP server.
 *
 * @template Controllers - Type of the controller layer.
 */
interface HttpServerOptions<Controllers extends object> {
  routes?: (app: Express, controllers: Controllers) => void
  controllers: Controllers
  i18n: i18n
  logger: Logger
  middlewares?: Partial<MiddlewareOptions>
}

/**
 * **HttpServerInstance**
 *
 * Represents a configured Express HTTP server.
 */
interface HttpServerInstance {
  app: Express
  start: (serverOptions: BaseURLOptions) => void
}

/**
 * **createHttpServer**
 *
 * Creates and configures an Express server instance preloaded with:
 * - Application-level middlewares.
 * - Optional route registration.
 * - Standardized 404 and error handling.
 *
 * @template Controllers - Type of the controller layer.
 * @param options - Configuration options for the HTTP server.
 * @returns The configured HTTP server ready to start.
 */
const createHttpServer = <Controllers extends object>(options: HttpServerOptions<Controllers>): HttpServerInstance => {
  const { routes, controllers, i18n, logger, middlewares = {} } = options
  const app = express()

  applyMiddlewares(app, middlewares)
  if (routes) routes(app, controllers)

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
 * **BootstrapConfig**
 *
 * Defines the configuration required by the {@link bootstrap} function.
 * Specifies how the service environment, container, and routes are initialized.
 *
 * @template Layers - Dependency layer structure.
 * @template EnvConfig - Optional environment schema.
 * @template SecretConfig - Optional secrets schema.
 */
export interface BootstrapConfig<
  Layers extends DependencyLayers,
  EnvConfig extends ConfigSchema | undefined = undefined,
  SecretConfig extends ConfigSchema | undefined = undefined,
> {
  serviceName: string
  container: DependencyFactories<Layers, EnvValues<EnvConfig>, SecretValues<SecretConfig>>
  routes: (app: Express, controllers: Layers['controllers']) => void
  envSchema?: EnvConfig
  secretSchema?: SecretConfig
  middlewareOptions?: MiddlewareOptions
}

/**
 * **ServiceRuntime**
 *
 * Represents the final runtime state of a fully bootstrapped TrackPlay service.
 * Includes the Express instance, logger, i18n system, dependency container,
 * and validated configuration.
 *
 * @template Layers - Dependency layer structure.
 * @template EnvValues - Type of validated environment configuration.
 * @template SecretValues - Type of validated secrets configuration.
 */
export interface ServiceRuntime<
  Layers extends DependencyLayers,
  EnvValues extends Record<string, unknown> = Record<string, never>,
  SecretValues extends Record<string, unknown> = Record<string, never>,
> {
  app: Express
  start: () => void
  logger: Logger
  i18n: i18n
  env: EnvValues
  secrets: SecretValues
  container: Layers
  isDevelopment: boolean
}

/**
 * **bootstrap**
 *
 * Entry point to initialize and start a TrackPlay service.
 *
 * Performs the following lifecycle steps:
 * 1. Validates environment variables and secrets.
 * 2. Initializes the logger and i18n subsystems.
 * 3. Builds the dependency container (Adapters → Services → UseCases → Controllers).
 * 4. Configures Express with routes and middleware.
 * 5. Returns a fully initialized runtime object ready to start.
 *
 * @template Layers - Dependency layer structure.
 * @template EnvConfig - Optional environment schema.
 * @template SecretConfig - Optional secrets schema.
 * @param options - Configuration for bootstrapping the service.
 * @returns A promise resolving to the complete {@link ServiceRuntime}.
 */
export const bootstrap = async <
  Layers extends DependencyLayers,
  EnvConfig extends ConfigSchema | undefined = undefined,
  SecretConfig extends ConfigSchema | undefined = undefined,
>(
  options: BootstrapConfig<Layers, EnvConfig, SecretConfig>,
): Promise<ServiceRuntime<Layers, EnvValues<EnvConfig>, SecretValues<SecretConfig>>> => {
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
