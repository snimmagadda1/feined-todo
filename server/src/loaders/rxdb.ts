// Node.js built-in modules
import { type IncomingHttpHeaders } from "http";

// External dependencies (third-party packages)
import { formatISO, startOfDay } from "date-fns";
import type { Express } from "express";
import type { Store } from "express-session";
import {
  addRxPlugin,
  createRxDatabase,
  removeRxDatabase,
  type RxCollectionCreator,
  type RxDatabase,
} from "rxdb";
import { getRxStorageMemory } from "rxdb/plugins/storage-memory";
import { wrappedValidateAjvStorage } from "rxdb/plugins/validate-ajv";
import {
  createRxServer,
  type RxServerAuthData,
} from "snn-rxdb-server/plugins/server";
import { RxServerAdapterExpress } from "snn-rxdb-server/plugins/adapter-express";

// Internal modules (your application code)
import { STORE } from "../middleware/session";
import {
  EVENTS_SCHEMA,
  USER_SCHEMA,
  type RxEventsCollections,
  type RxEventsDatabase,
  type RxEventDocumentType,
  type RxUserDocumentType,
} from "../models";
import { getCookies, getSessionId, getUserId } from "../utils/session";
import logger from "../utils/logger";

const collectionSettings = {
  ["events"]: {
    schema: EVENTS_SCHEMA,
  } as RxCollectionCreator<any>,
  ["users"]: {
    schema: USER_SCHEMA,
  } as RxCollectionCreator<any>,
} as const;

export let DB: RxEventsDatabase | null = null;

// exported to expose express instance
export let _RX_SERVER: any = null;

type GithubAuthData = {
  id: string | null;
};

async function createDb(): Promise<Express> {
  if (process.env.NODE_ENV !== "production") {
    await import("rxdb/plugins/dev-mode").then((module) =>
      addRxPlugin(module.RxDBDevModePlugin)
    );
  }
  const bareStorage = getRxStorageMemory();
  // wrap the validation around the main RxStorage
  const wrappedStorage = wrappedValidateAjvStorage({
    storage: bareStorage,
  });
  const storage =
    process.env.NODE_ENV === "production" ? bareStorage : wrappedStorage;

  await removeRxDatabase("feineddb", storage);

  const db = await createRxDatabase<RxEventsCollections>({
    name: "feineddb",
    storage: storage,
  });

  DB = db;
  logger.info("DatabaseService: created database");

  await db.addCollections(collectionSettings);

  logger.info("DatabaseService: create collections");

  const testUser = {
    id: "test-user",
    email: "new-test@funtimes.com",
    name: "Test User",
    githubId: "test-githubId-id",
  } as RxUserDocumentType;

  await db.users.bulkInsert([testUser]);
  logger.info("DatabaseService: bulk insert users");

  const testEvent = {
    id: "test-event",
    title: "Test Event",
    description: "Test Event Description",
    date: formatISO(startOfDay(new Date())),
    location: "Test Event Location",
    userId: testUser.id,
    completed: false,
    _deleted: false,
  } as RxEventDocumentType;

  await db.events.bulkInsert([testEvent]);
  logger.info("DatabaseService: bulk insert events");

  const rxServer = await setupServer(db, STORE);
  _RX_SERVER = rxServer;
  // Access the underlying Express app
  const app = rxServer.serverApp as Express;
  return app;
}

async function setupServer(db: RxEventsDatabase, store: Store) {
  const hostname =
    process.env.NODE_ENV === "production" ? "0.0.0.0" : "localhost";
  logger.info("Initializing rx-server with hostname: ", hostname);
  const rxServer = await createRxServer({
    database: db as unknown as RxDatabase,
    port: 8080,
    hostname: hostname,
    adapter: RxServerAdapterExpress,
    cors: process.env.FRONTEND_URL || "http://localhost:4200",
    authHandler: async (
      headers: IncomingHttpHeaders
    ): Promise<RxServerAuthData<GithubAuthData>> => {
      let id = null;
      try {
        const cookies = getCookies(headers);
        let sessionId = getSessionId(cookies);

        // Fetch userId from store
        id = await getUserId(sessionId || "", store);
        if (!id) {
          throw new Error("No user found in session");
        }
      } catch (error) {
        // Explicitly log b/c rx-server doesn't seem to...
        logger.error("Error in rxDb authHandler", error);
        throw error;
      }
      logger.info("AuthHandler - returning userId", id);
      return {
        data: {
          id,
        },
        validUntil: Date.now() + 1000 * 60 * 60 * 24, // 1 day // TODO:align with session
      };
    },
  });

  // events endpoint
  const events = await rxServer.addRestEndpoint({
    name: "events",
    collection: db.events,
    cors: process.env.FRONTEND_URL || "http://localhost:4200",
    queryModifier: eventQueryModifier, // authz
  });
  logger.info("RxServer: endpoint created ", events.urlPath);

  // users endpoint (test only)
  // const users = await rxServer.addRestEndpoint({
  //   name: "users",
  //   collection: db.users,
  //   cors: process.env.FRONTEND_URL || "http://localhost:4200",
  //   queryModifier: userQueryModifier, // authz
  // });
  // logger.info("RxServer: endpoint created ", users.urlPath);

  // replication endpoint
  const replicationEndpoint = await rxServer.addReplicationEndpoint({
    name: "events-rpl",
    collection: db.events,
    cors: process.env.FRONTEND_URL || "http://localhost:4200",
    queryModifier: eventQueryModifier, // authz
  });
  logger.info("RxServer: rpl endpoint created ", replicationEndpoint.urlPath);

  return rxServer;
}

// function userQueryModifier(
//   authData: RxServerAuthData<GithubAuthData>,
//   query: any
// ) {
//   if (!authData?.data?.id) {
//     // If no valid session, return no results
//     query.selector = {
//       id: {
//         $eq: "no-access", // Will match nothing
//       },
//     };
//     return query;
//   }
//   query.selector.id = {
//     $eq: (authData.data as GithubAuthData).id,
//   };
//   return query;
// }

function eventQueryModifier(
  authData: RxServerAuthData<GithubAuthData>,
  query: any
) {
  if (!authData?.data?.id) {
    // If no valid session, return no results
    query.selector = {
      userId: {
        $eq: "no-access", // Will match nothing
      },
    };
    return query;
  }
  query.selector.userId = {
    $eq: (authData.data as GithubAuthData).id,
  };
  return query;
}

export default async function (): Promise<Express> {
  return await createDb();
}
