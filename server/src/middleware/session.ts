import session, { MemoryStore } from "express-session";
import { config, env } from "../config";

let ProdMemoryStore;
if (env.NODE_ENV === "production") {
  ProdMemoryStore = require("memorystore")(session);
}

export const STORE =
  env.NODE_ENV === "production"
    ? new ProdMemoryStore({
        checkPeriod: 86400000, // prune expired entries every 24h
      })
    : new MemoryStore();

export const sessionMiddleware = session({
  ...config.auth.session,
  store: STORE,
});

// Add to all routes -> throws 401 if req.isAuthenticated() is false
export function isAuth(req: any, res: any, next: any) {
  if (!config.server.isAuth) {
    return next();
  }
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  return next();
}
