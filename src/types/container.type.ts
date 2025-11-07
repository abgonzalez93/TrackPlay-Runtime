export type BuildContext<EnvValues, SecretValues> = {
  env: EnvValues
  secrets: SecretValues
}

export interface DependencyLayers<
  Adapters extends object = object,
  Services extends object = object,
  UseCases extends object = object,
  Controllers extends object = object,
> {
  adapters: Adapters
  services: Services
  useCases: UseCases
  controllers: Controllers
}

export interface DependencyFactories<
  Layers extends DependencyLayers,
  EnvValues extends Record<string, unknown> = Record<string, never>,
  SecretValues extends Record<string, unknown> = Record<string, never>,
> {
  adapters: (ctx: BuildContext<EnvValues, SecretValues>) => Layers['adapters']
  services: (ctx: { adapters: Layers['adapters'] }) => Layers['services']
  useCases: (ctx: { services: Layers['services'] }) => Layers['useCases']
  controllers: (ctx: { useCases: Layers['useCases'] }) => Layers['controllers']
}
