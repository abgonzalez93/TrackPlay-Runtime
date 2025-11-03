import { type BuildContext } from './BuildContext.ts'
import { type DependencyLayers } from './DependencyLayers.ts'

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
