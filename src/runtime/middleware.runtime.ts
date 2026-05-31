import { MIDDLEWARE_PHASES } from '#constants/phases.constant'
import { type MiddlewarePhase } from '#types/middlewares.type'
import type { TrackPlayRequestHandler, TrackPlayErrorRequestHandler } from '#types/trackplay.type'

type MiddlewareEntry = {
  handler: TrackPlayRequestHandler | TrackPlayErrorRequestHandler
  phase: MiddlewarePhase
  order: number
}

export interface MiddlewareManager {
  add: (
    phase: MiddlewarePhase,
    handler: TrackPlayRequestHandler | TrackPlayErrorRequestHandler,
    order?: number,
  ) => MiddlewareManager
  getSortedMiddlewares: () => MiddlewareEntry[]
}

const PHASE_ORDER: MiddlewarePhase[] = [
  MIDDLEWARE_PHASES.INIT,
  MIDDLEWARE_PHASES.SECURITY,
  MIDDLEWARE_PHASES.OBSERVABILITY,
  MIDDLEWARE_PHASES.PARSING,
  MIDDLEWARE_PHASES.ROUTING,
  MIDDLEWARE_PHASES.ERROR,
]

export const createMiddlewareManager = (): MiddlewareManager => {
  const middlewares: MiddlewareEntry[] = []

  const manager: MiddlewareManager = {
    add: (
      phase: MiddlewarePhase,
      handler: TrackPlayRequestHandler | TrackPlayErrorRequestHandler,
      order: number = 0,
    ): MiddlewareManager => {
      middlewares.push({ phase, handler, order })
      return manager
    },

    getSortedMiddlewares: (): MiddlewareEntry[] => {
      return [...middlewares].sort((a, b) => {
        const phaseIndexA = PHASE_ORDER.indexOf(a.phase)
        const phaseIndexB = PHASE_ORDER.indexOf(b.phase)

        if (phaseIndexA !== phaseIndexB) {
          return phaseIndexA - phaseIndexB
        }

        return a.order - b.order
      })
    },
  }

  return manager
}
