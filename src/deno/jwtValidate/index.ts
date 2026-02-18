import * as jose from "jose";
import { JwtInputSchema, publicKey, ISSUER, AUDIENCE } from "../../common/jwt.ts";

Deno.serve({
  port: 8080,
  handler: async (req) => {
    if (req.method === "GET") return new Response("OK");

    const { token } = JwtInputSchema.parse(await req.json());

    const { payload, protectedHeader } = await jose.jwtVerify(token, publicKey, {
      algorithms: ["ES256"],
      issuer: ISSUER,
      audience: AUDIENCE,
    });

    return new Response(JSON.stringify({ payload, protectedHeader }), {
      headers: { "Content-Type": "application/json" },
    });
  },
});
