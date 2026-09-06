import { createHmac } from "node:crypto";

import { describe, expect, it } from "vitest";

import { verifyIdentityToken } from "./identity";

const secret = "test-secret";
const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");

function token(payload: Record<string, unknown>, signingSecret = secret) {
  const header = encode({ alg: "HS256", typ: "JWT" });
  const body = encode(payload);
  const signature = createHmac("sha256", signingSecret).update(`${header}.${body}`).digest("base64url");
  return `${header}.${body}.${signature}`;
}

describe("verifyIdentityToken", () => {
  it("accepts a valid Plane identity token", () => {
    expect(
      verifyIdentityToken(
        token({ sub: "user-1", name: "Ada", iss: "plane", aud: "copilotkit", exp: Math.floor(Date.now() / 1000) + 60 }),
        secret
      )
    ).toEqual({ id: "user-1", name: "Ada" });
  });

  it("rejects an expired or incorrectly signed token", () => {
    expect(() =>
      verifyIdentityToken(token({ sub: "user-1", name: "Ada", iss: "plane", aud: "copilotkit", exp: 1 }), secret)
    ).toThrow("expired");
    expect(() =>
      verifyIdentityToken(
        token(
          { sub: "user-1", name: "Ada", iss: "plane", aud: "copilotkit", exp: Math.floor(Date.now() / 1000) + 60 },
          "other"
        ),
        secret
      )
    ).toThrow("signature");
  });
});
