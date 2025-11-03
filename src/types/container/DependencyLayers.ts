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
