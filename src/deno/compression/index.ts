import { compress, InputSchema } from "../../common/compression.ts"

Deno.serve({
  port: 8080,
  handler: async (req) => {
    if (req.method === "GET") return new Response("OK")

    const body = await req.json()
    const start = performance.now()
    const { data } = InputSchema.parse(body)
    const result = compress(data)
    const durationMs = performance.now() - start

    return new Response(JSON.stringify({ ...result, durationMs }), {
      headers: { "Content-Type": "application/json" },
    })
  },
})
