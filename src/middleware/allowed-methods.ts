import { NextFunction, Request, Response, Router } from "express";

// The methods a router is able to answer at all. Anything else is Not Implemented.
const implemented = ["HEAD", "OPTIONS", "GET", "PUT", "PATCH", "POST", "DELETE"];

type RouteEntry = {
  regexp: RegExp;
  methods: string[];
};

const collect = (stack: any[], routes: RouteEntry[]) => {
  stack.forEach((layer) => {
    if (layer.route) {
      const methods: string[] = [];
      Object.keys(layer.route.methods).forEach((method) => {
        const name = method.toUpperCase();
        // A route that answers GET answers HEAD as well, and it is reported first.
        if (name === "GET") methods.push("HEAD");
        methods.push(name);
      });
      routes.push({ regexp: layer.regexp, methods });
      return;
    }
    if (layer.handle && layer.handle.stack) {
      collect(layer.handle.stack, routes);
    }
  });
};

// Reports the methods registered for a path that no handler answered, the way
// a router-level allowedMethods() step does: 405 for a known path reached with
// the wrong method, 501 for a method the router cannot implement, an Allow
// header for a bare OPTIONS, and a pass-through when the path is unknown so the
// not-found handler downstream gets its turn.
export const allowedMethods = (routers: Router[]) => {
  let routes: RouteEntry[] | undefined;

  return (req: Request, res: Response, next: NextFunction) => {
    if (routes === undefined) {
      const collected: RouteEntry[] = [];
      routers.forEach((router) => collect(router.stack, collected));
      routes = collected;
    }

    const allowed: string[] = [];
    routes.forEach((route) => {
      if (!route.regexp.test(req.path)) return;
      route.methods.forEach((method) => {
        if (allowed.indexOf(method) === -1) allowed.push(method);
      });
    });

    if (!allowed.length) {
      next();
      return;
    }

    const allow = allowed.join(", ");

    if (implemented.indexOf(req.method) === -1) {
      res.status(501).set("Allow", allow).type("text/plain").send("Not Implemented");
      return;
    }

    if (req.method === "OPTIONS") {
      res.status(200).set("Allow", allow).type("text/plain").send("");
      return;
    }

    if (allowed.indexOf(req.method) === -1) {
      res.status(405).set("Allow", allow).type("text/plain").send("Method Not Allowed");
      return;
    }

    next();
  };
};
