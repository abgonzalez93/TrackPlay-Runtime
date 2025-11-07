import { type i18n } from '@trackplay/core'
import { type RequestHandler } from 'express'
import { handle } from 'i18next-http-middleware'

export const createI18nMiddleware = (i18n: i18n): RequestHandler => {
  return handle(i18n, {
    ignoreRoutes: [],
    removeLngFromUrl: false,
  })
}
