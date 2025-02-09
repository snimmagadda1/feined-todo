import { beforeAll, expect, test, describe } from "bun:test";
import { agent } from "supertest";
import type { Express } from "express";
import { load } from "../loaders";
import { _RX_SERVER } from "../loaders/rxdb";
import type TestAgent from "supertest/lib/agent";

let app: Express;

beforeAll(async () => {
  // Initialize the full application using the loader
  await load();

  // Get the Express app from the RX server
  app = _RX_SERVER.serverApp;
});

const createAuthenticatedUser = async (): Promise<{
  agent: TestAgent;
  cookies: string[];
}> => {
  const authenticatedUser = agent(app);

  // Go directly to the callback URL since we're using a mock strategy
  const response = await authenticatedUser
    .get("/auth/github/callback")
    .expect(302); // Expect redirect

  // Follow the redirect
  const redirectUrl = response.headers.location;
  if (!redirectUrl) {
    throw new Error("No redirect URL provided");
  }

  // Verify we have a session cookie and log it
  const cookieHeader = response.headers["set-cookie"];
  const cookies = Array.isArray(cookieHeader) ? cookieHeader : [cookieHeader];
  if (!cookies || cookies.length === 0) {
    throw new Error("No session cookie set");
  }

  return { agent: authenticatedUser, cookies };
};

describe("User endpoints", () => {
  describe("POST /user", () => {
    test("should create a new user when authenticated", async () => {
      const mockUser = {
        email: "test@example.com",
        name: "Test User",
        githubId: "test-github-id",
      };

      // Get authenticated agent and cookies
      const { agent, cookies } = await createAuthenticatedUser();

      // Make the authenticated request with cookies
      const response = await agent
        .post("/user")
        .send(mockUser)
        .set("Cookie", cookies)
        .expect("Content-Type", /json/)
        .expect(200);

      expect(response.body).toMatchObject({
        email: mockUser.email,
        name: mockUser.name,
        githubId: mockUser.githubId,
      });
      expect(response.body.id).toBeDefined();
      expect(response.body._deleted).toBe(false);
    });

    // test("should return 401 when not authenticated", async () => {
    //   const mockUser = {
    //     email: "test@example.com",
    //     name: "Test User",
    //     githubId: "test-github-id",
    //   };

    //   await request(app).post("/user").send(mockUser).expect(401);
    // });

    // test("should return 400 for invalid user data", async () => {
    //   const invalidUser = {
    //     name: "Test User",
    //     githubId: "test-github-id",
    //     // missing required email field
    //   };

    //   await request(app)
    //     .post("/user")
    //     .send(invalidUser)
    //     .set("Authorization", "test-auth-token")
    //     .expect(400);
    // });
  });

  // describe("GET /user/:userId", () => {
  //   test("should return user when found and authenticated", async () => {
  //     // Create a test user first
  //     const testUser = await userService.createUser({
  //       email: "get-test@example.com",
  //       name: "Get Test User",
  //       githubId: "test-get-github-id",
  //     });

  //     const response = await request(app)
  //       .get(`/user/${testUser.id}`)
  //       .set("Authorization", "test-auth-token")
  //       .expect("Content-Type", /json/)
  //       .expect(200);

  //     expect(response.body).toMatchObject({
  //       id: testUser.id,
  //       email: testUser.email,
  //       name: testUser.name,
  //       githubId: testUser.githubId,
  //       _deleted: false,
  //     });
  //   });

  //   test("should return 404 when user not found", async () => {
  //     await request(app)
  //       .get("/user/nonexistent-id")
  //       .set("Authorization", "test-auth-token")
  //       .expect(404);
  //   });

  //   test("should return 401 when not authenticated", async () => {
  //     await request(app).get("/user/some-id").expect(401);
  //   });
  // });
});
