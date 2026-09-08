import axios from "axios";
import { server } from "../src/app";

// Grab the db variable
import db from "../src/db/db";

// Only run tests if we've specifically set NODE_ENV to testing
if (!process.env.NODE_ENV) {
  throw new Error("NODE_ENV not set");
}
if (process.env.NODE_ENV !== "testing") {
  throw new Error("NODE_ENV not set to testing");
}

// Set up axios
const url = "http://localhost:4000";
const request = axios.create({ baseURL: url });

beforeAll(async () => {
  // As the tests start rollback and migrate our tables
  await db.migrate.rollback();
  await db.migrate.latest();
});

afterAll(async () => {
  // After all the tests are done we're going to close our server
  // and rollback our database.
  await db.migrate.rollback();

  // This closes the app but it doesn't stop the tests in
  // Jest when done - that's why we have to --forceExit
  // when running Jest for now.
  return server.close();
});

// General

// Variables for testing that get populated from different calls
let accessToken;
let refreshToken;
let passwordResetToken;

describe("general actions", () => {
  it("returns homepage", async () => {
    expect.assertions(1);
    const response = await request.get("/");
    expect(response.status).toBe(200);
  });
});

// User

describe("user account actions", () => {
  it("signs up a user", async () => {
    expect.assertions(1);

    const response = await request.post("/api/v1/user/signup", {
      firstName: "TestFirstName",
      lastName: "TestLastName",
      username: "TestUsername",
      email: "TestEmail@example.com",
      password: "TestPassword",
    });
    expect(response.status).toBe(200);
  });

  it("authenticates a user", async () => {
    expect.assertions(3);

    const response = await request.post("/api/v1/user/authenticate", {
      username: "TestUsername",
      password: "TestPassword",
    });

    expect(response.status).toBe(200);
    expect(response.data.data.accessToken).toBeDefined();
    expect(response.data.data.refreshToken).toBeDefined();

    // Let's store the returned access and refresh tokens for the
    // upcoming tests. Also we'll set the Auth on the axios
    // instance for testing.
    accessToken = response.data.data.accessToken;
    refreshToken = response.data.data.refreshToken;
    axios.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
  });

  it("refresh user's accessToken", async () => {
    expect.assertions(3);

    const response = await request.post("/api/v1/user/refreshAccessToken", {
      username: "TestUsername",
      refreshToken,
    });
    expect(response.status).toBe(200);
    expect(response.data.data.accessToken).toBeDefined();
    expect(response.data.data.refreshToken).toBeDefined();
  });

  it("invalidate all the user's refreshTokens", async () => {
    expect.assertions(1);

    request.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
    const response = await request.post(
      "/api/v1/user/invalidateAllRefreshTokens",
      {
        username: "TestUsername",
      },
    );
    expect(response.status).toBe(200);
  });

  it("invalidate specific refreshToken", async () => {
    expect.assertions(1);

    request.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
    const response = await request.post("/api/v1/user/invalidateRefreshToken", {
      refreshToken,
    });
    expect(response.status).toBe(200);
  });

  it("forgot user's password", async () => {
    expect.assertions(2);

    const response = await request.post("/api/v1/user/forgot", {
      email: "TestEmail@example.com",
      url: "http://koa-vue-notes-api.com/user/reset",
      type: "web",
    });
    expect(response.status).toBe(200);
    expect(response.data.data.passwordResetToken).toBeDefined();

    // Store password reset token
    passwordResetToken = response.data.data.passwordResetToken;
  });

  it("checks password reset token", async () => {
    expect.assertions(1);

    const response = await request.post(
      "/api/v1/user/checkPasswordResetToken",
      {
        passwordResetToken,
        email: "TestEmail@example.com",
      },
    );
    expect(response.status).toBe(200);
  });

  it("reset user's password", async () => {
    expect.assertions(1);

    const response = await request.post("/api/v1/user/reset", {
      email: "TestEmail@example.com",
      passwordResetToken,
      password: "TestPassword",
    });
    expect(response.status).toBe(200);
  });

  it("return data from a authenticated route", async () => {
    expect.assertions(1);

    request.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
    const response = await request.post("/api/v1/user/private", {});
    expect(response.status).toBe(200);
  });
});

// Notes

