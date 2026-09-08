import express, {
  ErrorRequestHandler,
  NextFunction,
  Request,
  Response,
} from "express";
import createError from "http-errors";
import onHeaders from "on-headers";
import useragent from "express-useragent";
import { logger } from "./logs/log";
import { allowedMethods } from "./middleware/allowed-methods";

// Routes
import { router as baseRouter } from "./routes/base";
import { router as userActionsRouter } from "./routes/user-actions";
import { router as notesRouter } from "./routes/notes";

// Initialize app
export const app = express();

// Keep the responses to what this api actually sends: no framework advertising
// header, no etag, and json is never pretty-printed no matter the environment.
app.disable("x-powered-by");
app.set("etag", false);
app.set("json spaces", 0);
app.set("query parser", "simple");

// Let's log each successful interaction. We'll also log each error - but not here,
// that's be done in the json error-handling middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  res.on("finish", () => {
    logger.info(`${req.method} ${req.originalUrl} RESPONSE: ${res.statusCode}`);
  });
  next();
});

// return response time in X-Response-Time header. The header is written as the
// response headers are flushed, and it is skipped whenever the json error
// handler below is the one rendering the response.
app.use(function responseTime(req: Request, res: Response, next: NextFunction) {
  const t1 = Date.now();
  onHeaders(res, function setResponseTime() {
    if (res.locals.suppressResponseTime) return;
    const t2 = Date.now();
    res.setHeader("X-Response-Time", `${Math.ceil(t2 - t1)}ms`);
  });
  next();
});

// For cors with options
app.use(function cors(req: Request, res: Response, next: NextFunction) {
  res.vary("Origin");

  const requestOrigin = req.get("Origin");
  if (!requestOrigin) {
    next();
    return;
  }

  if (req.method !== "OPTIONS") {
    res.set("Access-Control-Allow-Origin", "*");
    next();
    return;
  }

  // Preflight
  if (!req.get("Access-Control-Request-Method")) {
    next();
    return;
  }

  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET,HEAD,PUT,POST,DELETE,PATCH");

  const allowHeaders = req.get("Access-Control-Request-Headers");
  if (allowHeaders) res.set("Access-Control-Allow-Headers", allowHeaders);

  res.status(204).end();
});

// For useragent detection
app.use(useragent.express());

// For managing body. We're only allowing json.
const jsonBodyParser = express.json({
  limit: "1mb",
  type: [
    "application/json",
    "application/json-patch+json",
    "application/vnd.api+json",
    "application/csp-report",
  ],
});
app.use((req: Request, res: Response, next: NextFunction) => {
  jsonBodyParser(req, res, (error: any) => {
    if (error && error.type === "entity.parse.failed") {
      // Re-raise the parse failure carrying only the properties this api has
      // always reported for it.
      next(
        Object.assign(new SyntaxError(error.message), {
          status: 400,
          body: error.body,
        }),
      );
      return;
    }
    next(error);
  });
});

// Report the methods a known path accepts before the routers get their turn, so
// that a bare OPTIONS is answered here rather than by the router's own OPTIONS
// responder, and a wrong method never reaches a handler.
app.use(allowedMethods([baseRouter, userActionsRouter, notesRouter]));

// For router
app.use(baseRouter);
app.use(userActionsRouter);
app.use(notesRouter);

// Nothing answered, so this is a not found. It is raised here, downstream of the
// response time middleware, because that header is reported for it.
app.use((req: Request, res: Response, next: NextFunction) => {
  res.locals.late404 = true;
  next(createError(404));
});

// Apply error json handling
const errorOptions = {
  postFormat: (e: any, obj: { stack: any; name: any; }) => {
    // Here's where we'll stick our error logger.
    logger.info(obj);
    if (process.env.NODE_ENV !== "production") {
      return obj;
    }
    delete obj.stack;
    delete obj.name;
    return obj;
  },
};

const formatError = (error: any): { [key: string]: any; stack: any; name: any } => {
  const obj: { [key: string]: any; stack: any; name: any } = Object.assign({}, error);
  ["name", "message", "stack", "type"].forEach((key) => {
    if (error[key]) obj[key] = error[key];
  });
  obj.status = error.status || error.statusCode || 500;
  return obj;
};

const jsonError: ErrorRequestHandler = (error, req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }

  const status = error.status || error.statusCode || 500;

  // A not found is reported with the response time header, every other error
  // without it.
  if (!res.locals.late404) res.locals.suppressResponseTime = true;

  res.status(status).json(errorOptions.postFormat(error, formatError(error)));
};
app.use(jsonError);
