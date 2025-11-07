import 'express'
import type { i18n, TFunction } from 'i18next'

declare global {
  namespace Express {
    interface Request {
      i18n: i18n
      t: TFunction
      language: string
      languages: string[]
      resolvedLanguage: string
    }
  }
}
