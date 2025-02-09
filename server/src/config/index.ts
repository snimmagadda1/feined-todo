import { z } from "zod";
import logger from "../utils/logger";

logger.info("Validating environment...");

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]),
  SESSION_SECRET: z.string(),
  GITHUB_CLIENT_ID: z.string(),
  GITHUB_CLIENT_SECRET: z.string(),
  GITHUB_CALLBACK_URL: z.string(),
  FRONTEND_URL: z.string(),
});

export const validate = () => {
  const parsed = envSchema.safeParse({
    NODE_ENV: process.env.NODE_ENV,
    SESSION_SECRET: process.env.SESSION_SECRET,
    GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID,
    GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET,
    GITHUB_CALLBACK_URL: process.env.GITHUB_CALLBACK_URL,
    FRONTEND_URL: process.env.FRONTEND_URL,
  });

  if (!parsed.success) {
    throw new Error(parsed.error.message);
    process.exit(1);
  }

  return parsed.data;
};

export const env = validate();

export const config = {
  server: {
    port: 8080,
    nodeEnv: env.NODE_ENV,
    isAuth: env.NODE_ENV !== "development",
    cors: {
      origin: env.FRONTEND_URL,
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "Cookie"],
      exposedHeaders: ["Set-Cookie"],
    },
  },
  auth: {
    session: {
      secret: env.SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      cookie: {
        domain: env.NODE_ENV === "production" ? ".s11a.com" : "localhost",
        secure: env.NODE_ENV === "production",
        sameSite: (env.NODE_ENV === "production" ? "strict" : "lax") as
          | "strict"
          | "lax",
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
      },
    },
    github: {
      clientID: env.GITHUB_CLIENT_ID,
      clientSecret: env.GITHUB_CLIENT_SECRET,
      callbackURL: env.GITHUB_CALLBACK_URL,
    },
  },
  db: {
    interval: 1000 * 60 * 60 * 24, // 24 hours
  },
};
