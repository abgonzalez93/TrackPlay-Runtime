import { type BuildContext } from './BuildContext.ts'
import { type DependencyLayers } from './DependencyLayers.ts'

/**
 * **DependencyFactories**
 *
 * Defines the factory function signatures responsible for constructing
 * each architectural dependency layer within the application.
 *
 * Each factory function is invoked in a deterministic build order that enforces
 * a unidirectional dependency flow between layers:
 *
 * `Adapters → Services → UseCases → Controllers`
 *
 * - **adapters:** Built first; interact directly with external systems (e.g. databases, APIs).
 * - **services:** Contain domain logic and depend on adapters.
 * - **useCases:** Encapsulate business workflows and depend on services.
 * - **controllers:** Expose application endpoints and depend on use cases.
 *
 * @template Layers - Defines the full dependency layer structure.
 * @template EnvValues - Type of the validated environment configuration.
 * @template SecretValues - Type of the validated Docker secrets configuration.
 */
export interface DependencyFactories<
  Layers extends DependencyLayers,
  EnvValues extends Record<string, unknown> = Record<string, never>,
  SecretValues extends Record<string, unknown> = Record<string, never>,
> {
  /**
   * Constructs the **adapters** layer.
   *
   * @param {BuildContext<EnvValues, SecretValues>} ctx - Combined environment and secrets context.
   * @returns {Layers['adapters']} The initialized adapter instances.
   */
  adapters: (ctx: BuildContext<EnvValues, SecretValues>) => Layers['adapters']

  /**
   * Constructs the **services** layer.
   *
   * @param {{ adapters: Layers['adapters'] }} ctx - Context containing initialized adapters.
   * @returns {Layers['services']} The initialized service instances.
   */
  services: (ctx: { adapters: Layers['adapters'] }) => Layers['services']

  /**
   * Constructs the **useCases** layer.
   *
   * @param {{ services: Layers['services'] }} ctx - Context containing initialized services.
   * @returns {Layers['useCases']} The initialized use case instances.
   */
  useCases: (ctx: { services: Layers['services'] }) => Layers['useCases']

  /**
   * Constructs the **controllers** layer.
   *
   * @param {{ useCases: Layers['useCases'] }} ctx - Context containing initialized use cases.
   * @returns {Layers['controllers']} The initialized controller instances.
   */
  controllers: (ctx: { useCases: Layers['useCases'] }) => Layers['controllers']
}
