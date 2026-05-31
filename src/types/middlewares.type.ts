import { type LogLevel } from '@trackplay/core'
import { type CompressionOptions } from 'compression'
import { type CorsOptions } from 'cors'
import { type Options as RateLimitOptions } from 'express-rate-limit'
import { type HelmetOptions } from 'helmet'
import { MIDDLEWARE_PHASES } from '#constants/phases.constant'

export interface ErrorBody {
  type: string
  title: string
  status: number
  message: string
  instance: string
  code: string
  errors?: unknown
  stack?: string[]
}

interface JsonOptions {
  limit?: string | number
  strict?: boolean
  type?: string | string[]
}

interface UrlEncodedOptions {
  extended?: boolean
  limit?: string | number
  parameterLimit?: number
  type?: string | string[]
}

export interface HttpMiddlewareOptions {
  helmet?: HelmetOptions | false
  cors?: CorsOptions | false
  compression?: CompressionOptions | false
  json?: JsonOptions | false
  urlencoded?: UrlEncodedOptions | false
  queryParser?: 'extended' | 'simple' | false
  rateLimit?: Partial<RateLimitOptions> | false
}

export interface RequestLoggerOptions {
  logSuccessfulResponses?: boolean
  logRedirects?: boolean
  level2xx?: LogLevel
  level3xx?: LogLevel
  level4xx?: LogLevel
  level5xx?: LogLevel
  skipIfErrorAlreadyLogged?: boolean
}

export interface ErrorHandlerOptions {
  isDevelopment?: boolean
}

export interface MiddlewareOptions extends HttpMiddlewareOptions {
  requestLogger?: RequestLoggerOptions
  errorHandler?: ErrorHandlerOptions
}

export type MiddlewarePhase = (typeof MIDDLEWARE_PHASES)[keyof typeof MIDDLEWARE_PHASES]
