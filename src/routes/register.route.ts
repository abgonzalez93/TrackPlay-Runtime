import { Router } from 'express'
import type { TrackPlayRouter, TrackPlayRouterOptions } from '#types/trackplay.type'

interface RouteRegistration {
  prefix: string
  routerOptions?: TrackPlayRouterOptions
  setup: (router: TrackPlayRouter) => void
}

export const registerRoute = (router: TrackPlayRouter, { prefix, setup, routerOptions }: RouteRegistration): void => {
  const route = Router({ mergeParams: true, ...routerOptions })
  const normalizedPrefix = prefix.startsWith('/') ? prefix : `/${prefix}`

  setup(route)
  router.use(normalizedPrefix, route)
}
