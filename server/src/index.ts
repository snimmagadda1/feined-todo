import logger from "./utils/logger";

async function startServer() {
  logger.info("Initializing server...");
  (await import("./loaders")).default();
}

startServer();
