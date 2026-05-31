import { type i18n } from '@trackplay/core'
import { handle } from 'i18next-http-middleware'
import { type TrackPlayRequestHandler } from '#types/trackplay.type'

type HandleOptions = Parameters<typeof handle>[1]

export const createI18nMiddleware = (i18n: i18n, options: HandleOptions = {}): TrackPlayRequestHandler => {
  return handle(i18n, {
    ignoreRoutes: ['/health', '/metrics'],
    removeLngFromUrl: false,
    ...options,
  })
}
