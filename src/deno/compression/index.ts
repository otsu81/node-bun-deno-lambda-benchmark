import * as z from "zod";
import { gzipSync, gunzipSync } from "node:zlib";
import { Buffer } from "node:buffer";

const InputSchema = z.object({
  data: z.string(), // base64 encoded
});

Deno.serve(
  {
    port: 8080,
    handler: async (req) => {
      if (req.method === "GET") return new Response("OK");

      const { data } = InputSchema.parse(await req.json());

      const input = Buffer.from(data, "base64");
      const compressed = gzipSync(input);
      const decompressed = gunzipSync(compressed);

      // Verify integrity
      if (decompressed.length !== input.length) {
        throw new Error("Decompression mismatch");
      }

      return new Response(
        JSON.stringify({
          originalSize: input.length,
          compressedSize: compressed.length,
          decompressedSize: decompressed.length,
          ratio: (compressed.length / input.length).toFixed(3),
        }),
        { headers: { "Content-Type": "application/json" } },
      );
    },
  },
);
