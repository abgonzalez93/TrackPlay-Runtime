import type { TFunction, i18n } from '@trackplay/core'
import type { Request, Response, NextFunction, Express, Router, RouterOptions } from 'express'
import type { ParamsDictionary, Query, RequestHandlerParams } from 'express-serve-static-core'

export interface TrackPlayRequest<
  P = ParamsDictionary,
  ResBody = unknown,
  ReqBody = unknown,
  ReqQuery = Query,
  Locals extends Record<string, unknown> = Record<string, unknown>,
> extends Request<P, ResBody, ReqBody, ReqQuery, Locals> {
  id?: string
  t: TFunction
  i18n: i18n
  language: string
  languages: string[]
}

export type TrackPlayResponse<
  ResBody = unknown,
  Locals extends Record<string, unknown> = Record<string, unknown>,
> = Response<ResBody, Locals>

export type TrackPlayNextFunction = NextFunction

export interface TrackPlayRequestHandler<
  P = ParamsDictionary,
  ResBody = unknown,
  ReqBody = unknown,
  ReqQuery = Query,
  Locals extends Record<string, unknown> = Record<string, unknown>,
> {
  (
    req: TrackPlayRequest<P, ResBody, ReqBody, ReqQuery, Locals>,
    res: TrackPlayResponse<ResBody, Locals>,
    next: TrackPlayNextFunction,
  ): unknown
}

export interface TrackPlayErrorRequestHandler<
  P = ParamsDictionary,
  ResBody = unknown,
  ReqBody = unknown,
  ReqQuery = Query,
  Locals extends Record<string, unknown> = Record<string, unknown>,
> {
  (
    err: unknown,
    req: TrackPlayRequest<P, ResBody, ReqBody, ReqQuery, Locals>,
    res: TrackPlayResponse<ResBody, Locals>,
    next: TrackPlayNextFunction,
  ): unknown
}

export type TrackPlayExpress = Express
export type TrackPlayRouter = Router
export type TrackPlayRouterOptions = RouterOptions
export type TrackPlayRequestHandlerParams = RequestHandlerParams
