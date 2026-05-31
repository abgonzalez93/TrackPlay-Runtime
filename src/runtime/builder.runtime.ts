import { EmptySchema, initBufferLogger } from '@trackplay/core'
import type { BufferLogger, ConfigSchema, Logger, i18n } from '@trackplay/core'
import { createMiddlewareManager, type MiddlewareManager } from './middleware.runtime.ts'
import type { EnvValues, SecretValues } from './prepare.runtime.ts'
import { setupRuntimeConfig, setupI18n, setupDependencies, setupServer } from './setup.runtime.ts'
import type { HexagonalLayers, RuntimeContainer } from './setup.runtime.ts'
import type { MiddlewarePhase, MiddlewareOptions } from '#types/middlewares.type'
import type {
  TrackPlayExpress,
  TrackPlayRequestHandler,
  TrackPlayRouter,
  TrackPlayErrorRequestHandler,
} from '#types/trackplay.type'

interface ServiceRuntime<
  Layers extends HexagonalLayers,
  Env extends Record<string, unknown>,
  Secrets extends Record<string, unknown>,
> {
  app: TrackPlayExpress
  start: () => void
  logger: Logger
  i18n: i18n
  env: Env
  secrets: Secrets
  container: RuntimeContainer<Layers>
  isDevelopment: boolean
}

export interface RuntimeBuilder<
  EnvConfig extends ConfigSchema,
  SecretConfig extends ConfigSchema,
  Infra extends object,
  App extends object,
  Interface extends object,
> {
  withRoutes: (
    routes: (router: TrackPlayRouter, interfaceLayer: Interface) => void,
  ) => RuntimeBuilder<EnvConfig, SecretConfig, Infra, App, Interface>
  addMiddleware: (
    phase: MiddlewarePhase,
    handler: TrackPlayRequestHandler | TrackPlayErrorRequestHandler,
    order?: number,
  ) => RuntimeBuilder<EnvConfig, SecretConfig, Infra, App, Interface>
  withMiddlewareConfig: (options: MiddlewareOptions) => RuntimeBuilder<EnvConfig, SecretConfig, Infra, App, Interface>
  build: () => Promise<
    ServiceRuntime<HexagonalLayers<Infra, App, Interface>, EnvValues<EnvConfig>, SecretValues<SecretConfig>>
  >
}

interface InterfaceBuilder<
  EnvConfig extends ConfigSchema,
  SecretConfig extends ConfigSchema,
  Infra extends object,
  App extends object,
> {
  withInterface: <Interface extends object>(
    factory: (app: App) => Promise<Interface> | Interface,
  ) => RuntimeBuilder<EnvConfig, SecretConfig, Infra, App, Interface>
}

interface ApplicationBuilder<EnvConfig extends ConfigSchema, SecretConfig extends ConfigSchema, Infra extends object> {
  withApplication: <App extends object>(
    factory: (infra: Infra, logger: Logger) => Promise<App> | App,
  ) => InterfaceBuilder<EnvConfig, SecretConfig, Infra, App>
}

interface InfrastructureBuilder<EnvConfig extends ConfigSchema, SecretConfig extends ConfigSchema> {
  withInfrastructure: <Infra extends object>(
    factory: (ctx: {
      env: EnvValues<EnvConfig>
      secrets: SecretValues<SecretConfig>
      logger: Logger
    }) => Promise<Infra> | Infra,
  ) => ApplicationBuilder<EnvConfig, SecretConfig, Infra>
}

interface BuilderContext<
  EnvConfig extends ConfigSchema,
  SecretConfig extends ConfigSchema,
  Infra extends object,
  App extends object,
  Interface extends object,
> {
  serviceName: string
  buffer: BufferLogger
  middlewareManager: MiddlewareManager
  envSchema: EnvConfig
  secretSchema: SecretConfig
  infraFactory: (ctx: {
    env: EnvValues<EnvConfig>
    secrets: SecretValues<SecretConfig>
    logger: Logger
  }) => Promise<Infra> | Infra
  appFactory: (infra: Infra, logger: Logger) => Promise<App> | App
  interfaceFactory: (app: App) => Promise<Interface> | Interface
  routes?: (router: TrackPlayRouter, interfaceLayer: Interface) => void
  middlewareOptions?: MiddlewareOptions
}

const createBuilder = <
  EnvConfig extends ConfigSchema,
  SecretConfig extends ConfigSchema,
  Infra extends object,
  App extends object,
  Interface extends object,
