/**
 * **DependencyLayers**
 *
 * Defines the canonical structure of the application's dependency graph
 * according to the **Hexagonal Architecture** (Ports and Adapters) pattern.
 *
 * Each layer builds upon the previous one in a strict topological order:
 *
 * `Adapters → Services → UseCases → Controllers`
 *
 * - **Adapters:** Provide the interface between the application and external systems
 *   (e.g., databases, APIs, message queues).
 * - **Services:** Contain reusable domain logic that depends on adapters.
 * - **UseCases:** Implement specific business workflows or application actions using services.
 * - **Controllers:** Handle external I/O (HTTP, CLI, etc.) and delegate to use cases.
 *
 * This contract ensures a clean, explicit dependency direction, preventing cyclic imports
 * and maintaining testability and scalability within the runtime container.
 *
 * @template Adapters - Type map for the adapter layer.
 * @template Services - Type map for the service layer.
 * @template UseCases - Type map for the use case layer.
 * @template Controllers - Type map for the controller layer.
 */
export interface DependencyLayers<
  Adapters extends object = object,
  Services extends object = object,
  UseCases extends object = object,
  Controllers extends object = object,
> {
  /** Adapters layer — external system connectors (DBs, APIs, etc.). */
  adapters: Adapters
  /** Services layer — domain logic building upon adapters. */
  services: Services
  /** Use cases layer — business workflows built on services. */
  useCases: UseCases
  /** Controllers layer — I/O handlers exposing application endpoints. */
  controllers: Controllers
}
