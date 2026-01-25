import * as z from "zod";
import { createPrivateKey, randomUUID } from "crypto";
import * as jose from "jose";

const PRIVATE_KEY =
  "LS0tLS1CRUdJTiBFQyBQUklWQVRFIEtFWS0tLS0tCk1IY0NBUUVFSUw1WnhVMFJ4bTJZc3UySTVCMFFJU09mdkZnK2s4YjhJdTJmckplUm5GQnJvQW9HQ0NxR1NNNDkKQXdFSG9VUURRZ0FFT1pXU2dUaUZLbHI1WWpReVIxYnAxS2hYcHJ2Z09MN1AvblZyQlQrZ2liTHM0TWRVWnhCWgpQaWJhU20xanJ2MldYR3o1Q3hDcERGRkk3SlgxM0llRXhBPT0KLS0tLS1FTkQgRUMgUFJJVkFURSBLRVktLS0tLQo=";

const ISSUER = "urn:benchmark:auth";
const AUDIENCE = "urn:benchmark:api";
const KEY_ID = "benchmark-key-1";

const JwtPayloadSchema = z.object({
  sub: z.uuid(),
  email: z.email(),
  name: z.string(),
  orgId: z.uuid(),
  roles: z.array(z.enum(["admin", "poweruser", "user", "editor", "viewer"])),
});

const pk = createPrivateKey({
  key: Buffer.from(PRIVATE_KEY, "base64").toString(),
  format: "pem",
});

Bun.serve({
  port: 8080,
  async fetch(req) {
    if (req.method === "GET") return new Response("OK");

    const event = await req.json();
    const payload = JwtPayloadSchema.parse(event);

    const jwt = await new jose.SignJWT(payload)
      .setProtectedHeader({ alg: "ES256", kid: KEY_ID })
      .setIssuer(ISSUER)
      .setAudience(AUDIENCE)
      .setIssuedAt()
      .setNotBefore("0s")
      .setExpirationTime("12h")
      .setJti(randomUUID())
      .sign(pk);

    return new Response(JSON.stringify({ token: jwt }), {
      headers: { "Content-Type": "application/json" },
    });
  },
});
