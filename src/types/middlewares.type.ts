import { type CorsOptions } from 'cors'
import { type HelmetOptions } from 'helmet'

export interface HttpMiddlewareOptions {
  helmet?: HelmetOptions | false
  cors?: CorsOptions | false
  enableCompression?: boolean
  enableJson?: boolean
}

export interface MiddlewareOptions extends HttpMiddlewareOptions {
  errorHandler?: ErrorHandlerOptions
}

export interface ErrorHandlerOptions {
  isDevelopment?: boolean
}