>(
  context: BuilderContext<EnvConfig, SecretConfig, Infra, App, Interface>,
): RuntimeBuilder<EnvConfig, SecretConfig, Infra, App, Interface> => {
  const builder: RuntimeBuilder<EnvConfig, SecretConfig, Infra, App, Interface> = {
    withRoutes: (
      routes: (router: TrackPlayRouter, interfaceLayer: Interface) => void,
    ): RuntimeBuilder<EnvConfig, SecretConfig, Infra, App, Interface> => {
      return createBuilder({ ...context, routes })
    },

    addMiddleware: (
      phase: MiddlewarePhase,
      handler: TrackPlayRequestHandler | TrackPlayErrorRequestHandler,
      order?: number,
    ): RuntimeBuilder<EnvConfig, SecretConfig, Infra, App, Interface> => {
      context.middlewareManager.add(phase, handler, order)
      return builder
    },

    withMiddlewareConfig: (options: MiddlewareOptions): RuntimeBuilder<EnvConfig, SecretConfig, Infra, App, Interface> => {
      return createBuilder({ ...context, middlewareOptions: options })
    },

    build: async (): Promise<
      ServiceRuntime<HexagonalLayers<Infra, App, Interface>, EnvValues<EnvConfig>, SecretValues<SecretConfig>>
    > => {
      const {
        serviceName,
        buffer,
        middlewareManager,
        envSchema,
        secretSchema,
        infraFactory,
        appFactory,
        interfaceFactory,
        routes,
        middlewareOptions,
      } = context

      const { env, secrets, isDevelopment, serverOptions, logger } = setupRuntimeConfig(
        envSchema,
        secretSchema,
        serviceName,
        buffer,
      )

      const i18nInstance = await setupI18n(logger)

      const container = await setupDependencies(logger, { infraFactory, appFactory, interfaceFactory }, { env, secrets })

      const { app, start } = setupServer({
        logger,
        i18n: i18nInstance,
        middlewareManager,
        isDevelopment,
        serverOptions,
        corsOrigins: env.CORS_ORIGINS,
        routes,
        interfaceLayer: container.interface,
        middlewareOptions,
      })

      return {
        app,
        start,
        logger,
        i18n: i18nInstance,
        env,
        secrets,
        container,
        isDevelopment,
      }
    },
  }

  return builder
}

const createInterfaceBuilder = <
  EnvConfig extends ConfigSchema,
  SecretConfig extends ConfigSchema,
  Infra extends object,
  App extends object,
>(
  context: BuilderContext<EnvConfig, SecretConfig, Infra, App, object>,
): InterfaceBuilder<EnvConfig, SecretConfig, Infra, App> => {
  const withInterface = <Interface extends object>(
    factory: (app: App) => Promise<Interface> | Interface,
  ): RuntimeBuilder<EnvConfig, SecretConfig, Infra, App, Interface> => {
    return createBuilder({ ...context, interfaceFactory: factory })
  }

  return { withInterface }
}

const createApplicationBuilder = <EnvConfig extends ConfigSchema, SecretConfig extends ConfigSchema, Infra extends object>(
  context: BuilderContext<EnvConfig, SecretConfig, Infra, object, object>,
): ApplicationBuilder<EnvConfig, SecretConfig, Infra> => {
  const withApplication = <App extends object>(
    factory: (infra: Infra, logger: Logger) => Promise<App> | App,
  ): InterfaceBuilder<EnvConfig, SecretConfig, Infra, App> => {
    return createInterfaceBuilder({ ...context, appFactory: factory })
  }

  return { withApplication }
}

const createInfrastructureBuilder = <EnvConfig extends ConfigSchema, SecretConfig extends ConfigSchema>(
  context: BuilderContext<EnvConfig, SecretConfig, object, object, object>,
): InfrastructureBuilder<EnvConfig, SecretConfig> => {
  const withInfrastructure = <Infra extends object>(
    factory: (ctx: {
      env: EnvValues<EnvConfig>
      secrets: SecretValues<SecretConfig>
      logger: Logger
    }) => Promise<Infra> | Infra,
  ): ApplicationBuilder<EnvConfig, SecretConfig, Infra> => {
    return createApplicationBuilder({ ...context, infraFactory: factory })
  }

  return { withInfrastructure }
}

export interface ServerBuilder {
  withConfig: <NewEnv extends ConfigSchema, NewSecrets extends ConfigSchema>(
    envSchema: NewEnv,
    secretSchema: NewSecrets,
  ) => InfrastructureBuilder<NewEnv, NewSecrets>
}

const createConfigBuilder = (
  context: BuilderContext<ConfigSchema, ConfigSchema, object, object, object>,
): ServerBuilder => {
  const withConfig = <NewEnv extends ConfigSchema, NewSecrets extends ConfigSchema>(
    envSchema: NewEnv,
    secretSchema: NewSecrets,
  ): InfrastructureBuilder<NewEnv, NewSecrets> => {
    return createInfrastructureBuilder({
      ...context,
      envSchema,
      secretSchema,
    })
  }

  return { withConfig }
}

export const createServerBuilder = (serviceName: string): ServerBuilder => {
  const buffer = initBufferLogger({ prefix: `[startup: ${serviceName}]` })
  const middlewareManager = createMiddlewareManager()

  const initialContext: BuilderContext<ConfigSchema, ConfigSchema, object, object, object> = {
    serviceName,
    buffer,
    middlewareManager,
    envSchema: EmptySchema,
    secretSchema: EmptySchema,
    infraFactory: () => ({}),
    appFactory: () => ({}),
    interfaceFactory: () => ({}),
  }

  return createConfigBuilder(initialContext)
}
