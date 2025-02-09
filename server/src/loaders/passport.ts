import type { Express } from "express";
import passport from "passport";
import type { RxEventsDatabase } from "../rxdb-server";
import { sessionMiddleware } from "../middleware/session";
import logger from "../utils/logger";

// FIXME: Has a dependency on rxdb for now...
export default async function (app: Express, db: RxEventsDatabase) {
  // Add the session middleware
  app.use(sessionMiddleware);

  passport.serializeUser((user: any, done) => {
    logger.info(`passport.js is serializing the user ${user}`);
    done(null, user.id);
  });
  passport.deserializeUser(async (id: string, done) => {
    logger.info(`passport.js is deserializing the user for id ${id}`);
    try {
      const user = await db.users
        .findOne({
          selector: { id },
        })
        .exec();

      if (!user) {
        return done(null, null);
      }

      done(null, user.toJSON());
    } catch (error) {
      logger.error("Error during deserialization:", error);
      done(error);
    }
  });

  app.use(passport.initialize());
  app.use(passport.session());
}
