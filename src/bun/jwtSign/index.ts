import { randomUUID } from "node:crypto";
import * as jose from "jose";
import { JwtPayloadSchema, privateKey, ISSUER, AUDIENCE, KEY_ID } from "../../common/jwt.ts";

Bun.serve({
  port: 8080,
  async fetch(req) {
    if (req.method === "GET") return new Response("OK");

    const payload = JwtPayloadSchema.parse(await req.json());

    const jwt = await new jose.SignJWT(payload)
      .setProtectedHeader({ alg: "ES256", kid: KEY_ID })
      .setIssuer(ISSUER)
      .setAudience(AUDIENCE)
      .setIssuedAt()
      .setNotBefore("0s")
      .setExpirationTime("12h")
      .setJti(randomUUID())
      .sign(privateKey);

    return new Response(JSON.stringify({ token: jwt }), {
      headers: { "Content-Type": "application/json" },
    });
  },
});
