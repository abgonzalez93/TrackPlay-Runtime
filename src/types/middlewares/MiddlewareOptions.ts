import { type CorsOptions } from 'cors'
import { type HelmetOptions } from 'helmet'
import { type ErrorHandlerOptions } from './ErrorHandlerOptions.js'

export interface MiddlewareOptions {
  helmet?: HelmetOptions | false
  cors?: CorsOptions | false
  enableCompression?: boolean
  enableJson?: boolean
  errorHandler?: ErrorHandlerOptions
}
