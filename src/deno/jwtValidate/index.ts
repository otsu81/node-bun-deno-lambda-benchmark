import * as jose from "jose"
import { AUDIENCE, ISSUER, JwtInputSchema, publicKey } from "../../common/jwt.ts"

Deno.serve({
  port: 8080,
  handler: async (req) => {
    if (req.method === "GET") return new Response("OK")

    const body = await req.json()
    const start = performance.now()
    const { token } = JwtInputSchema.parse(body)
    const { payload, protectedHeader } = await jose.jwtVerify(token, publicKey, {
      algorithms: ["ES256"],
      issuer: ISSUER,
      audience: AUDIENCE,
    })
    const durationMs = performance.now() - start

    return new Response(JSON.stringify({ payload, protectedHeader, durationMs }), {
      headers: { "Content-Type": "application/json" },
    })
  },
})
