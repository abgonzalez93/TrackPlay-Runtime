import { initWinston, createI18next, initI18next } from '@trackplay/core'
import type { ConfigSchema, Logger, i18n, BaseURLOptions, BufferLogger } from '@trackplay/core'
import { LanguageDetector } from 'i18next-http-middleware'
import { type MiddlewareManager } from './middleware.runtime.ts'
import { prepareRuntime, type EnvValues, type SecretValues } from './prepare.runtime.ts'
import { createHttpServer, type HttpServerInstance } from './server.runtime.ts'
import { type MiddlewareOptions } from '#types/middlewares.type'
import { type TrackPlayRouter } from '#types/trackplay.type'

export interface RuntimeConfig<Env extends Record<string, unknown>, Secrets extends Record<string, unknown>> {
  env: Env
  secrets: Secrets
  isDevelopment: boolean
  serverOptions: BaseURLOptions
  logger: Logger
}

export const setupRuntimeConfig = <EnvConfig extends ConfigSchema, SecretConfig extends ConfigSchema>(
  envSchema: EnvConfig,
  secretSchema: SecretConfig,
  serviceName: string,
  buffer: BufferLogger,
): RuntimeConfig<EnvValues<EnvConfig>, SecretValues<SecretConfig>> => {
  buffer.info('⌛ Preparing runtime...')
  const runtime = prepareRuntime(envSchema, secretSchema, serviceName)
  const { isDevelopment } = runtime

  const serverOptions: BaseURLOptions = {
    protocol: isDevelopment ? 'http' : 'https',
    host: runtime.env.HOST,
    port: runtime.env.PORT,
  }

  buffer.info('✅ Runtime config loaded', {
    environment: runtime.env.ENVIRONMENT,
    logLevel: isDevelopment ? 'debug' : runtime.env.LOG_LEVEL,
    host: runtime.env.HOST,
    port: runtime.env.PORT,
    protocol: serverOptions.protocol,
  })

  buffer.info('⌛ Initializing logger...')
  const logger = initWinston({ label: serviceName, env: runtime.env })
  buffer.flushToLogger(logger)
  logger.info('✅ Logger initialized')

  return {
    env: runtime.env,
    secrets: runtime.secrets,
    isDevelopment,
    serverOptions,
    logger,
  }
}

export const setupI18n = async (logger: Logger): Promise<i18n> => {
  logger.info('⌛ Initializing i18n...')
  const i18nInstance = createI18next()
  i18nInstance.use(LanguageDetector)
  await initI18next(i18nInstance, undefined, {
    detection: {
      order: ['querystring', 'header'],
      lookupQuerystring: 'lng',
      lookupHeader: 'accept-language',
      caches: false,
    },
  })

  logger.info('✅ i18n initialized')
  return i18nInstance
}

interface DependencyFactories<
  EnvConfig extends ConfigSchema,
  SecretConfig extends ConfigSchema,
  Infra extends object,
  App extends object,
  Interface extends object,
> {
  infraFactory: (ctx: {
    env: EnvValues<EnvConfig>
    secrets: SecretValues<SecretConfig>
    logger: Logger
  }) => Promise<Infra> | Infra
  appFactory: (infra: Infra, logger: Logger) => Promise<App> | App
  interfaceFactory: (app: App) => Promise<Interface> | Interface
}

export interface HexagonalLayers<
  Infra extends object = object,
  App extends object = object,
  Interface extends object = object,
> {
  infrastructure: Infra
  application: App
  interface: Interface
}

export type RuntimeContainer<Layers extends HexagonalLayers> = Pick<Layers, keyof HexagonalLayers>

export const setupDependencies = async <
  EnvConfig extends ConfigSchema,
  SecretConfig extends ConfigSchema,
  Infra extends object,
  App extends object,
  Interface extends object,
>(
  logger: Logger,
  factories: DependencyFactories<EnvConfig, SecretConfig, Infra, App, Interface>,
  config: { env: EnvValues<EnvConfig>; secrets: SecretValues<SecretConfig> },
): Promise<RuntimeContainer<HexagonalLayers<Infra, App, Interface>>> => {
  logger.info('⌛ Building dependencies...')

  const infrastructure = await factories.infraFactory({ ...config, logger })
  const application = await factories.appFactory(infrastructure, logger)
  const interfaceLayer = await factories.interfaceFactory(application)

  logger.info('✅ Dependencies built')

  return {
    infrastructure,
    application,
    interface: interfaceLayer,
  }
}

interface ServerSetupOptions<Interface extends object> {
  logger: Logger
  i18n: i18n
  middlewareManager: MiddlewareManager
  isDevelopment: boolean
  serverOptions: BaseURLOptions
  corsOrigins: string[]
  routes?: (router: TrackPlayRouter, interfaceLayer: Interface) => void
  interfaceLayer: Interface
  middlewareOptions?: MiddlewareOptions
}

export const setupServer = <Interface extends object>(options: ServerSetupOptions<Interface>): HttpServerInstance => {
  options.logger.info('⌛ Starting HTTP server...')

  const server = createHttpServer({
    logger: options.logger,
    i18n: options.i18n,
    middlewareManager: options.middlewareManager,
    corsOrigins: options.corsOrigins,
    isDevelopment: options.isDevelopment,
    serverOptions: options.serverOptions,
    routes: options.routes,
    interfaceLayer: options.interfaceLayer,
    middlewares: options.middlewareOptions,
  })

  return server
}
