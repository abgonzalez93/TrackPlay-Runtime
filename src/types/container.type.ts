import { type Logger } from '@trackplay/core'

export interface BaseInfrastructureLayer<
  Adapters extends object = object,
  Services extends object = object,
  Repositories extends object = object,
> {
  adapters: Adapters
  services: Services
  repositories: Repositories
}

export interface ContainerFactory<
  Env extends object,
  Secrets extends object,
  Infra extends object,
  App extends object,
  Interface extends object,
> {
  infrastructure: (ctx: { env: Env; secrets: Secrets; logger: Logger }) => Promise<Infra> | Infra
  application: (infra: Infra, logger: Logger) => Promise<App> | App
  interface: (app: App) => Promise<Interface> | Interface
}
