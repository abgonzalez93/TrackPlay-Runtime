import { type DependencyLayers } from './DependencyLayers.ts'
import { type EnvSecretsBundle } from './EnvSecretsBundle.ts'

/**
 * **DependencyFactories**
 *
 * Declares the factory signatures responsible for constructing
 * each dependency layer of the application.
 *
 * Each factory receives the context of the previous layer,
 * enforcing explicit dependency flow between them.
 *
 * @template TEnvSchema - The validated environment schema type.
 * @template TLayers - The shape of all dependency layers.
 *
 */
export interface DependencyFactories<
  TLayers extends DependencyLayers,
  TEnvSchema extends Record<string, unknown>,
  TSecretSchema extends Record<string, unknown>,
> {
  adapters: (ctx: EnvSecretsBundle<TEnvSchema, TSecretSchema>) => TLayers['adapters']
  services: (ctx: { adapters: TLayers['adapters'] }) => TLayers['services']
  useCases: (ctx: { services: TLayers['services'] }) => TLayers['useCases']
  controllers: (ctx: { useCases: TLayers['useCases'] }) => TLayers['controllers']
}
