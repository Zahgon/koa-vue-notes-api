import { NextFunction, Request, Response } from "express"
import createError from "http-errors";
import jsonwebtoken from "jsonwebtoken";

export const jwt = (opts: {secret?: any} = {}) => {
  const { secret } = opts;

  function getJwtToken(req: Request) {
    if (!req.headers || !req.headers.authorization) {
      return;
    }

    const parts = req.headers.authorization.split(" ");

    if (parts.length === 2) {
      const scheme = parts[0];
      const credentials = parts[1];

      if (/^Bearer$/i.test(scheme)) {
        return credentials;
      }
    }
    throw createError(401, {
      error: { code: 401, message: "AUTHENTICATION_ERROR" },
    });
  }

  return (req: Request, res: Response, next: NextFunction) => {
    // If there's no secret set, toss it out right away
    if (!secret) throw createError(401, "INVALID_SECRET");

    // Grab the token
    const token = getJwtToken(req);

    try {
      type decodedWithUser = {
        data?: any
      }

      // Try and decode the token asynchronously
      // This is dirty now that it's converted to TypeScript
      const decoded: decodedWithUser = jsonwebtoken.verify(token || "", process.env.JWT_SECRET!) as object;

      // If it worked set the res.locals.user parameter to the decoded token.
      res.locals.user = decoded.data;
    } catch (error) {
      // If it's an expiration error, let's report that specifically.
      if (error.name === "TokenExpiredError") {
        throw createError(401, { error: { code: 401, message: "TOKEN_EXPIRED" } });
      } else {
        throw createError(401, {
          error: { code: 401, message: "AUTHENTICATION_ERROR" },
        });
      }
    }

    return next();
  };
};
