import { InputSchema, transformPayload, type Payload } from "../../common/jsonProcess.ts";

Bun.serve({
  port: 8080,
  async fetch(req) {
    if (req.method === "GET") return new Response("OK");

    const { raw } = InputSchema.parse(await req.json());
    const parsed: Payload = JSON.parse(raw);
    const transformed = transformPayload(parsed);
    const output = JSON.stringify(transformed);

    return new Response(
      JSON.stringify({
        inputSize: raw.length,
        outputSize: output.length,
        productsProcessed: transformed.products.length,
        ordersProcessed: transformed.orders.length,
      }),
      { headers: { "Content-Type": "application/json" } },
    );
  },
});
