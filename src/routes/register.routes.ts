import { Router, type Express } from 'express'

export interface RouteRegistration {
  prefix: string
  setup: (router: Router) => void
}

export const registerRoute = (app: Express, { prefix, setup }: RouteRegistration): void => {
  const router = Router()
  setup(router)
  app.use(prefix, router)
}
