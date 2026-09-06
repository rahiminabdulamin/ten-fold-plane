import { createHmac, timingSafeEqual } from "node:crypto";

type Identity = { id: string; name: string };

function decodeJson(value: string): unknown {
  try {
    return JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
  } catch {
    throw new Error("Invalid identity token");
  }
}

export function verifyIdentityToken(token: string, secret: string): Identity {
  const [encodedHeader, encodedPayload, signature, ...extra] = token.split(".");
  if (!encodedHeader || !encodedPayload || !signature || extra.length) throw new Error("Invalid identity token");
  const header = decodeJson(encodedHeader);
  const payload = decodeJson(encodedPayload);
  if (!header || typeof header !== "object" || (header as { alg?: unknown }).alg !== "HS256") {
    throw new Error("Invalid identity token algorithm");
  }
  const expectedSignature = createHmac("sha256", secret).update(`${encodedHeader}.${encodedPayload}`).digest();
  const suppliedSignature = Buffer.from(signature, "base64url");
  if (suppliedSignature.length !== expectedSignature.length || !timingSafeEqual(suppliedSignature, expectedSignature)) {
    throw new Error("Invalid identity token signature");
  }
  const claims = payload as Record<string, unknown>;
  if (claims.iss !== "plane" || claims.aud !== "copilotkit" || typeof claims.sub !== "string" || !claims.sub) {
    throw new Error("Invalid identity token claims");
  }
  if (typeof claims.exp !== "number" || claims.exp <= Math.floor(Date.now() / 1000))
    throw new Error("Identity token expired");
  return { id: claims.sub, name: typeof claims.name === "string" && claims.name ? claims.name : "Plane user" };
}
