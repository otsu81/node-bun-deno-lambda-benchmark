import { randomUUID } from "node:crypto"
import * as jose from "jose"
import { AUDIENCE, ISSUER, JwtPayloadSchema, KEY_ID, privateKey } from "../../common/jwt.ts"

export const handler = async (event: unknown): Promise<{ token: string }> => {
  const start = performance.now()
  const payload = JwtPayloadSchema.parse(event)
  const jwt = await new jose.SignJWT(payload)
    .setProtectedHeader({ alg: "ES256", kid: KEY_ID })
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setNotBefore("0s")
    .setExpirationTime("12h")
    .setJti(randomUUID())
    .sign(privateKey)
  const durationMs = performance.now() - start

  return { token: jwt, durationMs }
}
