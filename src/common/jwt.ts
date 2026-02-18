import * as z from "zod";
import { createPrivateKey, createPublicKey } from "node:crypto";
import { Buffer } from "node:buffer";

const PRIVATE_KEY_B64 =
  "LS0tLS1CRUdJTiBFQyBQUklWQVRFIEtFWS0tLS0tCk1IY0NBUUVFSUw1WnhVMFJ4bTJZc3UySTVCMFFJU09mdkZnK2s4YjhJdTJmckplUm5GQnJvQW9HQ0NxR1NNNDkKQXdFSG9VUURRZ0FFT1pXU2dUaUZLbHI1WWpReVIxYnAxS2hYcHJ2Z09MN1AvblZyQlQrZ2liTHM0TWRVWnhCWgpQaWJhU20xanJ2MldYR3o1Q3hDcERGRkk3SlgxM0llRXhBPT0KLS0tLS1FTkQgRUMgUFJJVkFURSBLRVktLS0tLQo=";

const PUBLIC_KEY_B64 =
  "LS0tLS1CRUdJTiBQVUJMSUMgS0VZLS0tLS0KTUZrd0V3WUhLb1pJemowQ0FRWUlLb1pJemowREFRY0RRZ0FFT1pXU2dUaUZLbHI1WWpReVIxYnAxS2hYcHJ2ZwpPTDdQL25WckJUK2dpYkxzNE1kVVp4QlpQaWJhU20xanJ2MldYR3o1Q3hDcERGRkk3SlgxM0llRXhBPT0KLS0tLS1FTkQgUFVCTElDIEtFWS0tLS0tCg==";

export const ISSUER = "urn:benchmark:auth";
export const AUDIENCE = "urn:benchmark:api";
export const KEY_ID = "benchmark-key-1";

export const privateKey = createPrivateKey({
  key: Buffer.from(PRIVATE_KEY_B64, "base64").toString(),
  format: "pem",
});

export const publicKey = createPublicKey({
  key: Buffer.from(PUBLIC_KEY_B64, "base64").toString(),
  format: "pem",
});

export const JwtPayloadSchema = z.object({
  sub: z.uuid(),
  email: z.email(),
  name: z.string(),
  orgId: z.uuid(),
  roles: z.array(z.enum(["admin", "poweruser", "user", "editor", "viewer"])),
});

export const JwtInputSchema = z.object({
  token: z.string(),
});