describe("note actions", () => {
  it("creates a note", async () => {
    expect.assertions(1);

    request.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
    const response = await request.post("/api/v1/notes", {
      title: "Here is my first note",
      content: "Here is my main content.",
    });
    expect(response.status).toBe(200);
  });

  it("shows a note", async () => {
    expect.assertions(4);

    request.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
    const response = await request.get("/api/v1/notes/1");
    expect(response.status).toBe(200);
    expect(response.data.data.note.id).toBe(1);
    expect(response.data.data.note.title).toBe("Here is my first note");
    expect(response.data.data.note.content).toBe("Here is my main content.");
  });

  it("gets a bunch of a user's notes", async () => {
    expect.assertions(4);

    request.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
    const response = await request.get("/api/v1/notes/", {
      params: { sort: "", order: "desc", page: 0, limit: 20 },
    });
    expect(response.status).toBe(200);
    expect(response.data.data.notes[0].id).toBe(1);
    expect(response.data.data.notes[0].title).toBe("Here is my first note");
    expect(response.data.data.notes[0].content).toBe(
      "Here is my main content.",
    );
  });

  it("updates a note", async () => {
    expect.assertions(1);

    request.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
    const response = await request.put("/api/v1/notes/1", {
      title: "Here is my first note",
      content: "Here is my main content.",
    });
    expect(response.status).toBe(200);
  });

  it("deletes a note", async () => {
    expect.assertions(1);

    request.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
    const response = await request.delete("/api/v1/notes/1");
    expect(response.status).toBe(200);
  });
});

// Wire contract
//
// These drive the same running server as the suites above, but keep the raw
// response so status, headers and the exact body bytes can be asserted. The
// framework layer is the only thing under test here: routing, the error
// envelope, the body parser, CORS and the response-time header are each
// pinned so a plausible-but-wrong wiring fails instead of passing silently.
const raw = axios.create({
  baseURL: url,
  validateStatus: () => true,
  transformResponse: [(data) => data],
});

const bodyOf = (response) => JSON.parse(response.data);
const keysOf = (response) => Object.keys(bodyOf(response));

describe("routing", () => {
  it("matches the notes index with and without a trailing slash", async () => {
    expect.assertions(3);

    const params = { sort: "", order: "desc", page: 0, limit: 20 };
    const headers = { Authorization: `Bearer ${accessToken}` };
    const withSlash = await raw.get("/api/v1/notes/", { params, headers });
    const without = await raw.get("/api/v1/notes", { params, headers });

    expect(withSlash.status).toBe(200);
    expect(without.status).toBe(200);
    expect(withSlash.data).toBe(without.data);
  });

  it("answers an unknown route with the not-found envelope", async () => {
    expect.assertions(4);

    const response = await raw.get("/nope");
    expect(response.status).toBe(404);
    expect(keysOf(response)).toEqual(["message", "name", "stack", "status"]);
    expect(bodyOf(response).message).toBe("Not Found");
    expect(bodyOf(response).name).toBe("NotFoundError");
  });

  it("answers a known path with a wrong method with 405 and Allow", async () => {
    expect.assertions(4);

    const response = await raw.post("/", {});
    expect(response.status).toBe(405);
    expect(response.headers.allow).toBe("HEAD, GET");
    expect(response.headers["content-type"]).toBe("text/plain; charset=utf-8");
    expect(response.data).toBe("Method Not Allowed");
  });

  it("lists every method a path accepts in Allow", async () => {
    expect.assertions(2);

    const response = await raw.put("/api/v1/notes", {});
    expect(response.status).toBe(405);
    expect(response.headers.allow).toBe("HEAD, GET, POST");
  });
});

describe("error envelope", () => {
  it("renders a thrown Error as a 500 envelope", async () => {
    expect.assertions(4);

    const response = await raw.get("/api/v1/panic");
    expect(response.status).toBe(500);
    expect(keysOf(response)).toEqual(["name", "message", "stack", "status"]);
    expect(bodyOf(response).name).toBe("Error");
    expect(bodyOf(response).message).toBe("panic");
  });

  it("keeps the extra error property of an unauthenticated request", async () => {
    expect.assertions(3);

    const response = await raw.get("/api/v1/notes");
    expect(response.status).toBe(401);
    expect(keysOf(response)).toEqual([
      "message",
      "error",
      "name",
      "stack",
      "status",
    ]);
    expect(bodyOf(response).error).toEqual({
      code: 401,
      message: "AUTHENTICATION_ERROR",
    });
  });

  it("renders a bare validation message without an error property", async () => {
    expect.assertions(3);

    const response = await raw.post(
      "/api/v1/notes",
      { title: "No content here" },
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    expect(response.status).toBe(400);
    expect(bodyOf(response).message).toBe('"content" is required');
    expect(bodyOf(response).error).toBeUndefined();
  });

  it("serialises the envelope without indentation", async () => {
    expect.assertions(1);

    const response = await raw.get("/api/v1/panic");
    expect(response.data).not.toMatch(/\n {2}"/);
  });
});

describe("body parsing", () => {
  it("reports unparseable json with the parse-failure envelope", async () => {
    expect.assertions(4);

    const response = await raw.post("/api/v1/user/signup", "{oops", {
      headers: { "Content-Type": "application/json" },
    });
    expect(response.status).toBe(400);
    expect(keysOf(response)).toEqual([
      "status",
      "body",
      "name",
      "message",
      "stack",
    ]);
    expect(bodyOf(response).name).toBe("SyntaxError");
    expect(bodyOf(response).body).toBe("{oops");
  });

  it("leaves the body empty rather than absent for a non-json request", async () => {
    expect.assertions(2);

    const response = await raw.post(
      "/api/v1/user/signup",
      "firstName=Test&lastName=Test",
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } },
    );
    expect(response.status).toBe(400);
    expect(bodyOf(response).error.message).toBe('"firstName" is required');
  });
});

