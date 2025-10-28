/**
 * **DependencyLayers**
 *
 * Defines the canonical structure of architectural layers
 * in the TrackPlay dependency graph.
 *
 * Each layer builds upon the previous one following the
 * Hexagonal Architecture principle:
 * `adapters → services → useCases → controllers`
 */
export interface DependencyLayers {
  adapters: Record<string, unknown>
  services: Record<string, unknown>
  useCases: Record<string, unknown>
  controllers: Record<string, unknown>
}
