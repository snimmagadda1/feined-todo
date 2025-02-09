import { nanoid } from "nanoid";
import passport from "passport";
import { Strategy as GitHubStrategy } from "passport-github2";
import { type Profile as GitHubProfile } from "passport-github2";
import { type VerifyCallback } from "passport-oauth2";
import { type RxEventsDatabase } from "../models";
import logger from "../utils/logger";
import { config } from "../config";
import MockGHStrategy from "../utils/mock-gh-strategy";

// FIXME: Has a dependency on rxdb for now...
export default async function (db: RxEventsDatabase) {
  passport.use(environmentStrategy(db));
}

const strategyCallback =
  (db: RxEventsDatabase) =>
  async (
    accessToken: string,
    refreshToken: string,
    profile: GitHubProfile,
    done: VerifyCallback
  ) => {
    try {
      logger.info(`Successfully authenticated for profileId: ${profile.id}`);
      // Check if user exists
      const existingUser = await db.users
        .findOne({
          selector: {
            githubId: profile.id,
          },
        })
        .exec();

      if (existingUser) {
        logger.info("User already exists");
        return done(null, existingUser.toJSON());
      }
      logger.info("User does not exist, creating...");

      // Create new user
      const newUser = await db.users.insert({
        id: nanoid(10),
        email: profile.emails?.[0]?.value || "", // TODO: check if this is correct
        name: profile.displayName || profile.username,
        githubId: profile.id,
      });

      logger.info(`New user created: ${newUser.githubId}`);

      return done(null, newUser.toJSON());
    } catch (error) {
      logger.error("Error during authentication", error);
      return done(error as Error);
    }
  };

const environmentStrategy = (db: RxEventsDatabase): passport.Strategy => {
  switch (process.env.NODE_ENV) {
    case "test":
      return new MockGHStrategy("github", strategyCallback(db));
    default:
      return new GitHubStrategy(config.auth.github, strategyCallback(db));
  }
};
