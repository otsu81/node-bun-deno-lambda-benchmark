import * as jose from "jose";
import { JwtInputSchema, publicKey, ISSUER, AUDIENCE } from "../../common/jwt.ts";

export const handler = async (
  event: unknown,
): Promise<{ payload: jose.JWTPayload; protectedHeader: jose.CompactJWTHeaderParameters }> => {
  const { token } = JwtInputSchema.parse(event);

  const { payload, protectedHeader } = await jose.jwtVerify(token, publicKey, {
    algorithms: ["ES256"],
    issuer: ISSUER,
    audience: AUDIENCE,
  });

  return { payload, protectedHeader };
};
