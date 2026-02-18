import * as z from "zod";
import { createPublicKey } from "node:crypto";
import * as jose from "jose";

const PUBLIC_KEY =
  "LS0tLS1CRUdJTiBQVUJMSUMgS0VZLS0tLS0KTUZrd0V3WUhLb1pJemowQ0FRWUlLb1pJemowREFRY0RRZ0FFT1pXU2dUaUZLbHI1WWpReVIxYnAxS2hYcHJ2ZwpPTDdQL25WckJUK2dpYkxzNE1kVVp4QlpQaWJhU20xanJ2MldYR3o1Q3hDcERGRkk3SlgxM0llRXhBPT0KLS0tLS1FTkQgUFVCTElDIEtFWS0tLS0tCg==";

const ISSUER = "urn:benchmark:auth";
const AUDIENCE = "urn:benchmark:api";

const JwtInputSchema = z.object({
  token: z.string(),
});

const pk = createPublicKey({
  key: Buffer.from(PUBLIC_KEY, "base64").toString(),
  format: "pem",
});

export const handler = async (
  event: unknown,
): Promise<{ payload: jose.JWTPayload; protectedHeader: jose.CompactJWTHeaderParameters }> => {
  const { token } = JwtInputSchema.parse(event);

  const { payload, protectedHeader } = await jose.jwtVerify(token, pk, {
    algorithms: ["ES256"],
    issuer: ISSUER,
    audience: AUDIENCE,
  });

  return { payload, protectedHeader };
};
