import { NextFunction, Request, RequestHandler, Response } from 'express'
export const wrapAsync =
  <P>(func: RequestHandler<P>) =>
  async (req: Request<P>, res: Response, next: NextFunction) => {
    try {
      await func(req, res, next)
    } catch (error) {
      next(error)
    }
  }
