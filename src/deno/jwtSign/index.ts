import { randomUUID } from "node:crypto";
import * as jose from "jose";
import { JwtPayloadSchema, privateKey, ISSUER, AUDIENCE, KEY_ID } from "../../common/jwt.ts";

Deno.serve({
  port: 8080,
  handler: async (req) => {
    if (req.method === "GET") return new Response("OK");

    const body = await req.json();
    const start = performance.now();
    const payload = JwtPayloadSchema.parse(body);
    const jwt = await new jose.SignJWT(payload)
      .setProtectedHeader({ alg: "ES256", kid: KEY_ID })
      .setIssuer(ISSUER)
      .setAudience(AUDIENCE)
      .setIssuedAt()
      .setNotBefore("0s")
      .setExpirationTime("12h")
      .setJti(randomUUID())
      .sign(privateKey);
    const durationMs = performance.now() - start;

    return new Response(JSON.stringify({ token: jwt, durationMs }), {
      headers: { "Content-Type": "application/json" },
    });
  },
});
