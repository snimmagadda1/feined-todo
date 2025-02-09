import { Router } from "express";
import passport from "passport";
import logger from "../utils/logger";

const router = Router();

router.get(
  "/github",
  (req, res, next) => {
    logger.info("Attempting to auth using github...");
    next();
  },
  passport.authenticate("github", { scope: ["user:email"] })
);

router.get(
  "/github/callback",
  passport.authenticate("github", {
    failureRedirect:
      `${Bun.env.FRONTEND_URL}/error` || "http://localhost:4200/error",
    successRedirect:
      `${Bun.env.FRONTEND_URL}/home` || "http://localhost:4200/home",
  })
);

router.get("/isLoggedIn", (req, res) => {
  if (req.isAuthenticated()) {
    logger.info("User is authenticated");
    res.json({
      authenticated: true,
      user: { ...req.user, email: undefined },
    });
  } else {
    logger.info("\n User is not authenticated");
    res.json({ authenticated: false });
  }
});

router.post("/logout", (req, res, next) => {
  // First clear the login session
  logger.info(`Logging out sessionID: ${req.sessionID}`);
  req.logout((err) => {
    if (err) {
      logger.error("Logout error:", err);
      return next(err);
    }

    // Then destroy the session to prevent auto-regeneration
    req.session.destroy((err) => {
      if (err) {
        logger.error("Session destruction error:", err);
        return next(err);
      }

      res.clearCookie("connect.sid", {
        path: "/",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      });

      res.status(200).json({ success: true });
    });
  });
});

export default router;
