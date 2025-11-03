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

export type SchemaOutput<T extends ConfigSchema | undefined> = T extends ConfigSchema
  ? InferConfig<T>
  : Record<string, never>

type EnvValues<T extends ConfigSchema | undefined> = Readonly<InferConfig<typeof BaseServerEnvSchema> & SchemaOutput<T>>

type SecretValues<T extends ConfigSchema | undefined> = Readonly<SchemaOutput<T>>

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

interface HttpServerOptions<Controllers extends object> {
  routes?: (app: Express, controllers: Controllers) => void
  controllers: Controllers
  i18n: i18n
  logger: Logger
  middlewares?: Partial<MiddlewareOptions>
}

interface HttpServerInstance {
  app: Express
  start: (serverOptions: BaseURLOptions) => void
}

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