describe("response headers", () => {
  it("times successful, not-found and wrong-method responses", async () => {
    expect.assertions(3);

    expect((await raw.get("/")).headers["x-response-time"]).toBeDefined();
    expect((await raw.get("/nope")).headers["x-response-time"]).toBeDefined();
    expect((await raw.post("/", {})).headers["x-response-time"]).toBeDefined();
  });

  it("does not time a response the error handler rendered", async () => {
    expect.assertions(2);

    expect((await raw.get("/api/v1/panic")).headers["x-response-time"]).toBe(
      undefined,
    );
    expect((await raw.get("/api/v1/notes")).headers["x-response-time"]).toBe(
      undefined,
    );
  });

  it("varies on Origin whether or not one was sent", async () => {
    expect.assertions(2);

    expect((await raw.get("/")).headers.vary).toBe("Origin");
    expect(
      (await raw.get("/", { headers: { Origin: "http://example.com" } }))
        .headers.vary,
    ).toBe("Origin");
  });

  it("allows an origin only when the request declared one", async () => {
    expect.assertions(2);

    expect(
      (await raw.get("/")).headers["access-control-allow-origin"],
    ).toBeUndefined();
    expect(
      (await raw.get("/", { headers: { Origin: "http://example.com" } }))
        .headers["access-control-allow-origin"],
    ).toBe("*");
  });

  it("answers a preflight with an empty 204", async () => {
    expect.assertions(4);

    const response = await raw.request({
      method: "options",
      url: "/api/v1/health",
      headers: {
        Origin: "http://example.com",
        "Access-Control-Request-Method": "GET",
      },
    });
    expect(response.status).toBe(204);
    expect(response.headers["access-control-allow-methods"]).toBe(
      "GET,HEAD,PUT,POST,DELETE,PATCH",
    );
    expect(response.headers["content-type"]).toBeUndefined();
    expect(response.data).toBe("");
  });

  it("does not announce the framework or tag the entity", async () => {
    expect.assertions(2);

    const response = await raw.get("/");
    expect(response.headers["x-powered-by"]).toBeUndefined();
    expect(response.headers.etag).toBeUndefined();
  });
});

describe("preserved defects", () => {
  it("answers a missing credential with 404 carrying a 400 code", async () => {
    expect.assertions(2);

    const response = await raw.post("/api/v1/user/authenticate", {});
    expect(response.status).toBe(404);
    expect(bodyOf(response).error).toEqual({
      code: 400,
      message: "INVALID_DATA",
    });
  });

  it("returns the password reset token to the caller", async () => {
    expect.assertions(2);

    const response = await raw.post("/api/v1/user/forgot", {
      email: "TestEmail@example.com",
      url: "http://koa-vue-notes-api.com/user/reset",
      type: "web",
    });
    expect(response.status).toBe(200);
    expect(bodyOf(response).data.passwordResetToken).toBeDefined();
  });

  it("dereferences a missing reset row and returns 500", async () => {
    expect.assertions(2);

    const response = await raw.post("/api/v1/user/checkPasswordResetToken", {
      email: "TestEmail@example.com",
      passwordResetToken: "nosuchtoken",
    });
    expect(response.status).toBe(500);
    expect(bodyOf(response).name).toBe("TypeError");
  });

  it("reports a missing note as a successful empty note", async () => {
    expect.assertions(2);

    const response = await raw.get("/api/v1/notes/999999", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    expect(response.status).toBe(200);
    expect(bodyOf(response).data.note).toEqual({});
  });

  it("rejects an unpaginated index with a bare message", async () => {
    expect.assertions(3);

    const response = await raw.get("/api/v1/notes", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    expect(response.status).toBe(400);
    expect(bodyOf(response).message).toBe("INVALID_ROUTE_OPTIONS");
    expect(bodyOf(response).error).toBeUndefined();
  });
});

describe("user agent", () => {
  it("records the parsed user agent against a refresh token", async () => {
    expect.assertions(3);

    const response = await raw.post(
      "/api/v1/user/authenticate",
      { username: "TestUsername", password: "TestPassword" },
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.116 Safari/537.36",
        },
      },
    );
    expect(response.status).toBe(200);

    const [row] = await db("refresh_tokens")
      .select("info")
      .where({ refreshToken: bodyOf(response).data.refreshToken });
    expect(row.info).toContain("Chrome");
    expect(row.info).toContain("OS X");
  });
});
