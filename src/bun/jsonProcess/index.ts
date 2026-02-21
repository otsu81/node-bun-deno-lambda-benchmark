import { InputSchema, type Payload, transformPayload } from "../../common/jsonProcess.ts"

Bun.serve({
  port: 8080,
  async fetch(req) {
    if (req.method === "GET") return new Response("OK")

    const body = await req.json()
    const start = performance.now()
    const { raw } = InputSchema.parse(body)
    const parsed: Payload = JSON.parse(raw)
    const transformed = transformPayload(parsed)
    const output = JSON.stringify(transformed)
    const durationMs = performance.now() - start

    return new Response(
      JSON.stringify({
        inputSize: raw.length,
        outputSize: output.length,
        productsProcessed: transformed.products.length,
        ordersProcessed: transformed.orders.length,
        durationMs,
      }),
      { headers: { "Content-Type": "application/json" } },
    )
  },
})
