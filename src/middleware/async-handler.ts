import { NextFunction, Request, RequestHandler, Response } from "express";

type AsyncRequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
) => unknown;

// Express does not forward a rejected promise to the error-handling middleware
// on its own, so every async handler gets wrapped in this.
export const asyncHandler = (handler: AsyncRequestHandler): RequestHandler => (
  req,
  res,
  next,
) => {
  Promise.resolve(handler(req, res, next)).catch(next);
};
