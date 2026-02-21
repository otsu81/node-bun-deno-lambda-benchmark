import * as jose from "jose"
import { AUDIENCE, ISSUER, JwtInputSchema, publicKey } from "../../common/jwt.ts"

export const handler = async (
  event: unknown,
): Promise<{ payload: jose.JWTPayload; protectedHeader: jose.CompactJWTHeaderParameters }> => {
  const start = performance.now()
  const { token } = JwtInputSchema.parse(event)
  const { payload, protectedHeader } = await jose.jwtVerify(token, publicKey, {
    algorithms: ["ES256"],
    issuer: ISSUER,
    audience: AUDIENCE,
  })
  const durationMs = performance.now() - start

  return { payload, protectedHeader, durationMs }
}
